import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateThought } from '@/lib/input-validation';
import { checkCrisisKeywords, generateCrisisResponse, SEVERITY_LEVELS } from '@/lib/crisis-detection';
import { callAI, getConfiguredProvider, type AIMessage } from '@/lib/ai-service';

// ============================================================================
// TWO-PHASE AI ARCHITECTURE
// Phase 1: Hidden analysis (structured JSON, no empathy)
// Phase 2: Response generation (uses analysis as anchor)
// This prevents the AI from falling back to generic therapist voice
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionContext {
  previousTopics?: string[];
  previousDistortions?: string[];
  sessionCount?: number;
  previousQuestions?: string[];
}

interface AnalysisResult {
  trigger_event: string;
  likely_interpretation: string;
  underlying_fear: string;
  emotional_need: string;
  response_strategy: string;
}

// Phase 1 Prompt: Pure analysis, no empathy, just classification
function buildAnalysisPrompt(): string {
  return `Analyze the user's message. Return ONLY valid JSON. No prose. No empathy.

Output this exact structure:
{
  "trigger_event": "What specific thing happened? Be precise.",
  "likely_interpretation": "What meaning did they assign to this event?",
  "underlying_fear": "What are they afraid this means about them or their future?",
  "emotional_need": "What do they actually need right now? (understanding, validation, clarity, action, etc)",
  "response_strategy": "What approach would help them see this differently?"
}

Be specific. Name things precisely. No generic statements.`;
}

// Phase 2 Prompt: Generate response using the analysis
function buildResponsePrompt(analysis: AnalysisResult): string {
  return `You are writing to a friend. You already analyzed their situation. Now respond naturally.

ANALYSIS (already done, use this):
- What happened: ${analysis.trigger_event}
- Their interpretation: ${analysis.likely_interpretation}
- Their fear: ${analysis.underlying_fear}
- What they need: ${analysis.emotional_need}
- How to help: ${analysis.response_strategy}

Write a 4-6 sentence response. Rules:
- Echo 1-3 exact words from what they said
- Help them see the interpretation they made (without saying "interpretation")
- Name the fear underneath (gently)
- Ask ONE precise question that goes deeper
- No motivational language. No therapy explanations. No "I hear you" or "that must be hard"

Return JSON:
{
  "acknowledgment": "1-2 sentences echoing their exact words, being real",
  "thoughtPattern": "Name the thinking pattern simply, or null",
  "patternNote": "Brief note about it, or null",
  "reframe": "A different angle (start with 'Maybe...' or 'What if...' or 'It's possible...')",
  "question": "One precise question that goes deeper",
  "encouragement": "1 short sentence, or null"
}

Be direct. Sound like a friend who actually gets it, not a counselor.`;
}

// Helper to parse JSON from AI response
function parseAIJSON(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      try {
        const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // Rate limiting
    const clientId = userId || getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, 'reframe');

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.', retryAfter: rateLimit.retryAfter },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          }
        }
      );
    }

    const body = await request.json();
    const { 
      userMessage, 
      conversationHistory = [],
      sessionContext 
    } = body as {
      userMessage: string;
      conversationHistory?: ChatMessage[];
      sessionContext?: SessionContext;
    };

    // Input validation
    const validation = validateThought(userMessage);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const sanitizedMessage = validation.sanitized;

    // Crisis detection
    const crisisCheck = checkCrisisKeywords(sanitizedMessage);
    if (crisisCheck.level === SEVERITY_LEVELS.HIGH) {
      console.log('⚠️ Crisis detected - returning resources immediately');
      return NextResponse.json({
        acknowledgment: "I hear you, and what you're sharing is really important.",
        distortionType: "Crisis Response",
        distortionExplanation: "You're going through something that deserves more support than I can provide.",
        reframe: "Right now, the most important thing is connecting with someone who can truly help.",
        probingQuestion: "Would you like to talk about what's bringing these feelings up?",
        encouragement: generateCrisisResponse(SEVERITY_LEVELS.HIGH),
        icebergLayer: 'surface',
        layerInsight: 'Your safety matters most right now.',
        _isCrisisResponse: true,
      });
    }

    console.log('=== Optimism Engine API (Two-Phase) ===');
    console.log('User message:', sanitizedMessage?.slice(0, 100));
    
    const turnCount = Math.floor(conversationHistory.length / 2) + 1;
    console.log(`Turn ${turnCount}`);

    const configuredProvider = getConfiguredProvider();
    console.log(`Using AI provider: ${configuredProvider}`);

    // ========================================================================
    // PHASE 1: HIDDEN ANALYSIS
    // Force the AI to think before it speaks
    // ========================================================================
    
    console.log('📊 Phase 1: Running hidden analysis...');
    
    const analysisMessages: AIMessage[] = [
      { role: 'system', content: buildAnalysisPrompt() }
    ];
    
    // Add conversation context for analysis
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6);
      recentHistory.forEach(msg => {
        analysisMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content || ''
        });
      });
    }
    
    analysisMessages.push({ role: 'user', content: sanitizedMessage });
    
    let analysisResponse = await callAI(analysisMessages);
    
    if (!analysisResponse?.content) {
      console.log('First analysis call failed, retrying...');
      analysisResponse = await callAI(analysisMessages);
    }
    
    if (!analysisResponse?.content) {
      console.error('Analysis phase failed');
      return NextResponse.json({ 
        error: 'AI service is not responding. Please try again.' 
      }, { status: 502 });
    }
    
    // Parse the analysis
    let analysis = parseAIJSON(analysisResponse.content) as AnalysisResult | null;
    
    if (!analysis) {
      console.log('Failed to parse analysis, using fallback');
      analysis = {
        trigger_event: "Something happened that triggered a reaction",
        likely_interpretation: "This situation has meaning to them",
        underlying_fear: "There's a fear underneath",
        emotional_need: "Understanding",
        response_strategy: "Help them see the situation from a new angle"
      };
    }
    
    console.log('📊 Analysis complete:');
    console.log('   Trigger:', analysis.trigger_event?.slice(0, 50));
    console.log('   Fear:', analysis.underlying_fear?.slice(0, 50));
    
    // ========================================================================
    // PHASE 2: RESPONSE GENERATION
    // Now the AI has something to anchor to - no more improvising
    // ========================================================================
    
    console.log('💬 Phase 2: Generating response...');
    
    const responseMessages: AIMessage[] = [
      { role: 'system', content: buildResponsePrompt(analysis) }
    ];
    
    // Add conversation context
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6);
      recentHistory.forEach(msg => {
        responseMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content || ''
        });
      });
    }
    
    responseMessages.push({ role: 'user', content: sanitizedMessage });
    
    let responseResult = await callAI(responseMessages);
    
    if (!responseResult?.content) {
      console.log('First response call failed, retrying...');
      responseResult = await callAI(responseMessages);
    }
    
    if (!responseResult?.content) {
      console.error('Response phase failed');
      return NextResponse.json({ 
        error: 'AI service is not responding. Please try again.' 
      }, { status: 502 });
    }
    
    console.log(`✅ Response received from ${responseResult.provider}`);
    
    // Parse the response
    let parsed = parseAIJSON(responseResult.content);
    
    if (!parsed) {
      console.log('Failed to parse response JSON, using raw text');
      parsed = {
        acknowledgment: responseResult.content,
      };
    }
    
    // Map field names for frontend compatibility
    if (parsed.thoughtPattern && !parsed.distortionType) {
      parsed.distortionType = parsed.thoughtPattern;
    }
    if (parsed.patternNote && !parsed.distortionExplanation) {
      parsed.distortionExplanation = parsed.patternNote;
    }
    if (parsed.question && !parsed.probingQuestion) {
      parsed.probingQuestion = parsed.question;
    }
    
    // Ensure required fields
    parsed.acknowledgment = parsed.acknowledgment || "I hear you.";
    parsed.probingQuestion = parsed.probingQuestion || parsed.question || "What's underneath this for you?";
    parsed.icebergLayer = 'surface';
    parsed.layerInsight = analysis.underlying_fear || '';
    
    // Calculate progress
    const progressScore = Math.min(turnCount * 15, 75);
    const layerProgress = {
      surface: Math.min(turnCount * 20, 100),
      trigger: Math.min(Math.max(0, turnCount - 1) * 25, 100),
      emotion: Math.min(Math.max(0, turnCount - 2) * 30, 100),
      coreBelief: Math.min(Math.max(0, turnCount - 4) * 25, 100),
    };
    
    console.log('=== Two-Phase Complete ===');
    
    return NextResponse.json({
      ...parsed,
      progressScore,
      layerProgress,
      progressNote: `Turn ${turnCount}`,
      _meta: { 
        provider: responseResult.provider, 
        model: responseResult.model, 
        turn: turnCount,
        analysis: analysis // Include analysis for debugging
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to process thought' }, { status: 500 });
  }
}

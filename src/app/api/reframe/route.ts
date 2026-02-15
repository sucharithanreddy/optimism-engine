import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validateThought } from '@/lib/input-validation';
import { checkCrisisKeywords, generateCrisisResponse, SEVERITY_LEVELS } from '@/lib/crisis-detection';

// ============================================================================
// SITUATION GATE - The minimal fix
// Distinguishes "describing a person/situation" from "describing my thinking"
// ============================================================================

/**
 * Checks if the user is describing a human interaction/situation
 * This is used internally but no longer generates override text
 * The AI prompt handles situation awareness naturally
 */
function isLikelySituationMessage(text: string): boolean {
  const situationIndicators = [
    /\bhe\b|\bshe\b|\bthey\b/i,
    /boyfriend|girlfriend|husband|wife|partner/i,
    /friend|people|someone|my (mom|dad|parent)/i,
    /keeps doing|changed|acting different/i,
    /sometimes|not consistent|mixed signals/i,
    /said to me|told me/i,
    /doesn't|won't|always|never/i,
  ];

  for (const pattern of situationIndicators) {
    if (pattern.test(text)) return true;
  }

  return false;
}

// ============================================================================
// ADVANCED SMART RESPONSE ENGINE
// ============================================================================

// Types
interface ConversationContext {
  emotions: string[];
  topics: string[];
  distortions: string[];
  intensity: number;
  turnCount: number;
  lastKeywords: string[];
}

interface EmotionAnalysis {
  primary: string;
  secondary: string;
  intensity: 'mild' | 'moderate' | 'intense' | 'severe';
  indicators: string[];
}

interface DistortionAnalysis {
  type: string;
  confidence: number;
  evidence: string[];
  explanation: string;
}

interface ReframeResponse {
  acknowledgment: string;
  distortionType: string;
  distortionExplanation: string;
  reframe: string;
  probingQuestion: string;
  encouragement: string;
  icebergLayer: 'surface' | 'trigger' | 'emotion' | 'coreBelief';
  layerInsight: string;
  // AI-analyzed realistic progress
  progressScore: number; // 0-100 realistic progress
  layerProgress: {
    surface: number; // 0-100
    trigger: number; // 0-100
    emotion: number; // 0-100
    coreBelief: number; // 0-100
  };
  progressNote: string; // Brief explanation of current progress
}

// ============================================================================
// EMOTION ANALYSIS ENGINE
// ============================================================================

const EMOTION_PATTERNS = {
  exhausted: {
    keywords: ['tired', 'exhausted', 'drained', 'worn out', 'weary', 'fatigue', 'no energy', 'spent', 'burnt out', 'burned out', 'depleted', 'done', 'finished', 'can\'t go on'],
    phrases: ['so tired of', 'had enough', 'at my limit', 'running on empty', 'got nothing left', 'barely functioning'],
    intensity_boost: ['completely', 'totally', 'absolutely', 'utterly', 'so', 'extremely', 'incredibly']
  },
  anxious: {
    keywords: ['anxious', 'worried', 'nervous', 'panic', 'scared', 'fear', 'afraid', 'overwhelmed', 'dread', 'restless', 'uneasy', 'on edge', 'tense', 'stressed'],
    phrases: ['what if', 'might happen', 'going to go wrong', 'can\'t stop thinking', 'racing thoughts', 'heart racing', 'can\'t breathe', 'what\'s going to happen'],
    intensity_boost: ['terrified', 'petrified', 'paralyzed', 'crippled', 'consuming']
  },
  sad: {
    keywords: ['sad', 'depressed', 'hopeless', 'down', 'empty', 'lonely', 'cry', 'tears', 'grief', 'heartbreak', 'sorrow', 'melancholy', 'numb', 'hollow'],
    phrases: ['feel like crying', 'can\'t stop crying', 'don\'t want to get up', 'nothing matters', 'feel so alone', 'miss them', 'lost everything'],
    intensity_boost: ['devastated', 'shattered', 'broken', 'destroyed', 'crushed', 'unbearable']
  },
  angry: {
    keywords: ['angry', 'frustrated', 'annoyed', 'mad', 'irritated', 'furious', 'rage', 'hate', 'resentful', 'bitter', 'outraged', 'livid', 'pissed'],
    phrases: ['can\'t believe they', 'how dare', 'had enough of', 'so sick of', 'tired of dealing with', 'makes my blood boil', 'had it up to here'],
    intensity_boost: ['absolutely furious', 'beyond angry', 'blind rage', 'explosive', 'uncontrollable']
  },
  ashamed: {
    keywords: ['ashamed', 'embarrassed', 'humiliated', 'guilty', 'regret', 'mortified', 'disgraced', 'worthless', 'pathetic', 'stupid', 'idiot', 'loser'],
    phrases: ['shouldn\'t have', 'can\'t believe i', 'everyone will think', 'made a fool', 'showed my true colors', 'let everyone down'],
    intensity_boost: ['deeply', 'profoundly', 'completely', 'utterly', 'totally']
  },
  confused: {
    keywords: ['confused', 'lost', 'stuck', 'trapped', 'unsure', 'uncertain', 'conflicted', 'torn', 'paralyzed', 'indecisive', 'directionless'],
    phrases: ['don\'t know what to do', 'can\'t figure out', 'no idea', 'which way to turn', 'at a crossroads', 'going in circles', 'can\'t see a way out'],
    intensity_boost: ['completely lost', 'totally confused', 'utterly lost', 'hopelessly']
  },
  disappointed: {
    keywords: ['disappointed', 'let down', 'failed', 'failure', 'defeated', 'crushed', 'disheartened', 'discouraged', 'demoralized'],
    phrases: ['thought it would be', 'was supposed to', 'had hoped', 'expected better', 'didn\'t work out', 'fell through', 'not what i expected'],
    intensity_boost: ['deeply', 'profoundly', 'bitterly', 'crushingly']
  },
  inadequate: {
    keywords: ['not enough', 'inadequate', 'unworthy', 'imposter', 'fraud', 'don\'t deserve', 'not good enough', 'don\'t belong', 'out of my depth'],
    phrases: ['everyone else is', 'they\'re all so', 'i\'ll never be', 'why can\'t i just', 'should be able to', 'supposed to be better'],
    intensity_boost: ['completely', 'totally', 'utterly', 'hopelessly']
  }
};

const INTENSITY_WORDS = {
  mild: ['a bit', 'kind of', 'somewhat', 'slightly', 'a little', 'sort of'],
  moderate: ['really', 'quite', 'pretty', 'fairly', 'rather'],
  intense: ['so', 'very', 'extremely', 'incredibly', 'absolutely', 'completely'],
  severe: ['overwhelmingly', 'unbearably', 'devastatingly', 'crushingly', 'paralyzingly', 'impossible to']
};

function analyzeEmotion(text: string): EmotionAnalysis {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let bestMatch = { emotion: 'unsettled', score: 0, indicators: [] as string[] };
  
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    let score = 0;
    const indicators: string[] = [];
    
    // Check keywords
    for (const keyword of patterns.keywords) {
      if (lowerText.includes(keyword)) {
        score += 2;
        indicators.push(keyword);
      }
    }
    
    // Check phrases (higher weight)
    for (const phrase of patterns.phrases) {
      if (lowerText.includes(phrase)) {
        score += 4;
        indicators.push(phrase);
      }
    }
    
    // Check intensity boosters
    for (const booster of patterns.intensity_boost) {
      if (lowerText.includes(booster)) {
        score += 3;
      }
    }
    
    if (score > bestMatch.score) {
      bestMatch = { emotion, score, indicators };
    }
  }
  
  // Determine intensity
  let intensity: 'mild' | 'moderate' | 'intense' | 'severe' = 'moderate';
  
  const hasMild = INTENSITY_WORDS.mild.some(w => lowerText.includes(w));
  const hasIntense = INTENSITY_WORDS.intense.some(w => lowerText.includes(w));
  const hasSevere = INTENSITY_WORDS.severe.some(w => lowerText.includes(w));
  
  if (hasSevere || bestMatch.score >= 15) intensity = 'severe';
  else if (hasIntense || bestMatch.score >= 10) intensity = 'intense';
  else if (hasMild) intensity = 'mild';
  
  // Find secondary emotion
  let secondary = 'unsettled';
  let secondScore = 0;
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    if (emotion === bestMatch.emotion) continue;
    let score = 0;
    for (const keyword of patterns.keywords) {
      if (lowerText.includes(keyword)) score++;
    }
    if (score > secondScore) {
      secondScore = score;
      secondary = emotion;
    }
  }
  
  return {
    primary: bestMatch.emotion,
    secondary,
    intensity,
    indicators: bestMatch.indicators.slice(0, 3)
  };
}

// ============================================================================
// COGNITIVE DISTORTION DETECTOR
// ============================================================================

const COGNITIVE_DISTORTIONS = {
  'Catastrophizing': {
    patterns: [
      /\b(disaster|catastrophe|nightmare|end of the world|ruined|destroyed|can't survive|won't survive|impossible to recover)\b/i,
      /\b(worst thing|worst possible|terrible mistake|huge mistake|massive failure)\b/i,
      /\b(everything is (ruined|destroyed|over|lost))\b/i,
      /\b(can't (handle|take|bear|deal with) this)\b/i,
      /\b(going to (lose|lose my|ruin my|destroy my|end my))\b/i
    ],
    explanationTemplates: [
      "Your mind is jumping to the worst possible outcome, treating this situation as catastrophic when there may be other possibilities.",
      "You're amplifying the negative consequences while minimizing your ability to cope with them.",
      "The situation feels apocalyptic, but your mind may be exaggerating the true impact."
    ]
  },
  'All-or-Nothing Thinking': {
    patterns: [
      /\b(always|never|every single|each and every|all or nothing|completely|totally|absolutely)\b.*\b(fail|wrong|bad|terrible|horrible)\b/i,
      /\b(if i can't .* (perfectly|completely|fully) then).*\b(why bother|what's the point|useless)\b/i,
      /\b(either .* or|black and white|no middle ground|complete (success|failure))\b/i,
      /\b(total|complete|absolute|utter) (failure|disaster|mess|wreck)\b/i,
      /\b(i'm (completely|totally|absolutely) (useless|worthless|hopeless))\b/i
    ],
    explanationTemplates: [
      "You're viewing this situation in black-and-white terms, missing the gray areas and partial successes.",
      "Your thinking is polarized - either perfect or terrible - without recognizing the middle ground where most of life happens.",
      "You're discounting the nuance here. Reality rarely fits into absolute categories."
    ]
  },
  'Mind Reading': {
    patterns: [
      /\b(they (think|believe|assume|probably think|must think|surely think))\b/i,
      /\b(everyone (thinks|knows|believes|sees))\b/i,
      /\b(people (think|are thinking|probably))\b/i,
      /\b(he thinks|she thinks|they're thinking)\b/i,
      /\b(can tell (they|he|she) (think|thinks|is thinking))\b/i,
      /\b(know what they're thinking|can see it in their eyes)\b/i
    ],
    explanationTemplates: [
      "You're assuming you know what others are thinking without having direct evidence of their thoughts.",
      "Your mind is filling in the gaps about others' perspectives, but these assumptions may not reflect reality.",
      "You're projecting your fears onto others' minds. Their actual thoughts might be quite different."
    ]
  },
  'Fortune Telling': {
    patterns: [
      /\b(going to (fail|lose|mess up|screw up|ruin|be terrible|be awful|be a disaster))\b/i,
      /\b(will (never|not|fail|lose|be able to))\b/i,
      /\b(can already (see|tell|know) (it|this|that) (will|won't|is going to))\b/i,
      /\b(destined to|doomed to|bound to fail|certain to fail)\b/i,
      /\b(i just know (it|this|that))\b.*\b(will|won't|going to)\b/i,
      /\b(never going to|won't ever|will never be able to)\b/i
    ],
    explanationTemplates: [
      "You're predicting a negative future as if you can see it with certainty, but the future hasn't been written yet.",
      "Your mind is creating a self-fulfilling prophecy by assuming failure before you've even tried.",
      "You're treating your anxious predictions as facts rather than possibilities."
    ]
  },
  'Emotional Reasoning': {
    patterns: [
      /\b(i feel (like|as if|that) .*)\b/i,
      /\b(it feels (like|as if|that) .*)\b/i,
      /\b(because i feel|since i feel)\b/i,
      /\b(feel so (sure|certain|convinced))\b/i,
      /\b(my (gut|heart|feelings) (tells|tell) me)\b/i
    ],
    explanationTemplates: [
      "You're using your feelings as evidence for what's true, but emotions are reactions, not facts.",
      "Just because something feels true doesn't make it objectively true. Feelings can be powerful but misleading.",
      "Your emotional experience is valid, but treating it as proof of reality can lead you astray."
    ]
  },
  'Should Statements': {
    patterns: [
      /\b(i should|you should|they should|he should|she should|we should)\b/i,
      /\b(i must|you must|they must|have to|need to|ought to)\b/i,
      /\b(i'm supposed to|shouldn't have|should have|must have)\b/i,
      /\b(i deserve to be|don't deserve to)\b/i
    ],
    explanationTemplates: [
      "You're using rigid rules about how things 'should' be, creating unnecessary pressure and guilt.",
      "These 'should' statements are like a harsh internal critic that never lets you off the hook.",
      "You're holding yourself to unrealistic standards that set you up for feeling inadequate."
    ]
  },
  'Labeling': {
    patterns: [
      /\b(i am a|i'm a|i'm such a)\s*(loser|failure|idiot|stupid|worthless|pathetic|waste|mess)\b/i,
      /\b(i'm (totally|completely|absolutely) (worthless|useless|hopeless))\b/i,
      /\b(that's just (who|what) i am)\b/i,
      /\b(i'm (the type of|that kind of) person who)\b.*\b(fails|messes up|can't)\b/i
    ],
    explanationTemplates: [
      "You're applying a harsh label to yourself instead of describing a specific behavior or situation.",
      "This label reduces your complex humanity to a single negative judgment - you're more than this.",
      "Labels stick, but they're rarely accurate. You're describing what happened, not who you are."
    ]
  },
  'Personalization': {
    patterns: [
      /\b(my fault|because of me|i caused|i'm to blame|i ruined|i messed up everything)\b/i,
      /\b(this (is|was|happened) because of me)\b/i,
      /\b(everything is my fault|all my fault)\b/i,
      /\b(if only i (had|hadn't|did|didn't))\b/i,
      /\b(i (take|accept) (full|all|complete) responsibility)\b/i
    ],
    explanationTemplates: [
      "You're taking more responsibility than is warranted, blaming yourself for things outside your control.",
      "While self-reflection is valuable, you may be over-owning outcomes that have multiple causes.",
      "Your mind is assuming more blame than the situation actually warrants."
    ]
  },
  'Mental Filtering': {
    patterns: [
      /\b(but .* (bad|wrong|terrible|awful|failed))\b/i,
      /\b(only .* (bad|negative|wrong))\b/i,
      /\b(ignoring|dismissing|didn't notice) .* (good|positive|success)\b/i,
      /\b(focus(ing)? on .* (bad|wrong|failed|negative))\b/i
    ],
    explanationTemplates: [
      "You're filtering out the positive aspects of the situation and focusing exclusively on the negative.",
      "Your mind is like a spotlight that only illuminates what went wrong, leaving the rest in darkness.",
      "You're discounting evidence that doesn't fit your negative narrative."
    ]
  },
  'Overgeneralization': {
    patterns: [
      /\b(this always|it always|things always|everything always)\b/i,
      /\b(this never|it never|things never|nothing ever)\b/i,
      /\b(another (failure|mistake|disappointment))\b/i,
      /\b( (typical|just my luck|my whole life))\b/i,
      /\b(again and again|over and over|time after time)\b/i
    ],
    explanationTemplates: [
      "You're taking one situation and generalizing it to a universal pattern that may not exist.",
      "Your mind is drawing broad conclusions from limited evidence.",
      "You're treating this as part of an endless pattern when it might be an isolated incident."
    ]
  },
  'Rumination': {
    patterns: [
      /\b(thinking about (the past|past events|what happened))\b/i,
      /\b(keep thinking about|can't stop thinking about|replaying)\b/i,
      /\b(going over and over|stuck in my head|circling back)\b/i,
      /\b(resurfaced|coming back to|keeps coming up)\b/i,
      /\b(over and over in my mind|on repeat|loop)\b/i,
      /\b(what i (should|could) have (said|done))\b/i
    ],
    explanationTemplates: [
      "Your mind is replaying past events on a loop, which can feel draining but often means there's something unresolved seeking attention.",
      "You're stuck in a thought cycle about the past - your brain is trying to process something, even if it feels exhausting.",
      "Rumination often happens when we're trying to solve something that can't be solved by thinking alone."
    ]
  },
  'Disqualifying the Positive': {
    patterns: [
      /\b(that doesn't count|doesn't matter|not a big deal)\b/i,
      /\b(anyone could|anyone would|that was just luck)\b/i,
      /\b(but that's|but it's only|just because)\b/i,
      /\b(it wasn't really|doesn't really count)\b/i
    ],
    explanationTemplates: [
      "You're dismissing positive experiences as if they don't count, which keeps the negative narrative intact.",
      "Your mind is explaining away anything good, refusing to let it balance the picture.",
      "When good things happen, you're finding reasons to discount them."
    ]
  },
  'Self-Criticism': {
    patterns: [
      /\b(i (was|am being|acted) (fake|phony|fake|pretending))\b/i,
      /\b(i messed up|i screwed up|i ruined)\b/i,
      /\b(i'm so (stupid|dumb|idiotic|pathetic))\b/i,
      /\b(being (too|so) (hard on myself|critical|judgmental))\b/i,
      /\b(beating myself up|hard on myself)\b/i,
      /\b(i (should|could) have (done|said|acted) (better|differently))\b/i
    ],
    explanationTemplates: [
      "You're being much harsher with yourself than you would be with anyone else. The inner critic is loud right now.",
      "There's a lot of self-judgment here. Would you speak to a friend this way?",
      "Your inner critic is working overtime. It might think it's helping, but it's actually adding to your pain."
    ]
  }
};

function detectDistortions(text: string): DistortionAnalysis {
  const lowerText = text.toLowerCase();
  
  // Default with more varied options
  let bestMatch: DistortionAnalysis = {
    type: 'Exploring Patterns',
    confidence: 0,
    evidence: [],
    explanation: 'Something in what you shared caught my attention. Let\'s explore what might be underneath it.'
  };
  
  for (const [distortion, data] of Object.entries(COGNITIVE_DISTORTIONS)) {
    let matches = 0;
    const evidence: string[] = [];
    
    for (const pattern of data.patterns) {
      const match = text.match(pattern);
      if (match) {
        matches++;
        evidence.push(match[0]);
      }
    }
    
    if (matches > bestMatch.confidence) {
      const explanation = data.explanationTemplates[Math.floor(Math.random() * data.explanationTemplates.length)];
      bestMatch = {
        type: distortion,
        confidence: matches,
        evidence,
        explanation
      };
    }
  }
  
  return bestMatch;
}

// ============================================================================
// RESPONSE GENERATOR
// ============================================================================

// Words to track for repetition avoidance
const OVERUSED_WORDS = [
  'heaviness', 'heavy', 'weight', 'carrying', 'weighing', 'weighs',
  'burden', 'load', 'dragging', 'crushing'
];

function getUsedWordsFromHistory(history: Array<{role: string, content: string}>): Set<string> {
  const usedWords = new Set<string>();
  const assistantMessages = history.filter(m => m.role === 'assistant');
  
  for (const msg of assistantMessages) {
    const lowerContent = msg.content.toLowerCase();
    for (const word of OVERUSED_WORDS) {
      if (lowerContent.includes(word)) {
        usedWords.add(word);
      }
    }
  }
  
  return usedWords;
}

function filterTemplatesByUsedWords(templates: string[], usedWords: Set<string>): string[] {
  if (usedWords.size === 0) return templates;
  
  // First try to find templates without overused words
  const filtered = templates.filter(t => {
    const lower = t.toLowerCase();
    for (const word of usedWords) {
      if (lower.includes(word)) return false;
    }
    return true;
  });
  
  // If all templates would be filtered, return original to avoid empty array
  return filtered.length > 0 ? filtered : templates;
}

function extractKeyPhrases(text: string): string[] {
  // Extract meaningful phrases and keywords
  const phrases: string[] = [];
  
  // Look for quoted phrases
  const quotes = text.match(/"([^"]+)"/g);
  if (quotes) phrases.push(...quotes.map(q => q.replace(/"/g, '')));
  
  // Look for "I am/I feel/I'm" statements
  const feelingStatements = text.match(/(?:i am|i'm|i feel|feeling)\s+[\w\s]+/gi);
  if (feelingStatements) phrases.push(...feelingStatements.slice(0, 2));
  
  // Look for specific nouns/objects they mention
  const nouns = text.match(/\b(my \w+|this \w+|that \w+|the \w+)\b/gi);
  if (nouns) phrases.push(...nouns.slice(0, 2).map(n => n.toLowerCase()));
  
  return Array.from(new Set(phrases)).slice(0, 4);
}

function generateAcknowledgment(text: string, emotion: EmotionAnalysis, history: Array<{role: string, content: string}>): string {
  const phrases = extractKeyPhrases(text);
  const keyPhrase = phrases[0] || text.slice(0, 35);
  
  const templates: Record<string, Record<string, string[]>> = {
    exhausted: {
      severe: [
        `I can feel how completely drained you are in every word. When you say "${keyPhrase}" - that sounds like you've been running on fumes for far too long. Let me acknowledge that depth of exhaustion first.`,
        `The profound exhaustion in your words tells me you've reached a breaking point. "${keyPhrase}" - I hear how depleted you are, and I want you to know that acknowledging this is not weakness.`
      ],
      intense: [
        `I hear how truly spent you are. "${keyPhrase}" - that level of tiredness goes deeper than physical fatigue. Let's explore what's been draining your reserves.`,
        `There's a bone-deep weariness in what you're sharing. When you express "${keyPhrase}", I sense you've been pushing past your limits for too long.`
      ],
      moderate: [
        `I can hear the fatigue in your words. "${keyPhrase}" - that sounds genuinely draining, and it makes sense that you're feeling this way.`,
        `The tiredness in your message is palpable. When you talk about "${keyPhrase}", I sense you've been dealing with a lot lately.`
      ],
      mild: [
        `I hear that you're feeling worn down. "${keyPhrase}" sounds like it's taking more energy than you have right now.`,
        `There's a weariness in your words about "${keyPhrase}". Let's unpack what's been demanding so much of you.`
      ]
    },
    anxious: {
      severe: [
        `I can feel the overwhelming anxiety in your words. "${keyPhrase}" - that level of fear and worry feels consuming, and I want you to know I hear how frightening this feels.`,
        `The intensity of your anxiety is palpable. When you share "${keyPhrase}", I sense a mind that's spinning with terrifying possibilities. Let's slow this down together.`
      ],
      intense: [
        `I can sense the strong undercurrent of anxiety in what you're sharing. "${keyPhrase}" - that worry feels very real and present for you right now.`,
        `Your words carry a lot of nervous energy. "${keyPhrase}" tells me something important feels at stake here, and that's creating real distress.`
      ],
      moderate: [
        `I hear the worry woven through your words. "${keyPhrase}" - that sounds like it's been occupying a lot of mental space.`,
        `There's genuine concern in what you're sharing about "${keyPhrase}". The anxiety you're feeling makes sense given what you're facing.`
      ],
      mild: [
        `I notice some unease in your words about "${keyPhrase}". That feeling of not-quite-settled is worth exploring.`,
        `There's a hint of nervousness when you mention "${keyPhrase}". Let's look at what might be stirring that up.`
      ]
    },
    sad: {
      severe: [
        `I can feel the depth of sorrow in your words. "${keyPhrase}" - that level of pain goes beyond simple sadness, and I want to honor how profoundly this is affecting you.`,
        `The profound grief in your message is unmistakable. When you say "${keyPhrase}", I hear a heart that's been deeply wounded.`
      ],
      intense: [
        `I hear the deep sadness in what you're sharing. "${keyPhrase}" - that kind of pain touches something fundamental, and I sense you're really struggling.`,
        `There's an aching sorrow behind your words about "${keyPhrase}". That level of sadness deserves space and acknowledgment.`
      ],
      moderate: [
        `I can hear the sorrow in your voice through these words. "${keyPhrase}" sounds like it's touching something tender in you.`,
        `There's a genuine sadness when you talk about "${keyPhrase}". That emotion is real and valid.`
      ],
      mild: [
        `I sense some melancholy in your words about "${keyPhrase}". Let's explore what's bringing up these feelings.`,
        `There's a hint of sadness when you mention "${keyPhrase}". Sometimes quieter sadness deserves just as much attention.`
      ]
    },
    angry: {
      severe: [
        `I can feel the intensity of your anger radiating from these words. "${keyPhrase}" - something has clearly crossed a deep line, and that fury is real and justified.`,
        `The raw anger in your message is powerful. When you express "${keyPhrase}", I hear someone whose boundaries have been profoundly violated.`
      ],
      intense: [
        `I hear the strong frustration and anger in your words. "${keyPhrase}" - that level of heat tells me something important has been threatened or disrespected.`,
        `There's real fire in what you're sharing about "${keyPhrase}". Your anger is telling you something matters here.`
      ],
      moderate: [
        `I can sense the frustration building in your words. "${keyPhrase}" - that sounds genuinely aggravating, and your irritation makes sense.`,
        `There's legitimate heat when you talk about "${keyPhrase}". Something has clearly not sat right with you.`
      ],
      mild: [
        `I notice some irritation when you mention "${keyPhrase}". That annoyance is worth paying attention to.`,
        `There's a hint of frustration in your words about "${keyPhrase}". Let's explore what's triggering that.`
      ]
    },
    ashamed: {
      severe: [
        `I can feel the profound shame in your words. "${keyPhrase}" - that level of self-judgment is incredibly painful, and I want you to know that shame often lies to us about who we really are.`,
        `The deep shame in your message is heartbreaking. When you share "${keyPhrase}", I hear someone who's being incredibly harsh with themselves.`
      ],
      intense: [
        `I hear the strong sense of shame in what you're sharing. "${keyPhrase}" - that kind of self-criticism can be devastating, and I sense you're being very hard on yourself.`,
        `There's intense embarrassment in your words about "${keyPhrase}". The judgment you're placing on yourself feels overwhelming.`
      ],
      moderate: [
        `I can sense the self-consciousness in your words. "${keyPhrase}" sounds like it's brought up some difficult feelings about yourself.`,
        `There's genuine discomfort with yourself when you mention "${keyPhrase}". Let's look at this with more compassion.`
      ],
      mild: [
        `I notice some self-judgment in your words about "${keyPhrase}". Sometimes we're our own harshest critics.`,
        `There's a hint of embarrassment when you share "${keyPhrase}". Let's explore that with kindness.`
      ]
    },
    confused: {
      severe: [
        `I can feel the overwhelming disorientation in your words. "${keyPhrase}" - that level of feeling completely lost is deeply unsettling, and I hear how frightening the uncertainty feels.`,
        `The profound confusion in your message is palpable. When you say "${keyPhrase}", I sense someone who feels like they've lost their bearings entirely.`
      ],
      intense: [
        `I hear the deep uncertainty in what you're sharing. "${keyPhrase}" - that level of not-knowing can feel paralyzing, and I sense you're really searching for clarity.`,
        `There's strong disorientation in your words about "${keyPhrase}". Feeling this lost is genuinely unsettling.`
      ],
      moderate: [
        `I can sense the genuine confusion in your words. "${keyPhrase}" sounds like a real puzzle you're trying to solve.`,
        `There's real uncertainty when you talk about "${keyPhrase}". Not knowing which direction to take is difficult.`
      ],
      mild: [
        `I notice some uncertainty in your words about "${keyPhrase}". That feeling of being a bit lost is worth exploring.`,
        `There's a hint of confusion when you mention "${keyPhrase}". Let's see if we can find some clarity together.`
      ]
    },
    disappointed: {
      severe: [
        `I can feel the crushing disappointment in your words. "${keyPhrase}" - that level of devastation when reality doesn't match our hopes is profoundly painful.`,
        `The depth of disappointment in your message is unmistakable. When you share "${keyPhrase}", I hear hopes and expectations that have been shattered.`
      ],
      intense: [
        `I hear the deep sense of letdown in what you're sharing. "${keyPhrase}" - that kind of profound disappointment affects us at our core.`,
        `There's heavy disappointment in your words about "${keyPhrase}". When we invest so much hope, the fall is hard.`
      ],
      moderate: [
        `I can sense the genuine disappointment in your words. "${keyPhrase}" sounds like something you had real hopes for.`,
        `There's real letdown when you talk about "${keyPhrase}". That gap between what you wanted and what happened is painful.`
      ],
      mild: [
        `I notice some disappointment in your words about "${keyPhrase}". When expectations aren't met, even small letdowns matter.`,
        `There's a hint of letdown when you mention "${keyPhrase}". Let's explore what you were hoping for.`
      ]
    },
    inadequate: {
      severe: [
        `I can feel the crushing sense of inadequacy in your words. "${keyPhrase}" - that belief that you're fundamentally not enough is a painful lie that shame tells us, and I hear how deeply it's affecting you.`,
        `The profound feeling of not-being-enough in your message is heartbreaking. When you say "${keyPhrase}", I hear someone who's lost sight of their inherent worth.`
      ],
      intense: [
        `I hear the strong sense of not measuring up in what you're sharing. "${keyPhrase}" - that feeling of deficiency can be devastating, and I sense you're comparing yourself harshly.`,
        `There's intense inadequacy in your words about "${keyPhrase}". The belief that you're falling short is really affecting you.`
      ],
      moderate: [
        `I can sense the self-doubt in your words. "${keyPhrase}" sounds like it's triggered feelings of not being quite enough.`,
        `There's genuine feeling of falling short when you talk about "${keyPhrase}". Let's examine where that standard is coming from.`
      ],
      mild: [
        `I notice some self-doubt in your words about "${keyPhrase}". Sometimes we judge ourselves more harshly than others do.`,
        `There's a hint of not-quite-enough when you mention "${keyPhrase}". Let's explore that with more self-compassion.`
      ]
    },
    unsettled: {
      severe: [
        `I can feel something deeply unsettling in your words. "${keyPhrase}" - there's significant distress here that deserves our full attention.`,
        `The intensity of what you're sharing about "${keyPhrase}" tells me something important is stirring. Let's give this the space it deserves.`
      ],
      intense: [
        `I hear strong emotion in what you're sharing about "${keyPhrase}". Something significant is moving beneath the surface.`,
        `There's intensity in your words about "${keyPhrase}". Let's slow down and explore what's really happening here.`
      ],
      moderate: [
        `I can sense something stirring in your words about "${keyPhrase}". Let's explore this together.`,
        `There's real feeling in what you're sharing about "${keyPhrase}". Let's give this some attention.`
      ],
      mild: [
        `I notice something in your words about "${keyPhrase}" that feels worth exploring deeper.`,
        `There's something in "${keyPhrase}" that catches my attention. Let's look closer.`
      ]
    }
  };
  
  const usedWords = getUsedWordsFromHistory(history);
  const emotionTemplates = templates[emotion.primary] || templates.unsettled;
  const intensityTemplates = emotionTemplates[emotion.intensity] || emotionTemplates.moderate;
  
  // Filter out templates with overused words
  const filteredTemplates = filterTemplatesByUsedWords(intensityTemplates, usedWords);
  
  return filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];
}

function generateReframe(text: string, emotion: EmotionAnalysis, distortion: DistortionAnalysis, history: Array<{role: string, content: string}> = []): string {
  const templates: Record<string, string[]> = {
    exhausted: [
      `Try reframing this: "I am not weak for feeling tired—I am human. My exhaustion is a signal that I've been strong for too long without rest. I can honor my limits while still being worthy of love and respect."`,
      `Consider this perspective: "My tiredness doesn't define my worth. I am allowed to rest, to recover, and to say 'not today.' Rest is not the opposite of progress—it's part of it."`,
      `A gentler view: "I've been dealing with a lot, and it makes sense that I'm tired. I don't have to earn rest through exhaustion. I can choose to care for myself before I reach empty."`
    ],
    anxious: [
      `Try this reframe: "I am feeling anxious, and that's okay. Anxiety is my mind trying to protect me, even if it's overreacting. I can acknowledge this feeling without letting it drive the car. I've handled difficult situations before."`,
      `Consider: "What if this anxiety is actually excitement or care wearing a scary mask? I can feel the fear and still take the next small step. I don't need certainty to move forward."`,
      `A different view: "I'm predicting negative outcomes, but I can't actually see the future. I've survived 100% of my worst days so far. I can handle uncertainty one moment at a time."`
    ],
    sad: [
      `Try reframing: "This sadness is real and valid, but it's not permanent. My feelings are visitors—they come and they go. I can let this emotion exist without letting it define me."`,
      `Consider: "My grief shows how much I cared. This pain is the price of love, and that means something beautiful existed. I can hold space for sorrow while trusting in my capacity to heal."`,
      `A gentler perspective: "I don't have to fix this sadness today. I can simply be with it, letting it move through me like weather. This feeling is evidence of my heart's capacity, not its brokenness."`
    ],
    angry: [
      `Try this reframe: "My anger is valid—it's telling me that something matters, that a boundary was crossed. I can honor this anger without letting it consume me. I choose how to respond."`,
      `Consider: "This heat I'm feeling is energy—energy I can use to set boundaries, make changes, or protect what's important. Anger isn't bad; it's information about what I value."`,
      `A different view: "I'm allowed to be angry. This emotion doesn't make me a bad person—it makes me someone who cares about fairness and respect. I can channel this into something constructive."`
    ],
    ashamed: [
      `Try reframing: "I am judging myself much more harshly than I would judge anyone else. What happened is not who I am. I am a complex human who sometimes makes mistakes—like everyone else."`,
      `Consider: "Shame thrives in secrecy. By sharing this, I'm breaking its power. I don't have to be perfect to be worthy of love and belonging. My worth isn't determined by my worst moment."`,
      `A gentler view: "I'm being incredibly hard on myself. Would I speak to a friend this way? I can learn from what happened without destroying myself over it. I am more than this mistake."`
    ],
    confused: [
      `Try this reframe: "I don't have to have all the answers right now. Uncertainty is uncomfortable, but it's not dangerous. I can give myself time to figure this out."`,
      `Consider: "Feeling lost often means I'm in transition—between who I was and who I'm becoming. This confusion might be the discomfort of growth, not failure."`,
      `A different view: "Not knowing is actually the beginning of knowing. I can sit with this uncertainty without rushing to force clarity. The answers will come in their own time."`
    ],
    disappointed: [
      `Try reframing: "This didn't work out the way I hoped, and that hurts. But one outcome doesn't define my whole story. I can grieve what didn't happen while staying open to what might."`,
      `Consider: "My disappointment shows how much I cared. That investment wasn't wasted—it taught me something about what I want. I can carry that forward."`,
      `A gentler perspective: "Reality and expectation rarely match perfectly. This gap is painful, but it's not the end. New doors open from places we didn't expect."`
    ],
    inadequate: [
      `Try this reframe: "I am measuring myself against an impossible standard. I don't have to be perfect to be enough. My worth isn't something I earn—it's something I already have."`,
      `Consider: "The voice saying 'not enough' is fear, not fact. I bring unique value simply by being me. I don't need to do more to deserve to take up space in this world."`,
      `A different view: "I'm comparing my inside to everyone else's outside. What I see as their 'having it together' is often just a performance. I am doing better than I think."`
    ],
    unsettled: [
      `Try this reframe: "Something is shifting in me, even if I can't name it yet. I can stay curious about this feeling instead of fighting it. Growth often feels uncomfortable before it feels good."`,
      `Consider: "This unsettled feeling might be my intuition trying to tell me something. I can listen without having to act immediately. Understanding comes when we create space for it."`,
      `A gentler view: "I don't have to resolve this today. I can simply notice what I'm feeling with compassion. The clarity I'm seeking will emerge in its own time."`
    ]
  };
  
  const usedWords = getUsedWordsFromHistory(history);
  const options = templates[emotion.primary] || templates.unsettled;
  const filteredOptions = filterTemplatesByUsedWords(options, usedWords);
  
  return filteredOptions[Math.floor(Math.random() * filteredOptions.length)];
}

function generateProbingQuestion(text: string, emotion: EmotionAnalysis, distortion: DistortionAnalysis, layer: string, history: Array<{role: string, content: string}>): string {
  const phrases = extractKeyPhrases(text);
  const keyPhrase = phrases[0] || 'this';
  
  const questions = {
    surface: [
      `What was happening right before the thought "${keyPhrase}" first appeared for you today?`,
      `If this feeling had a shape or color, what would it look like? Sometimes our senses can help us understand what words can't capture.`,
      `When you notice yourself thinking about "${keyPhrase}", where do you feel it in your body? Our bodies often know before our minds do.`,
      `What time of day does this thought tend to visit you most? Sometimes patterns hide in plain sight.`
    ],
    trigger: [
      `What about "${keyPhrase}" feels most difficult for you? Is it the situation itself, or what it means about something deeper?`,
      `If this trigger were trying to protect you in some way, what might it be trying to guard you from?`,
      `What value of yours feels most threatened right now? Sometimes what we react to most strongly points to what we care about most.`,
      `When you encounter this feeling, what do you typically do? Do you move toward it, away from it, or try to push it down?`
    ],
    emotion: [
      `If this ${emotion.primary} feeling could speak, what would it tell you it needs? Emotions are messengers—what's the message?`,
      `What might this ${emotion.primary} be trying to protect you from? Sometimes our hardest feelings are trying to help us in clumsy ways.`,
      `When else in your life have you felt this same ${emotion.primary}? Our patterns often have roots in earlier chapters.`,
      `If you could spend a day with this feeling—really listen to it without trying to change it—what might you learn?`
    ],
    coreBelief: [
      `If the thought "${keyPhrase}" were completely true, what would that ultimately mean about who you are as a person?`,
      `Where might you have first learned to see yourself this way? Sometimes our deepest beliefs were planted by others.`,
      `What would your life look like if you no longer believed this about yourself? What would become possible?`,
      `Whose voice do you hear when this thought speaks? Is it truly yours, or does it belong to someone from your past?`
    ]
  };
  
  const layerQuestions = questions[layer as keyof typeof questions] || questions.surface;
  return layerQuestions[Math.floor(Math.random() * layerQuestions.length)];
}

function generateEncouragement(text: string, emotion: EmotionAnalysis, distortion: DistortionAnalysis, history: Array<{role: string, content: string}> = []): string {
  const templates = [
    `The very fact that you're here, examining this thought instead of just accepting it, shows incredible self-awareness. That courage to look closely at what's difficult—that's not nothing. That's everything.`,
    `You're doing the brave work of turning toward your pain instead of away from it. That takes real strength. Every moment you spend understanding your patterns is a moment of growth, whether you can see it yet or not.`,
    `I want you to know: the discomfort you're feeling right now? That's the feeling of change happening. It doesn't feel good, but it means something important is moving. You're not stuck—you're in motion.`,
    `What you shared today matters. Not because there's a perfect answer, but because you're willing to ask the questions. That openness is rare and valuable. Trust that you're exactly where you need to be.`,
    `The voice that brought you here—the one that said "I want to understand this"—that's a wise voice. That's the part of you that knows you deserve more than to stay stuck in this pattern. Listen to that voice.`,
    `You know what I notice? You're not running from this. You're not numbing out. You're here, engaging with something hard. That's not weakness—that's the definition of courage.`,
    `This thought has been on your mind, but here's what I want you to remember: thoughts feel permanent, but they're actually some of the most temporary things we experience. This intensity will pass. You will feel differently.`,
    `The work you're doing here—examining your thoughts, questioning your patterns—this is the work of transformation. It's slow and sometimes painful, but it's real. You're becoming more yourself, not less.`
  ];
  
  const usedWords = getUsedWordsFromHistory(history);
  const filteredTemplates = filterTemplatesByUsedWords(templates, usedWords);
  
  return filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];
}

// ============================================================================
// MAIN RESPONSE GENERATOR
// ============================================================================

function generateSmartResponse(
  userMessage: string, 
  conversationHistory: Array<{role: string, content: string}>
): ReframeResponse {
  // Determine conversation layer
  const layers = ['surface', 'trigger', 'emotion', 'coreBelief'] as const;
  const layerIndex = Math.min(Math.floor(conversationHistory.length / 3), 3);
  const currentLayer = layers[layerIndex];
  
  // Analyze the message
  const emotion = analyzeEmotion(userMessage);
  const distortion = detectDistortions(userMessage);
  
  // Generate personalized response
  const acknowledgment = generateAcknowledgment(userMessage, emotion, conversationHistory);
  const reframe = generateReframe(userMessage, emotion, distortion, conversationHistory);
  const probingQuestion = generateProbingQuestion(userMessage, emotion, distortion, currentLayer, conversationHistory);
  const encouragement = generateEncouragement(userMessage, emotion, distortion, conversationHistory);
  
  // Layer insight
  const layerInsights = {
    surface: `We're starting at the surface—the thought that first caught your attention. There's almost always more beneath this first wave. Let's see what we find.`,
    trigger: `We're exploring what activates this pattern in you. Understanding your triggers is like getting the user manual to your own mind—you gain choices you didn't know you had.`,
    emotion: `We're reaching the emotional layer now—the feelings that fuel these thoughts. Emotions carry important messages. The goal isn't to eliminate them, but to understand what they're telling you.`,
    coreBelief: `We've reached the core—the deep belief that may be driving these patterns. This is powerful territory. Core beliefs formed early, but they can be examined, questioned, and ultimately rewritten.`
  };
  
  return {
    acknowledgment,
    distortionType: distortion.type,
    distortionExplanation: distortion.explanation,
    reframe,
    probingQuestion,
    encouragement,
    icebergLayer: currentLayer,
    layerInsight: layerInsights[currentLayer]
  };
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

import { callAI, getConfiguredProvider, type AIMessage } from '@/lib/ai-service';

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

// Dynamic system prompt generator
function buildSystemPrompt(
  turnCount: number, 
  currentLayer: string,
  sessionContext?: SessionContext
): string {
  // Guide which iceberg layer to focus on
  let contextHint = '';
  if (turnCount <= 1) {
    contextHint = 'Surface - Find the event';
  } else if (turnCount <= 2) {
    contextHint = 'Trigger - Find what set it off';
  } else if (turnCount <= 3) {
    contextHint = 'Emotion - Find the core feeling';
  } else {
    contextHint = 'Core Belief - Find the deeper meaning';
  }

  return `You help users understand their emotions by following the Iceberg model.

Current depth: ${contextHint}

For EVERY response, output exactly this JSON structure with 5 layers:

{
  "acknowledgment": "Acknowledge what they said in 1 sentence. Be direct.",
  "surface": "What happened? Name or ask about the specific event.",
  "trigger": "What set this off? Name or ask about the trigger.",
  "emotion": "What's the feeling underneath? Name or ask about the core emotion.",
  "coreBelief": "What does this say about them? Name or ask about the deeper belief.",
  "question": "One question that moves them deeper into the iceberg."
}

Rules:
- Go deeper each turn based on what they've revealed
- If they're at surface, ask about the event
- If they described an event, ask what it meant to them
- If they shared meaning, ask what fear is underneath
- If they revealed a fear, ask what belief it connects to
- Be conversational and direct. No therapy jargon.
- Each layer = 1-2 sentences max

Return ONLY the JSON. No markdown. No explanations before or after.`;
}

// Determine current iceberg layer based on progress score (AI-analyzed)
function getCurrentLayerFromProgress(progressScore: number): string {
  if (progressScore < 25) return 'surface';
  if (progressScore < 50) return 'trigger';
  if (progressScore < 75) return 'emotion';
  return 'coreBelief';
}

// Fallback layer based on turn count (used when AI doesn't provide progress)
function getCurrentLayer(turnCount: number): string {
  if (turnCount <= 1) return 'surface';
  if (turnCount <= 3) return 'trigger';
  if (turnCount <= 5) return 'emotion';
  return 'coreBelief';
}

// Default progress based on conversation depth analysis
function analyzeDefaultProgress(messages: ChatMessage[]): { score: number; layerProgress: { surface: number; trigger: number; emotion: number; coreBelief: number } } {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  // Analyze content for depth indicators
  let emotionalDepth = 0;
  let vulnerabilityScore = 0;
  let insightScore = 0;
  
  const depthKeywords = ['feel', 'feeling', 'hurt', 'pain', 'scared', 'afraid', 'deep', 'inside', 'core', 'belief', 'always', 'never', 'childhood', 'parents', 'trauma', 'wound'];
  const vulnerabilityKeywords = ['ashamed', 'embarrassed', 'secret', 'never told', 'vulnerable', 'hard to admit', 'weakness', 'failure'];
  const insightKeywords = ['realize', 'understand', 'see now', 'makes sense', 'pattern', 'connection', 'aha', 'never thought of it that way'];
  
  userMessages.forEach(msg => {
    const text = msg.content.toLowerCase();
    depthKeywords.forEach(kw => { if (text.includes(kw)) emotionalDepth += 3; });
    vulnerabilityKeywords.forEach(kw => { if (text.includes(kw)) vulnerabilityScore += 5; });
    insightKeywords.forEach(kw => { if (text.includes(kw)) insightScore += 7; });
  });
  
  // Calculate base score (starts at 5% for any message)
  const baseScore = 5;
  const messageBonus = Math.min(userMessages.length * 3, 15); // Max 15% from message count
  const depthBonus = Math.min(emotionalDepth, 25); // Max 25% from emotional depth
  const vulnerabilityBonus = Math.min(vulnerabilityScore, 25); // Max 25% from vulnerability
  const insightBonus = Math.min(insightScore, 30); // Max 30% from insights
  
  const totalScore = Math.min(baseScore + messageBonus + depthBonus + vulnerabilityBonus + insightBonus, 95);
  
  // Distribute across layers
  const layerProgress = {
    surface: Math.min(totalScore * 1.5, 100), // Surface fills faster
    trigger: Math.min(Math.max(0, totalScore - 10) * 1.3, 100),
    emotion: Math.min(Math.max(0, totalScore - 25) * 1.2, 100),
    coreBelief: Math.min(Math.max(0, totalScore - 45) * 1.5, 100),
  };
  
  return { score: totalScore, layerProgress };
}

// ============================================================================
// STRUCTURED TEXT PARSER
// Parses AI responses when they return formatted text instead of JSON
// ============================================================================

function parseStructuredTextResponse(text: string, userMessage: string): Record<string, string> | null {
  // Check if this looks like structured text (has **Field:** patterns)
  const hasStructuredFormat = /\*\*(\w+):\*\*/.test(text) || /(\w+):\s/.test(text);
  if (!hasStructuredFormat) return null;
  
  console.log('📝 Attempting to parse structured text response');
  
  const result: Record<string, string> = {};
  
  // Extract fields using patterns like **Field:** value or Field: value
  const fieldPatterns = {
    acknowledgment: /(?:\*\*)?acknowledgment(?:\*\*)?:\s*([^\n*]+(?:\n(?!\*\*\w+\*\*:)[^\n*]*)*)/i,
    thoughtPattern: /(?:\*\*)?thoughtPattern(?:\*\*)?:\s*([^\n*]+)/i,
    patternNote: /(?:\*\*)?patternNote(?:\*\*)?:\s*([^\n*]+(?:\n(?!\*\*\w+\*\*:)[^\n*]*)*)/i,
    reframe: /(?:\*\*)?reframe(?:\*\*)?:\s*([^\n*]+(?:\n(?!\*\*\w+\*\*:)[^\n*]*)*)/i,
    question: /(?:\*\*)?question(?:\*\*)?:\s*([^\n*]+(?:\n(?!\*\*\w+\*\*:)[^\n*]*)*)/i,
    encouragement: /(?:\*\*)?encouragement(?:\*\*)?:\s*([^\n*]+(?:\n(?!\*\*\w+\*\*:)[^\n*]*)*)/i,
    icebergLayer: /(?:\*\*)?icebergLayer(?:\*\*)?:\s*([^\n*]+)/i,
    layerInsight: /(?:\*\*)?layerInsight(?:\*\*)?:\s*([^\n*]+(?:\n(?!\*\*\w+\*\*:)[^\n*]*)*)/i,
  };
  
  for (const [field, pattern] of Object.entries(fieldPatterns)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result[field] = match[1].trim();
    }
  }
  
  // If we found at least 3 fields, consider it a successful parse
  const foundFields = Object.keys(result).length;
  console.log(`📝 Structured text parse found ${foundFields} fields`);
  
  if (foundFields >= 3) {
    // Fill in missing required fields using local analysis
    if (!result.acknowledgment) {
      const emotion = analyzeEmotion(userMessage);
      result.acknowledgment = `I hear you, and what you're sharing about feeling ${emotion.primary} really resonates. That sounds genuinely tough.`;
    }
    if (!result.thoughtPattern) {
      const distortion = detectDistortions(userMessage);
      result.thoughtPattern = distortion.type;
    }
    if (!result.patternNote) {
      const distortion = detectDistortions(userMessage);
      result.patternNote = distortion.explanation;
    }
    // No fallbacks - AI provides everything or we return null
    
    return result;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional - works for both signed-in and anonymous users)
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // Rate limiting - use user ID if authenticated, otherwise IP
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

    // Crisis detection - check for self-harm indicators
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

    console.log('=== Optimism Engine API ===');
    console.log('User message:', sanitizedMessage?.slice(0, 100));
    console.log('Authenticated:', isAuthenticated);
    
    // ============================================================================
    // SITUATION GATE - The minimal fix
    // Check if user is describing a person/situation BEFORE distortion detection
    // If they're describing reality, don't label it a "thinking error"
    // ============================================================================
    const isSituationMessage = isLikelySituationMessage(sanitizedMessage);
    console.log(`🧠 Situation message: ${isSituationMessage}`);
    
    // Calculate turn count and current layer
    const turnCount = Math.floor(conversationHistory.length / 2) + 1;
    const currentLayer = getCurrentLayer(conversationHistory.length);
    console.log(`Turn ${turnCount}, Layer: ${currentLayer}`);

    // AI is always available via z-ai-web-dev-sdk
    const configuredProvider = getConfiguredProvider();
    console.log(`Using AI provider: ${configuredProvider}`);
    
    try {
      // Build dynamic system prompt
      const systemPrompt = buildSystemPrompt(turnCount, currentLayer, sessionContext);
      console.log('System prompt length:', systemPrompt.length, 'chars');
      
      // Build messages for AI
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt }
      ];
      
      // Add conversation history (last 6 messages for context)
      // NO TRUNCATION - user's full story matters
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6);
        console.log('Adding conversation history:', recentHistory.length, 'messages');
        
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content || ''
          });
        });
      }
      
      // Add current message (NO TRUNCATION - let users share their full story)
      messages.push({ role: 'user', content: sanitizedMessage });
      
      const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
      console.log('Total messages to AI:', messages.length, 'Total chars:', totalChars);
      
      // Call AI with retry
      let aiResponse = await callAI(messages);
      
      // If first attempt fails, retry once
      if (!aiResponse?.content) {
        console.log('First AI call failed, retrying...');
        aiResponse = await callAI(messages);
      }
      
      if (!aiResponse?.content) {
        console.error('AI returned empty response after retry');
        return NextResponse.json({ 
          error: 'AI service is not responding. Please try again.' 
        }, { status: 502 });
      }
      
      console.log(`✅ AI response received from ${aiResponse.provider} (${aiResponse.model})`);
      console.log('AI Response length:', aiResponse.content.length);
      console.log('AI Response preview:', aiResponse.content.slice(0, 200));
      
      // Try to parse JSON - multiple strategies
      let parsed: Record<string, string> | null = null;
      const content = aiResponse.content;
      
      // Strategy 1: Direct JSON parse
      try {
        parsed = JSON.parse(content);
        console.log('✅ Parsed as direct JSON');
      } catch {
        // Strategy 2: Extract JSON from wrapped text
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ Parsed JSON from wrapped text');
          }
        } catch {
          // Strategy 3: Remove markdown code blocks and parse
          try {
            const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
              console.log('✅ Parsed JSON after removing markdown');
            }
          } catch {
            // Strategy 4: Try structured text parser (for **Field:** format)
            parsed = parseStructuredTextResponse(content, sanitizedMessage);
            if (parsed) {
              console.log('✅ Parsed as structured text format');
            }
          }
        }
      }
      
      // If all parsing failed, return error - let user retry
      if (!parsed) {
        console.log('⚠️ All parsing failed');
        return NextResponse.json({ 
          error: 'Could not process response. Please try again.' 
        }, { status: 500 });
      }
      
      // Map AI's field names to frontend expected names
      if (parsed.thoughtPattern && !parsed.distortionType) {
        parsed.distortionType = parsed.thoughtPattern;
      }
      if (parsed.patternNote && !parsed.distortionExplanation) {
        parsed.distortionExplanation = parsed.patternNote;
      }
      if (parsed.question && !parsed.probingQuestion) {
        parsed.probingQuestion = parsed.question;
      }
      
      // Just use what the AI provided - no fallbacks
      
      // Map new format to legacy fields for backward compatibility
      parsed.probingQuestion = parsed.question;
      
      // Return what AI gave us - nothing more
      return NextResponse.json({
        ...parsed,
        icebergLayer: currentLayer,
        _meta: { provider: aiResponse.provider, model: aiResponse.model, turn: turnCount }
      });
      
    } catch (aiError: unknown) {
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      console.error('AI provider failed:', errorMessage);
      return NextResponse.json({ 
        error: `AI service error: ${errorMessage}. Please try again.` 
      }, { status: 502 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to process thought' }, { status: 500 });
  }
}

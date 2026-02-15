// ============================================================================
// AI SERVICE - Multi-Provider with Fallback Chain
// 
// Default: z-ai-web-dev-sdk (works out of the box, no setup required)
// Optional: Configure your own API keys for more control and premium features
// 
// Supported Providers: Mistral, DeepSeek, Z.AI, Gemini, OpenAI, Anthropic, Groq, Together, OpenRouter
// ============================================================================

import ZAI from 'z-ai-web-dev-sdk';

// Types
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model?: string;
  tokensUsed?: number;
}

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export type AIProvider = 'openai' | 'anthropic' | 'groq' | 'together' | 'openrouter' | 'gemini' | 'mistral' | 'zai' | 'deepseek';

export interface AIServiceConfig {
  provider?: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

// ============================================================================
// Z.AI WEB DEV SDK - Default provider, works out of the box
// ============================================================================

async function callZAISdk(messages: AIMessage[]): Promise<AIResponse> {
  console.log('Calling z-ai-web-dev-sdk...');
  
  const zai = await ZAI.create();
  
  const completion = await zai.chat.completions.create({
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature: 0.8,
    max_tokens: 2000,
  });
  
  const content = completion.choices?.[0]?.message?.content || '';
  
  if (!content) {
    throw new Error('z-ai-web-dev-sdk returned empty content');
  }
  
  console.log('✅ z-ai-web-dev-sdk succeeded, length:', content.length);
  
  return {
    content,
    provider: 'z-ai-sdk',
    model: completion.model || 'default',
    tokensUsed: completion.usage?.total_tokens,
  };
}

// ============================================================================
// OPTIONAL PROVIDERS - Configure via environment variables for premium control
// ============================================================================

async function callOpenAI(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'gpt-4o';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'openai',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callAnthropic(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'claude-sonnet-4-20250514';
  
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemMessage,
      messages: conversationMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || '',
    provider: 'anthropic',
    model,
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
  };
}

async function callGroq(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'llama-3.3-70b-versatile';
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'groq',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callTogether(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  
  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Together AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'together',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callOpenRouter(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'anthropic/claude-3.5-sonnet';
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Optimism Engine',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'openrouter',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callGemini(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'gemini-2.0-flash';
  
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    provider: 'gemini',
    model,
  };
}

async function callMistral(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'mistral-small-latest';
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'mistral',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callDeepSeek(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'deepseek-chat';
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'deepseek',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

async function callZAI(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'glm-4';
  const baseUrl = config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Z.AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'zai',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

// ============================================================================
// MAIN AI SERVICE - Fallback chain with configurable providers
// ============================================================================

/**
 * Call AI with automatic provider detection and fallback
 * 
 * Priority:
 * 1. If a specific provider is configured via env, try those first
 * 2. Fall back to z-ai-web-dev-sdk (always available, works out of the box)
 * 
 * This gives buyers flexibility - works immediately, but they can configure
 * their own AI provider for more control.
 */
export async function callAI(
  messages: AIMessage[],
  config?: AIServiceConfig
): Promise<AIResponse | null> {
  console.log('=== AI Provider Selection ===');
  
  // If specific provider is requested via config, use it
  if (config?.provider && config?.apiKey) {
    const providerConfig: AIProviderConfig = {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    };

    try {
      switch (config.provider) {
        case 'openai':
          return await callOpenAI(messages, providerConfig);
        case 'anthropic':
          return await callAnthropic(messages, providerConfig);
        case 'groq':
          return await callGroq(messages, providerConfig);
        case 'together':
          return await callTogether(messages, providerConfig);
        case 'openrouter':
          return await callOpenRouter(messages, providerConfig);
        case 'gemini':
          return await callGemini(messages, providerConfig);
        case 'zai':
          return await callZAI(messages, providerConfig);
        case 'deepseek':
          return await callDeepSeek(messages, providerConfig);
        case 'mistral':
          return await callMistral(messages, providerConfig);
      }
    } catch (error) {
      console.error(`Configured provider ${config.provider} failed:`, error);
      // Fall through to env-based providers and SDK fallback
    }
  }

  // Try environment-configured providers first (for buyers who want their own AI)
  // Priority: Mistral > DeepSeek > Z.AI > Gemini > OpenAI > Anthropic > Groq > Together > OpenRouter
  
  console.log('Checking configured providers...');
  console.log('Mistral key:', !!process.env.MISTRAL_API_KEY);
  console.log('DeepSeek key:', !!process.env.DEEPSEEK_API_KEY);
  console.log('Z.AI key:', !!process.env.ZAI_API_KEY);
  console.log('Gemini key:', !!process.env.GEMINI_API_KEY);
  console.log('OpenAI key:', !!process.env.OPENAI_API_KEY);

  if (process.env.MISTRAL_API_KEY) {
    console.log('Trying Mistral...');
    try {
      const result = await callMistral(messages, {
        apiKey: process.env.MISTRAL_API_KEY,
        model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      });
      console.log('✅ Mistral succeeded');
      return result;
    } catch (e) {
      console.error('❌ Mistral failed, trying next provider:', e);
    }
  }

  if (process.env.DEEPSEEK_API_KEY) {
    console.log('Trying DeepSeek...');
    try {
      const result = await callDeepSeek(messages, {
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      });
      console.log('✅ DeepSeek succeeded');
      return result;
    } catch (e) {
      console.error('❌ DeepSeek failed, trying next provider:', e);
    }
  }

  if (process.env.ZAI_API_KEY) {
    console.log('Trying Z.AI...');
    try {
      const result = await callZAI(messages, {
        apiKey: process.env.ZAI_API_KEY,
        model: process.env.ZAI_MODEL || 'glm-4',
        baseUrl: process.env.ZAI_BASE_URL,
      });
      console.log('✅ Z.AI succeeded');
      return result;
    } catch (e) {
      console.error('❌ Z.AI failed, trying next provider:', e);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    console.log('Trying Gemini...');
    try {
      const result = await callGemini(messages, {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      });
      console.log('✅ Gemini succeeded');
      return result;
    } catch (e) {
      console.error('❌ Gemini failed, trying next provider:', e);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    console.log('Trying OpenAI...');
    try {
      const result = await callOpenAI(messages, {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
      });
      console.log('✅ OpenAI succeeded');
      return result;
    } catch (e) {
      console.error('❌ OpenAI failed, trying next provider:', e);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Trying Anthropic...');
    try {
      const result = await callAnthropic(messages, {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      });
      console.log('✅ Anthropic succeeded');
      return result;
    } catch (e) {
      console.error('❌ Anthropic failed, trying next provider:', e);
    }
  }

  if (process.env.GROQ_API_KEY) {
    console.log('Trying Groq...');
    try {
      const result = await callGroq(messages, {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      });
      console.log('✅ Groq succeeded');
      return result;
    } catch (e) {
      console.error('❌ Groq failed, trying next provider:', e);
    }
  }

  if (process.env.TOGETHER_API_KEY) {
    console.log('Trying Together AI...');
    try {
      const result = await callTogether(messages, {
        apiKey: process.env.TOGETHER_API_KEY,
        model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      });
      console.log('✅ Together AI succeeded');
      return result;
    } catch (e) {
      console.error('❌ Together AI failed, trying next provider:', e);
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    console.log('Trying OpenRouter...');
    try {
      const result = await callOpenRouter(messages, {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      });
      console.log('✅ OpenRouter succeeded');
      return result;
    } catch (e) {
      console.error('❌ OpenRouter failed, falling back to SDK:', e);
    }
  }

  // FALLBACK: z-ai-web-dev-sdk (always available, works out of the box)
  console.log('Falling back to z-ai-web-dev-sdk (built-in, no setup required)...');
  try {
    const result = await callZAISdk(messages);
    return result;
  } catch (e) {
    console.error('❌ z-ai-web-dev-sdk also failed:', e);
  }

  console.error('❌ All AI providers failed!');
  return null;
}

/**
 * Check if any AI provider is available
 * Always returns true because z-ai-web-dev-sdk is always available
 */
export function hasAIProvider(): boolean {
  return true;
}

/**
 * Get the name of the configured AI provider
 */
export function getConfiguredProvider(): string {
  if (process.env.MISTRAL_API_KEY) return 'Mistral AI';
  if (process.env.DEEPSEEK_API_KEY) return 'DeepSeek';
  if (process.env.ZAI_API_KEY) return 'Z.AI (GLM-4)';
  if (process.env.GEMINI_API_KEY) return 'Google Gemini';
  if (process.env.OPENAI_API_KEY) return 'OpenAI GPT';
  if (process.env.ANTHROPIC_API_KEY) return 'Anthropic Claude';
  if (process.env.GROQ_API_KEY) return 'Groq (LLaMA)';
  if (process.env.TOGETHER_API_KEY) return 'Together AI';
  if (process.env.OPENROUTER_API_KEY) return 'OpenRouter';
  return 'Z.AI SDK (Built-in)';
}

/**
 * Get list of all supported AI providers
 * Useful for showing buyers what options they have
 */
export function getSupportedProviders(): Array<{
  name: string;
  envKey: string;
  defaultModel: string;
  tier: string;
  website: string;
}> {
  return [
    { 
      name: 'Z.AI SDK (Built-in)', 
      envKey: 'No setup required', 
      defaultModel: 'auto', 
      tier: 'Always Free',
      website: 'https://z.ai'
    },
    { 
      name: 'Mistral AI', 
      envKey: 'MISTRAL_API_KEY', 
      defaultModel: 'mistral-small-latest', 
      tier: 'Free Tier Available',
      website: 'https://console.mistral.ai'
    },
    { 
      name: 'DeepSeek', 
      envKey: 'DEEPSEEK_API_KEY', 
      defaultModel: 'deepseek-chat', 
      tier: 'FREE $5 Credit',
      website: 'https://platform.deepseek.com'
    },
    { 
      name: 'Z.AI (GLM-4)', 
      envKey: 'ZAI_API_KEY', 
      defaultModel: 'glm-4', 
      tier: 'Free Tier Available',
      website: 'https://open.bigmodel.cn'
    },
    { 
      name: 'Google Gemini', 
      envKey: 'GEMINI_API_KEY', 
      defaultModel: 'gemini-2.0-flash', 
      tier: 'Free Tier Available',
      website: 'https://aistudio.google.com'
    },
    { 
      name: 'OpenAI GPT-4', 
      envKey: 'OPENAI_API_KEY', 
      defaultModel: 'gpt-4o', 
      tier: 'Premium',
      website: 'https://platform.openai.com'
    },
    { 
      name: 'Anthropic Claude', 
      envKey: 'ANTHROPIC_API_KEY', 
      defaultModel: 'claude-sonnet-4-20250514', 
      tier: 'Premium',
      website: 'https://console.anthropic.com'
    },
    { 
      name: 'Groq (LLaMA)', 
      envKey: 'GROQ_API_KEY', 
      defaultModel: 'llama-3.3-70b-versatile', 
      tier: 'Fast & Free Tier',
      website: 'https://console.groq.com'
    },
    { 
      name: 'Together AI', 
      envKey: 'TOGETHER_API_KEY', 
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 
      tier: 'Pay-per-use',
      website: 'https://api.together.xyz'
    },
    { 
      name: 'OpenRouter', 
      envKey: 'OPENROUTER_API_KEY', 
      defaultModel: 'anthropic/claude-3.5-sonnet', 
      tier: '100+ Models',
      website: 'https://openrouter.ai'
    },
  ];
}

/**
 * DeepSeek API Client (Reusable)
 * Simple, isolated client for LLM operations
 */

import OpenAI from 'openai';

// Lazy-load client to avoid build-time errors
let deepseek: OpenAI | null = null;

function getClient(): OpenAI {
  if (!deepseek) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    deepseek = new OpenAI({
      apiKey,
      baseURL,
    });
  }
  return deepseek;
}

export type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface DeepSeekOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Chat completion with DeepSeek
 */
export async function deepseekChat(
  messages: DeepSeekMessage[],
  options: DeepSeekOptions = {}
): Promise<string> {
  const model = options.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 2000;

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('DeepSeek API error:', error);
    throw new Error('Failed to get response from DeepSeek API');
  }
}

/**
 * Chat completion with JSON response (forces JSON output)
 */
export async function deepseekChatJSON(
  messages: DeepSeekMessage[],
  options: DeepSeekOptions = {}
): Promise<string> {
  // Add JSON instruction to system message if not present
  const systemMessages = messages.filter(m => m.role === 'system');
  const hasJsonInstruction = systemMessages.some(m => 
    m.content.toLowerCase().includes('json') || 
    m.content.toLowerCase().includes('respond only')
  );

  const enhancedMessages: DeepSeekMessage[] = hasJsonInstruction
    ? messages
    : [
        {
          role: 'system',
          content: 'You MUST return valid JSON only. No markdown. No commentary. No extra text.',
        },
        ...messages,
      ];

  return deepseekChat(enhancedMessages, options);
}


import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'alloy' } = body as { text: string; voice?: string };

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const zai = await ZAI.create();
    const response = await zai.audio.speech.create({
      input: text,
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    });

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({ audio: base64, format: 'mp3' });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}

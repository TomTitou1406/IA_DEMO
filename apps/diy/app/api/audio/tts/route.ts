import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Texte manquant' },
        { status: 400 }
      );
    }

    const mp3 = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',  // ← Nouveau modèle steerable
      voice: 'coral',
      input: text,
      instructions: "Parle calmement et posément, comme un ami patient qui explique du bricolage avec passion. Prends ton temps, tu es là pour aider, mais ne traîne pas trop ! De l'énergie quand même.",
      speed: 1.0  // Ralentir légèrement (0.25 à 4.0, défaut = 1.0)
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Error in TTS API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synthèse vocale' },
      { status: 500 }
    );
  }
}

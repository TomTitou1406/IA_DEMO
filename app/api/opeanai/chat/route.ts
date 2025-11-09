/**
 * @file /app/api/openai/chat/route.ts
 * @version 1.0
 * @description API route pour conversation chat avec OpenAI
 * 
 * Usage:
 * POST /api/openai/chat
 * Body: {
 *   promptKey: string,
 *   messages: ChatMessage[],
 *   contextId?: string,
 *   variables?: Record<string, string>,
 *   userId?: string,
 *   conversationId?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/app/lib/services/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

interface RequestBody {
  promptKey: string;
  messages: ChatMessage[];
  contextId?: string;
  variables?: Record<string, string>;
  userId?: string;
  conversationId?: string;
  model?: string;
  temperature?: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 API /openai/chat - Début');
    
    // 1. Parser le body
    const body: RequestBody = await request.json();
    
    const {
      promptKey,
      messages,
      contextId,
      variables = {},
      userId,
      conversationId,
      model,
      temperature,
    } = body;
    
    // 2. Validation
    if (!promptKey) {
      return NextResponse.json(
        { success: false, error: 'promptKey requis' },
        { status: 400 }
      );
    }
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'messages requis' },
        { status: 400 }
      );
    }
    
    console.log('📋 Requête validée:', {
      promptKey,
      nbMessages: messages.length,
      userId,
      conversationId
    });
    
    // 3. Construire le contexte de conversation pour OpenAI
    // On prend les N derniers messages pour ne pas dépasser les tokens
    const MAX_HISTORY_MESSAGES = 10;
    const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    
    // Formater l'historique pour le prompt
    const conversationHistory = recentMessages
      .map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    // 4. Préparer les variables pour le prompt
    const promptVariables = {
      ...variables,
      conversation_history: conversationHistory,
      last_user_message: messages[messages.length - 1]?.content || '',
    };
    
    console.log('🔄 Historique:', {
      totalMessages: messages.length,
      sentMessages: recentMessages.length
    });
    
    // 5. Appeler OpenAI
    const response = await callOpenAI({
      promptKey,
      variables: promptVariables,
      model,
      temperature,
      userId,
      metadata: {
        conversation_id: conversationId,
        context_id: contextId,
        nb_messages: messages.length,
      },
    });
    
    // 6. Vérifier la réponse
    if (!response.success) {
      console.error('❌ Erreur OpenAI:', response.error);
      return NextResponse.json(
        { 
          success: false, 
          error: response.error || 'Erreur lors de l\'appel OpenAI' 
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Réponse OpenAI:', {
      tokens: response.usage.totalTokens,
      cost: `$${response.cost.toFixed(6)}`,
      model: response.model
    });
    
    // 7. Retourner la réponse
    return NextResponse.json({
      success: true,
      content: response.content,
      usage: response.usage,
      cost: response.cost,
      model: response.model,
    });
    
  } catch (error) {
    console.error('❌ Erreur API /openai/chat:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur interne' 
      },
      { status: 500 }
    );
  }
}

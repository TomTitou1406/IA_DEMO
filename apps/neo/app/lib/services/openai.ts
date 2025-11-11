/**
 * @file openai.ts
 * @version 1.0
 * @description Service centralisé pour toutes les interactions OpenAI
 */

import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// TYPES
// ============================================

export interface PromptConfig {
  promptKey: string;
  variables?: Record<string, string>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  success: boolean;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  model: string;
  error?: string;
}

interface PromptData {
  id: string;
  prompt_key: string;
  prompt_type: string;
  system_prompt: string;
  user_prompt_template: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  examples: any[] | null;
}

// ============================================
// RÉCUPÉRER UN PROMPT DEPUIS LA BDD
// ============================================

export async function getPrompt(promptKey: string): Promise<PromptData> {
  console.log('📥 Récupération prompt:', promptKey);
  
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('prompt_key', promptKey)
    .eq('is_active', true)
    .single();
    
  if (error) {
    console.error('❌ Erreur récupération prompt:', error);
    throw new Error(`Prompt ${promptKey} non trouvé: ${error.message}`);
  }
  
  if (!data) {
    throw new Error(`Prompt ${promptKey} non trouvé`);
  }
  
  console.log('✅ Prompt chargé:', {
    key: data.prompt_key,
    type: data.prompt_type,
    model: data.model
  });
  
  return data as PromptData;
}

// ============================================
// INTERPOLER LES VARIABLES DANS UN TEMPLATE
// ============================================

function interpolateTemplate(
  template: string, 
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || '';
  });
}

// ============================================
// CALCULER LE COÛT APPROXIMATIF
// ============================================

function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Prix en $ par 1K tokens (mis à jour novembre 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };
  
  const prices = pricing[model] || pricing['gpt-4o-mini'];
  
  const cost = (
    (promptTokens / 1000) * prices.input +
    (completionTokens / 1000) * prices.output
  );
  
  return Math.round(cost * 1000000) / 1000000; // 6 décimales
}

// ============================================
// LOGGER L'UTILISATION DANS LA BDD
// ============================================

async function logAIUsage(
  promptKey: string,
  model: string,
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  },
  cost: number,
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('ai_usage_logs').insert({
      prompt_key: promptKey,
      user_id: userId || null,
      model: model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      estimated_cost: cost,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    });
    
    console.log('💾 Usage loggé:', {
      prompt: promptKey,
      tokens: usage.totalTokens,
      cost: `$${cost.toFixed(6)}`
    });
  } catch (error) {
    console.error('⚠️ Erreur log usage:', error);
    // Ne pas bloquer si le log échoue
  }
}

// ============================================
// APPEL PRINCIPAL OPENAI
// ============================================

export async function callOpenAI(
  config: PromptConfig
): Promise<AIResponse> {
  
  try {
    console.log('🤖 Appel OpenAI:', config.promptKey);
    
    // 1. Récupérer le prompt depuis la BDD
    const promptData = await getPrompt(config.promptKey);
    
    // 2. Préparer le system prompt
    const systemPrompt = config.variables
      ? interpolateTemplate(promptData.system_prompt, config.variables)
      : promptData.system_prompt;
    
    // 3. Préparer le user prompt
    let userPrompt = '';
    if (promptData.user_prompt_template) {
      userPrompt = config.variables
        ? interpolateTemplate(promptData.user_prompt_template, config.variables)
        : promptData.user_prompt_template;
    }
    
    // 4. Construire les messages
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Ajouter examples si présents (few-shot)
    if (promptData.examples && Array.isArray(promptData.examples)) {
      for (const example of promptData.examples) {
        messages.push(
          { role: 'user', content: example.input },
          { role: 'assistant', content: example.output }
        );
      }
    }
    
    // Ajouter le user prompt
    if (userPrompt) {
      messages.push({ role: 'user', content: userPrompt });
    }
    
    console.log('📤 Messages envoyés:', messages.length);
    
    // 5. Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: config.model || promptData.model,
      messages,
      temperature: config.temperature ?? promptData.temperature,
      max_tokens: config.maxTokens ?? promptData.max_tokens,
    });
    
    // 6. Calculer le coût
    const usage = completion.usage!;
    const cost = calculateCost(
      completion.model,
      usage.prompt_tokens,
      usage.completion_tokens
    );
    
    console.log('✅ Réponse reçue:', {
      tokens: usage.total_tokens,
      cost: `$${cost.toFixed(6)}`
    });
    
    // 7. Logger l'utilisation
    await logAIUsage(
      config.promptKey,
      completion.model,
      {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost,
      config.userId,
      config.metadata
    );
    
    // 8. Retourner la réponse
    return {
      success: true,
      content: completion.choices[0].message.content || '',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost,
      model: completion.model,
    };
    
  } catch (error) {
    console.error('❌ Erreur OpenAI:', error);
    
    return {
      success: false,
      content: '',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      cost: 0,
      model: '',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

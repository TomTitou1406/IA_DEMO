import { createClient } from '@/app/lib/supabaseClient';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/**
 * Détecte si un message de l'assistant contient une phrase de validation
 */
export function isValidationMessage(message: string): boolean {
  const content = message.toLowerCase();
  return content.includes("tout ce qu'il me faut sur") || 
         content.includes("j'ai tout ce qu'il faut sur") ||
         content.includes("parfait pour") ||
         content.includes("c'est noté pour");
}

/**
 * Extrait le segment de conversation depuis la dernière validation
 */
export function extractSegmentData(chatHistory: ChatMessage[]): string {
  // Trouver l'index de la dernière validation (excluant le message actuel)
  const lastValidationIndex = chatHistory.findLastIndex(
    (m, idx) => idx < chatHistory.length - 1 &&
                m.role === 'assistant' &&
                isValidationMessage(m.content)
  );

  // Segment = depuis dernière validation (ou début) jusqu'à maintenant
  const segmentStart = lastValidationIndex >= 0 ? lastValidationIndex + 1 : 0;
  const segment = chatHistory.slice(segmentStart, -1); // Exclure message actuel

  // Extraire uniquement les messages USER
  const userData = segment
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n\n');

  return userData.trim();
}

/**
 * Détecte et sauvegarde automatiquement les données validées
 */
export async function detectAndSaveValidation(
  lastMessage: ChatMessage,
  chatHistory: ChatMessage[],
  contextId: string,
  entityId: string,
  targetTable: 'entreprises' | 'postes'
): Promise<{ success: boolean; field?: string; error?: string }> {
  
  const supabase = createClient();
  const content = lastMessage.content.toLowerCase();

  // 1. Vérifier que c'est une validation
  if (!isValidationMessage(content)) {
    return { success: false, error: 'Not a validation message' };
  }

  // 2. Charger les steps du contexte
  const { data: steps, error: stepsError } = await supabase
    .from('conversation_steps')
    .select('step_key, target_field, validation_keywords, data_type')
    .eq('context_id', contextId)
    .not('target_field', 'is', null)
    .order('step_order');

  if (stepsError || !steps) {
    console.error('❌ Erreur chargement steps:', stepsError);
    return { success: false, error: 'Failed to load steps' };
  }

  // 3. Trouver le step validé en cherchant les mots-clés
  const validatedStep = steps.find(step =>
    step.validation_keywords?.some((keyword: string) => 
      content.includes(keyword.toLowerCase())
    )
  );

  if (!validatedStep) {
    console.log('⚠️ Aucun step détecté pour:', content.substring(0, 100));
    return { success: false, error: 'No matching step found' };
  }

  console.log(`✅ Step détecté: ${validatedStep.step_key} → ${validatedStep.target_field}`);

  // 4. Extraire segment de conversation
  const userData = extractSegmentData(chatHistory);

  if (!userData) {
    console.log('⚠️ Aucune donnée user dans le segment');
    return { success: false, error: 'No user data in segment' };
  }

  // 5. Sauvegarder dans la table target
  const updates: any = {
    [validatedStep.target_field]: userData,
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from(targetTable)
    .update(updates)
    .eq('id', entityId);

  if (updateError) {
    console.error('❌ Erreur sauvegarde:', updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`✅ Champ ${validatedStep.target_field} sauvegardé (${userData.length} caractères)`);
  
  return { 
    success: true, 
    field: validatedStep.target_field 
  };
}

/**
 * Calcule la progression depuis la BDD
 */
export async function calculateProgressionFromDB(
  contextId: string,
  entityId: string,
  targetTable: 'entreprises' | 'postes'
): Promise<{
  completed: number;
  total: number;
  percentage: number;
  fields: Record<string, boolean>;
}> {
  
  const supabase = createClient();

  // 1. Charger les steps requis
  const { data: steps } = await supabase
    .from('conversation_steps')
    .select('step_key, target_field')
    .eq('context_id', contextId)
    .eq('is_required', true)
    .not('target_field', 'is', null)
    .order('step_order');

  if (!steps) {
    return { completed: 0, total: 0, percentage: 0, fields: {} };
  }

  // 2. Charger l'entité
  const { data: entity } = await supabase
    .from(targetTable)
    .select('*')
    .eq('id', entityId)
    .single();

  if (!entity) {
    return { completed: 0, total: steps.length, percentage: 0, fields: {} };
  }

  // 3. Vérifier quels champs sont remplis
  const fields: Record<string, boolean> = {};
  let completed = 0;

  steps.forEach(step => {
    const value = entity[step.target_field];
    const isCompleted = value && (
      typeof value === 'string' ? value.trim().length > 0 :
      Array.isArray(value) ? value.length > 0 :
      value !== null
    );
    
    fields[step.step_key] = isCompleted;
    if (isCompleted) completed++;
  });

  const percentage = Math.round((completed / steps.length) * 100);

  return {
    completed,
    total: steps.length,
    percentage,
    fields
  };
}

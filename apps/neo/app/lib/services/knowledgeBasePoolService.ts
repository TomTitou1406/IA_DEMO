/**
 * @file knowledgeBasePoolService.ts
 * @version v0.01
 * @date 30 octobre 2025
 * @description Service minimal pour gérer le pool de Knowledge Bases HeyGen
 */

import { supabase } from '@/app/lib/supabaseClient';

// ============================================
// TYPES
// ============================================

export type KBType = 'decouverte' | 'preselection' | 'selection';
export type KBSpecialty = 'generique' | 'commerce' | 'it' | 'rh';
export type KBStatus = 'available' | 'in_use' | 'error';

export interface KnowledgeBasePool {
  id: string;
  kb_type: KBType;
  kb_specialty: KBSpecialty;
  heygen_kb_id: string;
  heygen_kb_name: string | null;
  useful_links: string[];
  status: KBStatus;
  poste_id: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// FONCTION 1 : Récupérer une KB disponible
// ============================================

/**
 * Récupère une KB disponible du stock
 * @param type Type de KB recherchée
 * @param specialty Spécialité (optionnel, par défaut 'generique')
 * @returns KB disponible ou null si aucune dispo
 */
export async function getAvailableKB(
  type: KBType,
  specialty: KBSpecialty = 'generique'
): Promise<KnowledgeBasePool | null> {
  const { data, error } = await supabase
    .from('knowledge_bases_pool')
    .select('*')
    .eq('kb_type', type)
    .eq('kb_specialty', specialty)
    .eq('status', 'available')
    .is('poste_id', null)
    .limit(1)
    .single();

  if (error) {
    console.error(`❌ Erreur récupération KB ${type}:`, error);
    return null;
  }

  return data;
}

// ============================================
// FONCTION 2 : Marquer une KB comme utilisée
// ============================================

/**
 * Assigne une KB à un poste
 * @param kbId ID de la KB dans la pool
 * @param posteId ID du poste
 */
export async function assignKBToPoste(
  kbId: string,
  posteId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('knowledge_bases_pool')
    .update({
      status: 'in_use',
      poste_id: posteId,
      assigned_at: new Date().toISOString(),
    })
    .eq('id', kbId);

  if (error) {
    console.error(`❌ Erreur assignation KB:`, error);
    return false;
  }

  console.log(`✅ KB ${kbId} assignée au poste ${posteId}`);
  return true;
}

// ============================================
// FONCTION 3 : Libérer une KB
// ============================================

/**
 * Libère une KB pour la remettre dans le pool disponible
 * @param kbId ID de la KB dans la pool
 */
export async function releaseKB(kbId: string): Promise<boolean> {
  const { error } = await supabase
    .from('knowledge_bases_pool')
    .update({
      status: 'available',
      poste_id: null,
      assigned_at: null,
    })
    .eq('id', kbId);

  if (error) {
    console.error(`❌ Erreur libération KB:`, error);
    return false;
  }

  console.log(`✅ KB ${kbId} libérée`);
  return true;
}

// ============================================
// FONCTION 4 : Récupérer les KB d'un poste
// ============================================

/**
 * Récupère toutes les KB assignées à un poste
 * @param posteId ID du poste
 */
export async function getPosteKBs(
  posteId: string
): Promise<KnowledgeBasePool[]> {
  const { data, error } = await supabase
    .from('knowledge_bases_pool')
    .select('*')
    .eq('poste_id', posteId);

  if (error) {
    console.error(`❌ Erreur récupération KB du poste:`, error);
    return [];
  }

  return data || [];
}

// ============================================
// FONCTION 5 : Vérifier la disponibilité du stock
// ============================================

/**
 * Compte les KB disponibles par type
 */
export async function checkKBAvailability(): Promise<{
  decouverte: number;
  preselection: number;
  selection: number;
}> {
  const types: KBType[] = ['decouverte', 'preselection', 'selection'];
  const result = { decouverte: 0, preselection: 0, selection: 0 };

  for (const type of types) {
    const { count, error } = await supabase
      .from('knowledge_bases_pool')
      .select('*', { count: 'exact', head: true })
      .eq('kb_type', type)
      .eq('status', 'available');

    if (!error && count !== null) {
      result[type] = count;
    }
  }

  return result;
}

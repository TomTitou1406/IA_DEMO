/**
 * phasageService.ts
 * 
 * Service de phasage automatique des chantiers
 * Génère les lots de travaux à partir des informations collectées
 * 
 * @version 1.0
 * @date 29 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface ReglePhasage {
  code: string;
  titre: string;
  type_regle: 'dependance' | 'alerte' | 'conseil' | 'interdit';
  description: string;
  message_ia: string;
  categorie?: string;
  priorite: number;
}

export interface AlerteCritique {
  code: string;
  titre: string;
  niveau: 'delicat' | 'critique' | 'interdit';
  message_alerte: string;
}

export interface LotGenere {
  ordre: number;
  titre: string;
  description: string;
  code_expertise: string;
  niveau_requis: 'debutant' | 'intermediaire' | 'confirme';
  duree_estimee_heures: number;
  cout_estime: number;
  prerequis_stricts: number[];
  points_attention?: string;
  dependances_type: 'sequentiel' | 'parallele';
}

export interface ResultatPhasage {
  ready_for_phasage: boolean;
  analyse: string;
  lots: LotGenere[];
  alertes: Array<{
    type: 'critique' | 'attention' | 'conseil';
    message: string;
  }>;
  budget_total_estime: number;
  duree_totale_estimee_heures: number;
}

// ==================== CHARGEMENT DES RÈGLES ====================

/**
 * Charge toutes les règles de phasage actives
 */
export async function loadReglesPhasage(): Promise<ReglePhasage[]> {
  const { data, error } = await supabase
    .from('regles_phasage')
    .select('code, titre, type_regle, description, message_ia, categorie, priorite')
    .eq('est_active', true)
    .order('priorite', { ascending: true });

  if (error) {
    console.error('Erreur chargement règles phasage:', error);
    return [];
  }

  return data || [];
}

/**
 * Charge toutes les alertes critiques
 */
export async function loadAlertesCritiques(): Promise<AlerteCritique[]> {
  const { data, error } = await supabase
    .from('alertes_critiques')
    .select('code, titre, niveau, message_alerte');

  if (error) {
    console.error('Erreur chargement alertes critiques:', error);
    return [];
  }

  return data || [];
}

/**
 * Formate les règles pour injection dans le prompt
 */
export function formatReglesForPrompt(regles: ReglePhasage[]): string {
  const dependances = regles.filter(r => r.type_regle === 'dependance');
  const alertes = regles.filter(r => r.type_regle === 'alerte');
  const conseils = regles.filter(r => r.type_regle === 'conseil');
  const interdits = regles.filter(r => r.type_regle === 'interdit');

  let result = '';

  if (interdits.length > 0) {
    result += '### INTERDITS (ne jamais proposer)\n';
    interdits.forEach(r => {
      result += `- ${r.titre} : ${r.message_ia || r.description}\n`;
    });
    result += '\n';
  }

  if (dependances.length > 0) {
    result += '### ORDRE DES TRAVAUX (dépendances obligatoires)\n';
    dependances.forEach(r => {
      result += `- ${r.titre} : ${r.message_ia || r.description}\n`;
    });
    result += '\n';
  }

  if (alertes.length > 0) {
    result += '### ALERTES SÉCURITÉ\n';
    alertes.forEach(r => {
      result += `- ${r.titre} : ${r.message_ia || r.description}\n`;
    });
    result += '\n';
  }

  if (conseils.length > 0) {
    result += '### BONNES PRATIQUES\n';
    conseils.forEach(r => {
      result += `- ${r.titre} : ${r.message_ia || r.description}\n`;
    });
  }

  return result;
}

// ==================== SAUVEGARDE DES LOTS ====================

/**
 * Sauvegarde les lots générés dans la table travaux
 */
export async function saveLots(chantierId: string, lots: LotGenere[]): Promise<boolean> {
  try {
    // Préparer les données pour insertion
    const lotsToInsert = lots.map(lot => ({
      chantier_id: chantierId,
      titre: lot.titre,
      description: lot.description,
      ordre: lot.ordre,
      code_expertise: lot.code_expertise,
      niveau_difficulte: lot.niveau_requis === 'debutant' ? 1 : lot.niveau_requis === 'intermediaire' ? 2 : 3,
      niveau_requis: lot.niveau_requis,
      duree_estimee_heures: lot.duree_estimee_heures,
      cout_estime: lot.cout_estime,
      prerequis_stricts: lot.prerequis_stricts,
      points_attention: lot.points_attention,
      dependances_type: lot.dependances_type,
      statut: 'a_venir',
      progression: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('travaux')
      .insert(lotsToInsert);

    if (error) {
      console.error('Erreur sauvegarde lots:', error);
      return false;
    }

    // Mettre à jour le statut du chantier
    await supabase
      .from('chantiers')
      .update({ 
        statut: 'en_cours',
        updated_at: new Date().toISOString()
      })
      .eq('id', chantierId);

    console.log(`✅ ${lots.length} lots sauvegardés pour le chantier ${chantierId}`);
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde lots:', error);
    return false;
  }
}

/**
 * Supprime les lots existants d'un chantier (pour re-phasage)
 */
export async function deleteLots(chantierId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('travaux')
      .delete()
      .eq('chantier_id', chantierId);

    if (error) {
      console.error('Erreur suppression lots:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur suppression lots:', error);
    return false;
  }
}

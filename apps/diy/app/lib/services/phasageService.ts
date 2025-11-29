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
 * Sauvegarde les lots générés en BDD
 * @param chantierId - ID du chantier
 * @param lots - Lots à sauvegarder
 * @param statut - 'brouillon' ou 'à_venir' (défaut: 'à_venir')
 */
export async function saveLots(
  chantierId: string, 
  lots: LotGenere[],
  statut: 'brouillon' | 'à_venir' = 'à_venir'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Préparer les données
    const travauxData = lots.map((lot) => ({
      chantier_id: chantierId,
      titre: lot.titre,
      description: lot.description,
      ordre: lot.ordre,
      niveau: 'lot',
      code_expertise: lot.code_expertise,
      niveau_requis: lot.niveau_requis,
      duree_estimee_heures: lot.duree_estimee_heures,
      cout_estime: lot.cout_estime,
      prerequis_stricts: lot.prerequis_stricts || [],
      points_attention: lot.points_attention || null,
      statut: statut,
      progression: 0,
    }));

    // Insérer les lots
    const { error } = await supabase.from('travaux').insert(travauxData);

    if (error) throw error;

    // Mettre à jour le statut du chantier seulement si on valide (pas brouillon)
    if (statut === 'à_venir') {
      await supabase
        .from('chantiers')
        .update({ 
          statut: 'en_cours',
          updated_at: new Date().toISOString()
        })
        .eq('id', chantierId);
    }

    return { success: true };
  } catch (err) {
    console.error('Erreur sauvegarde lots:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

/**
 * Vérifie si un chantier a des lots en brouillon
 */
export async function hasBrouillon(chantierId: string): Promise<boolean> {
  const { data } = await supabase
    .from('travaux')
    .select('id')
    .eq('chantier_id', chantierId)
    .eq('statut', 'brouillon')
    .limit(1);
  
  return (data && data.length > 0);
}

/**
 * Charge les lots brouillon d'un chantier
 */
export async function loadBrouillon(chantierId: string): Promise<LotGenere[]> {
  const { data, error } = await supabase
    .from('travaux')
    .select('*')
    .eq('chantier_id', chantierId)
    .eq('statut', 'brouillon')
    .order('ordre');

  if (error || !data) return [];

  return data.map((t) => ({
    ordre: t.ordre,
    titre: t.titre,
    description: t.description || '',
    code_expertise: t.code_expertise || 'generaliste',
    niveau_requis: t.niveau_requis || 'intermediaire',
    duree_estimee_heures: t.duree_estimee_heures || 0,
    cout_estime: t.cout_estime || 0,
    prerequis_stricts: t.prerequis_stricts || [],
    points_attention: t.points_attention,
    dependances_type: 'sequentiel',
  }));
}

/**
 * Valide les lots brouillon (passe de brouillon à à_venir)
 */
export async function validerBrouillon(chantierId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Mettre à jour les lots
    const { error: lotsError } = await supabase
      .from('travaux')
      .update({ statut: 'à_venir' })
      .eq('chantier_id', chantierId)
      .eq('statut', 'brouillon');

    if (lotsError) throw lotsError;

    // Mettre à jour le chantier
    const { error: chantierError } = await supabase
      .from('chantiers')
      .update({ 
        statut: 'en_cours',
        updated_at: new Date().toISOString()
      })
      .eq('id', chantierId);

    if (chantierError) throw chantierError;

    return { success: true };
  } catch (err) {
    console.error('Erreur validation brouillon:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

/**
 * Supprime les lots d'un chantier
 * @param chantierId - ID du chantier
 * @param statut - Si fourni, ne supprime que les lots avec ce statut
 */
export async function deleteLots(
  chantierId: string,
  statut?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabase
      .from('travaux')
      .delete()
      .eq('chantier_id', chantierId)
      .eq('niveau', 'lot');
    
    if (statut) {
      query = query.eq('statut', statut);
    }

    const { error } = await query;

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Erreur suppression lots:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

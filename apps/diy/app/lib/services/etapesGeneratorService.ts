/**
 * etapesGeneratorService.ts
 * 
 * Service de génération des étapes pour un lot de travaux
 * Gère la preview, modification et validation des étapes générées
 * 
 * @version 1.0
 * @date 02 décembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface EtapeGeneree {
  numero: number;
  titre: string;
  description: string;
  instructions?: string;
  duree_estimee_minutes: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  outils_necessaires: string[];
  materiaux_necessaires: { nom: string; quantite: string; unite: string }[];
  precautions?: string;
  conseils_pro?: string;
}

export interface ResultatGeneration {
  etapes: EtapeGeneree[];
  duree_totale_estimee_minutes: number;
  conseils_generaux?: string;
}

// ==================== CHARGEMENT ====================

/**
 * Charge les étapes brouillon d'un lot
 */
export async function loadEtapesBrouillon(travailId: string): Promise<EtapeGeneree[]> {
  const { data, error } = await supabase
    .from('etapes')
    .select('*')
    .eq('travail_id', travailId)
    .eq('statut', 'brouillon')
    .order('numero');

  if (error || !data) return [];

  return data.map((e) => ({
    numero: e.numero,
    titre: e.titre,
    description: e.description || '',
    instructions: e.instructions,
    duree_estimee_minutes: e.duree_estimee_minutes || 0,
    difficulte: e.difficulte || 'moyen',
    outils_necessaires: e.outils_necessaires || [],
    materiaux_necessaires: e.materiaux_necessaires || [],
    precautions: e.precautions,
    conseils_pro: e.conseils_pro,
  }));
}

/**
 * Charge les étapes validées d'un lot
 */
export async function loadEtapesValidees(travailId: string): Promise<EtapeGeneree[]> {
  const { data, error } = await supabase
    .from('etapes')
    .select('*')
    .eq('travail_id', travailId)
    .neq('statut', 'brouillon')
    .order('numero');

  if (error || !data) return [];

  return data.map((e) => ({
    numero: e.numero,
    titre: e.titre,
    description: e.description || '',
    instructions: e.instructions,
    duree_estimee_minutes: e.duree_estimee_minutes || 0,
    difficulte: e.difficulte || 'moyen',
    outils_necessaires: e.outils_necessaires || [],
    materiaux_necessaires: e.materiaux_necessaires || [],
    precautions: e.precautions,
    conseils_pro: e.conseils_pro,
  }));
}

/**
 * Vérifie si un lot a des étapes brouillon
 */
export async function hasBrouillon(travailId: string): Promise<boolean> {
  const { data } = await supabase
    .from('etapes')
    .select('id')
    .eq('travail_id', travailId)
    .eq('statut', 'brouillon')
    .limit(1);
  
  return data !== null && data.length > 0;
}

/**
 * Vérifie si un lot a des étapes validées
 */
export async function hasEtapesValidees(travailId: string): Promise<boolean> {
  const { data } = await supabase
    .from('etapes')
    .select('id')
    .eq('travail_id', travailId)
    .neq('statut', 'brouillon')
    .limit(1);
  
  return data !== null && data.length > 0;
}

// ==================== SAUVEGARDE ====================

/**
 * Sauvegarde les étapes en brouillon
 */
export async function saveEtapesBrouillon(
  travailId: string, 
  etapes: EtapeGeneree[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Supprimer les anciens brouillons
    await supabase
      .from('etapes')
      .delete()
      .eq('travail_id', travailId)
      .eq('statut', 'brouillon');

    // Insérer les nouveaux
    const etapesData = etapes.map((etape, index) => ({
      travail_id: travailId,
      numero: etape.numero || index + 1,
      titre: etape.titre,
      description: etape.description,
      instructions: etape.instructions || null,
      duree_estimee_minutes: etape.duree_estimee_minutes,
      difficulte: etape.difficulte,
      outils_necessaires: etape.outils_necessaires || [],
      materiaux_necessaires: etape.materiaux_necessaires || [],
      precautions: etape.precautions || null,
      conseils_pro: etape.conseils_pro || null,
      statut: 'brouillon',
      progression: 0,
      ordre: etape.numero || index + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('etapes').insert(etapesData);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Erreur sauvegarde étapes brouillon:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

/**
 * Valide les étapes (brouillon → à_venir)
 */
export async function validerEtapes(
  travailId: string,
  etapes?: EtapeGeneree[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Si des étapes sont fournies, on les sauvegarde d'abord
    if (etapes && etapes.length > 0) {
      // Supprimer toutes les étapes existantes (brouillon ou non)
      await supabase
        .from('etapes')
        .delete()
        .eq('travail_id', travailId);

      // Insérer les nouvelles avec statut à_venir
      const etapesData = etapes.map((etape, index) => ({
        travail_id: travailId,
        numero: etape.numero || index + 1,
        titre: etape.titre,
        description: etape.description,
        instructions: etape.instructions || null,
        duree_estimee_minutes: etape.duree_estimee_minutes,
        difficulte: etape.difficulte,
        outils_necessaires: etape.outils_necessaires || [],
        materiaux_necessaires: etape.materiaux_necessaires || [],
        precautions: etape.precautions || null,
        conseils_pro: etape.conseils_pro || null,
        statut: 'à_venir',
        progression: 0,
        ordre: etape.numero || index + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('etapes').insert(etapesData);
      if (error) throw error;
    } else {
      // Sinon on valide les brouillons existants
      const { error } = await supabase
        .from('etapes')
        .update({ 
          statut: 'à_venir',
          updated_at: new Date().toISOString()
        })
        .eq('travail_id', travailId)
        .eq('statut', 'brouillon');

      if (error) throw error;
    }

    // Mettre à jour le statut du lot
    await supabase
      .from('travaux')
      .update({ 
        statut: 'à_venir',
        updated_at: new Date().toISOString()
      })
      .eq('id', travailId);

    return { success: true };
  } catch (err) {
    console.error('Erreur validation étapes:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

/**
 * Supprime les étapes d'un lot
 */
export async function deleteEtapes(
  travailId: string,
  statut?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let query = supabase
      .from('etapes')
      .delete()
      .eq('travail_id', travailId);
    
    if (statut) {
      query = query.eq('statut', statut);
    }

    const { error } = await query;

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Erreur suppression étapes:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

// ==================== UTILITAIRES ====================

/**
 * Calcule les totaux des étapes
 */
export function calculerTotaux(etapes: EtapeGeneree[]): {
  duree_totale_minutes: number;
  duree_totale_heures: number;
  nombre_etapes: number;
} {
  const duree_totale_minutes = etapes.reduce((sum, e) => sum + (e.duree_estimee_minutes || 0), 0);
  return {
    duree_totale_minutes,
    duree_totale_heures: Math.round(duree_totale_minutes / 60 * 10) / 10,
    nombre_etapes: etapes.length
  };
}

/**
 * Récupère tous les matériaux de toutes les étapes
 */
export function aggregerMateriaux(etapes: EtapeGeneree[]): { nom: string; quantite: string; unite: string }[] {
  const materiaux: Map<string, { nom: string; quantite: number; unite: string }> = new Map();

  etapes.forEach(etape => {
    (etape.materiaux_necessaires || []).forEach(mat => {
      const key = `${mat.nom}-${mat.unite}`;
      if (materiaux.has(key)) {
        const existing = materiaux.get(key)!;
        existing.quantite += parseFloat(mat.quantite) || 0;
      } else {
        materiaux.set(key, {
          nom: mat.nom,
          quantite: parseFloat(mat.quantite) || 0,
          unite: mat.unite
        });
      }
    });
  });

  return Array.from(materiaux.values()).map(m => ({
    nom: m.nom,
    quantite: m.quantite.toString(),
    unite: m.unite
  }));
}

/**
 * Récupère tous les outils de toutes les étapes (dédoublonnés)
 */
export function aggregerOutils(etapes: EtapeGeneree[]): string[] {
  const outils = new Set<string>();
  
  etapes.forEach(etape => {
    (etape.outils_necessaires || []).forEach(outil => {
      outils.add(outil);
    });
  });

  return Array.from(outils).sort();
}

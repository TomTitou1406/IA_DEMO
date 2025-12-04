/**
 * tachesGeneratorService.ts
 * 
 * Service de gestion des tâches générées par l'IA
 * Pattern identique à etapesGeneratorService.ts
 * 
 * Gère : chargement, sauvegarde, validation, suppression des tâches
 * 
 * @version 1.0
 * @date 04 décembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface TacheGeneree {
  numero: number;
  titre: string;
  description?: string;
  duree_estimee_minutes: number;
  est_critique: boolean;
  outils_necessaires?: string[];
  conseils_pro?: string;
  statut?: string;
}

export interface TacheBDD {
  id: string;
  etape_id: string;
  numero: number;
  titre: string;
  description?: string;
  statut: string;
  duree_estimee_minutes?: number;
  duree_reelle_minutes?: number;
  ordre?: number;
  est_critique: boolean;
  notes?: string;
  outils_necessaires?: string[];
  conseils_pro?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  count?: number;
}

// ==================== CHARGEMENT ====================

/**
 * Charge les tâches brouillon d'une étape
 */
export async function loadTachesBrouillon(etapeId: string): Promise<TacheGeneree[]> {
  try {
    const { data, error } = await supabase
      .from('taches')
      .select('*')
      .eq('etape_id', etapeId)
      .eq('statut', 'brouillon')
      .is('deleted_at', null)
      .order('numero', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapBDDToGeneree);
  } catch (error) {
    console.error('Erreur chargement tâches brouillon:', error);
    return [];
  }
}

/**
 * Charge les tâches validées (non-brouillon) d'une étape
 */
export async function loadTachesValidees(etapeId: string): Promise<TacheGeneree[]> {
  try {
    const { data, error } = await supabase
      .from('taches')
      .select('*')
      .eq('etape_id', etapeId)
      .neq('statut', 'brouillon')
      .is('deleted_at', null)
      .order('numero', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapBDDToGeneree);
  } catch (error) {
    console.error('Erreur chargement tâches validées:', error);
    return [];
  }
}

/**
 * Charge toutes les tâches d'une étape (tous statuts)
 */
export async function loadAllTaches(etapeId: string): Promise<TacheGeneree[]> {
  try {
    const { data, error } = await supabase
      .from('taches')
      .select('*')
      .eq('etape_id', etapeId)
      .is('deleted_at', null)
      .order('numero', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapBDDToGeneree);
  } catch (error) {
    console.error('Erreur chargement toutes tâches:', error);
    return [];
  }
}

// ==================== SAUVEGARDE ====================

/**
 * Sauvegarde les tâches en brouillon
 * Supprime les anciennes et insère les nouvelles
 */
export async function saveTachesBrouillon(
  etapeId: string,
  taches: TacheGeneree[]
): Promise<SaveResult> {
  try {
    // 1. Supprimer les tâches brouillon existantes
    const { error: deleteError } = await supabase
      .from('taches')
      .delete()
      .eq('etape_id', etapeId)
      .eq('statut', 'brouillon');

    if (deleteError) {
      console.error('Erreur suppression brouillons:', deleteError);
      throw deleteError;
    }

    // 2. Insérer les nouvelles tâches
    if (taches.length === 0) {
      return { success: true, count: 0 };
    }

    const tachesToInsert = taches.map((t, index) => ({
      etape_id: etapeId,
      numero: index + 1,
      titre: t.titre,
      description: t.description || null,
      statut: 'brouillon',
      duree_estimee_minutes: t.duree_estimee_minutes || 10,
      ordre: index + 1,
      est_critique: t.est_critique === true,
      outils_necessaires: t.outils_necessaires || [],
      conseils_pro: t.conseils_pro || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('taches')
      .insert(tachesToInsert);

    if (insertError) {
      console.error('Erreur insertion tâches:', insertError);
      throw insertError;
    }

    console.log(`✅ ${taches.length} tâches sauvegardées en brouillon`);
    return { success: true, count: taches.length };

  } catch (error) {
    console.error('Erreur sauvegarde tâches brouillon:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Valide les tâches (passe de brouillon à à_faire)
 * Met aussi à jour le compteur de tâches sur l'étape si nécessaire
 */
export async function validerTaches(
  etapeId: string,
  taches: TacheGeneree[]
): Promise<SaveResult> {
  try {
    // 1. Supprimer toutes les tâches existantes de l'étape
    const { error: deleteError } = await supabase
      .from('taches')
      .delete()
      .eq('etape_id', etapeId);

    if (deleteError) {
      console.error('Erreur suppression tâches:', deleteError);
      throw deleteError;
    }

    // 2. Insérer les tâches validées
    if (taches.length === 0) {
      return { success: true, count: 0 };
    }

    const tachesToInsert = taches.map((t, index) => ({
      etape_id: etapeId,
      numero: index + 1,
      titre: t.titre,
      description: t.description || null,
      statut: 'à_faire',
      duree_estimee_minutes: t.duree_estimee_minutes || 10,
      ordre: index + 1,
      est_critique: t.est_critique === true,
      outils_necessaires: t.outils_necessaires || [],
      conseils_pro: t.conseils_pro || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('taches')
      .insert(tachesToInsert);

    if (insertError) {
      console.error('Erreur insertion tâches validées:', insertError);
      throw insertError;
    }

    // 3. Mettre à jour le nombre de tâches sur l'étape (si le champ existe)
    // Note: Ceci est optionnel selon la structure de la table etapes
    try {
      await supabase
        .from('etapes')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', etapeId);
    } catch {
      // Ignorer si le champ n'existe pas
    }

    console.log(`✅ ${taches.length} tâches validées`);
    return { success: true, count: taches.length };

  } catch (error) {
    console.error('Erreur validation tâches:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// ==================== SUPPRESSION ====================

/**
 * Supprime les tâches d'une étape par statut
 */
export async function deleteTaches(
  etapeId: string,
  statut?: string
): Promise<SaveResult> {
  try {
    let query = supabase
      .from('taches')
      .delete()
      .eq('etape_id', etapeId);

    if (statut) {
      query = query.eq('statut', statut);
    }

    const { error } = await query;

    if (error) throw error;

    console.log(`🗑️ Tâches supprimées (statut: ${statut || 'tous'})`);
    return { success: true };

  } catch (error) {
    console.error('Erreur suppression tâches:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Supprime une tâche par son ID
 */
export async function deleteTacheById(tacheId: string): Promise<SaveResult> {
  try {
    const { error } = await supabase
      .from('taches')
      .delete()
      .eq('id', tacheId);

    if (error) throw error;

    return { success: true };

  } catch (error) {
    console.error('Erreur suppression tâche:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// ==================== MISE À JOUR STATUT ====================

/**
 * Marque une tâche comme terminée
 */
export async function terminerTache(tacheId: string): Promise<SaveResult> {
  try {
    const { error } = await supabase
      .from('taches')
      .update({
        statut: 'terminée',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tacheId);

    if (error) throw error;

    return { success: true };

  } catch (error) {
    console.error('Erreur terminaison tâche:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Remet une tâche en à_faire
 */
export async function resetTache(tacheId: string): Promise<SaveResult> {
  try {
    const { error } = await supabase
      .from('taches')
      .update({
        statut: 'à_faire',
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tacheId);

    if (error) throw error;

    return { success: true };

  } catch (error) {
    console.error('Erreur reset tâche:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Termine toutes les tâches d'une étape
 */
export async function terminerToutesTaches(etapeId: string): Promise<SaveResult> {
  try {
    const { error } = await supabase
      .from('taches')
      .update({
        statut: 'terminée',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('etape_id', etapeId)
      .neq('statut', 'terminée');

    if (error) throw error;

    return { success: true };

  } catch (error) {
    console.error('Erreur terminaison toutes tâches:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// ==================== HELPERS ====================

/**
 * Mappe une tâche BDD vers le format généré
 */
function mapBDDToGeneree(tache: TacheBDD): TacheGeneree {
  return {
    numero: tache.numero,
    titre: tache.titre,
    description: tache.description || undefined,
    duree_estimee_minutes: tache.duree_estimee_minutes || 10,
    est_critique: tache.est_critique === true,
    outils_necessaires: tache.outils_necessaires || [],
    conseils_pro: tache.conseils_pro || undefined,
    statut: tache.statut
  };
}

/**
 * Calcule les totaux des tâches
 */
export function calculerTotaux(taches: TacheGeneree[]): {
  nombre_taches: number;
  duree_totale_minutes: number;
  duree_totale_heures: number;
  taches_critiques: number;
  taches_terminees: number;
  progression: number;
} {
  const nombre = taches.length;
  const dureeMinutes = taches.reduce((sum, t) => sum + (t.duree_estimee_minutes || 0), 0);
  const critiques = taches.filter(t => t.est_critique).length;
  const terminees = taches.filter(t => t.statut === 'terminée').length;

  return {
    nombre_taches: nombre,
    duree_totale_minutes: dureeMinutes,
    duree_totale_heures: Math.round((dureeMinutes / 60) * 10) / 10,
    taches_critiques: critiques,
    taches_terminees: terminees,
    progression: nombre > 0 ? Math.round((terminees / nombre) * 100) : 0
  };
}

/**
 * Agrège les outils de toutes les tâches (dédupliqués)
 */
export function aggregerOutils(taches: TacheGeneree[]): string[] {
  const outilsSet = new Set<string>();

  taches.forEach(t => {
    if (t.outils_necessaires) {
      t.outils_necessaires.forEach(outil => outilsSet.add(outil));
    }
  });

  return Array.from(outilsSet).sort();
}

/**
 * Compte les tâches par statut
 */
export function compterParStatut(taches: TacheGeneree[]): Record<string, number> {
  const counts: Record<string, number> = {};

  taches.forEach(t => {
    const statut = t.statut || 'à_faire';
    counts[statut] = (counts[statut] || 0) + 1;
  });

  return counts;
}

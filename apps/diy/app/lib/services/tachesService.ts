// apps/diy/app/lib/services/tachesService.ts

import { supabase } from '@/app/lib/supabaseClient';

/**
 * Récupère toutes les tâches d'une étape avec stats
 */
export async function getTachesByEtape(etapeId: string) {
  try {
    // Récupérer l'étape
    const { data: etape, error: etapeError } = await supabase
      .from('etapes')
      .select('*')
      .eq('id', etapeId)
      .single();

    if (etapeError) throw etapeError;

    // Récupérer les tâches
    const { data: taches, error: tachesError } = await supabase
      .from('taches')
      .select('*')
      .eq('etape_id', etapeId)
      .order('numero', { ascending: true });

    if (tachesError) throw tachesError;

    return {
      etape,
      taches: taches || []
    };
  } catch (error) {
    console.error('Error fetching taches:', error);
    throw error;
  }
}

/**
 * Récupère une tâche par ID
 */
export async function getTacheById(tacheId: string) {
  try {
    const { data, error } = await supabase
      .from('taches')
      .select('*')
      .eq('id', tacheId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching tache:', error);
    throw error;
  }
}

/**
 * Remet une tâche à faire (terminée → à_faire)
 */
export async function demarrerTache(tacheId: string) {
  try {
    const { data, error } = await supabase
      .from('taches')
      .update({
        statut: 'à_faire',
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tacheId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error restarting tache:', error);
    throw error;
  }
}

/**
 * Termine une tâche (à_faire → terminée)
 * ET met à jour l'étape en "en_cours" si c'était la 1ère tâche
 */
export async function terminerTache(tacheId: string, dureeReelleMinutes?: number) {
  try {
    // 1. Récupérer la tâche pour avoir l'etape_id
    const { data: tache } = await supabase
      .from('taches')
      .select('etape_id')
      .eq('id', tacheId)
      .single();

    if (!tache) throw new Error('Tâche introuvable');

    // 2. Marquer la tâche comme terminée
    const updates: any = {
      statut: 'terminée',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (dureeReelleMinutes !== undefined) {
      updates.duree_reelle_minutes = dureeReelleMinutes;
    }

    const { data, error } = await supabase
      .from('taches')
      .update(updates)
      .eq('id', tacheId)
      .select()
      .single();

    if (error) throw error;

    // 3. Vérifier si l'étape doit passer en "en_cours"
    const { data: etape } = await supabase
      .from('etapes')
      .select('statut')
      .eq('id', tache.etape_id)
      .single();

    // Si l'étape est "à_venir", la passer en "en_cours"
    if (etape && etape.statut === 'à_venir') {
      await supabase
        .from('etapes')
        .update({
          statut: 'en_cours',
          updated_at: new Date().toISOString()
        })
        .eq('id', tache.etape_id);
    }

    return data;
  } catch (error) {
    console.error('Error completing tache:', error);
    throw error;
  }
}

/**
 * Met à jour la durée réelle d'une tâche
 */
export async function updateTacheDuree(tacheId: string, dureeReelleMinutes: number) {
  try {
    const { data, error } = await supabase
      .from('taches')
      .update({
        duree_reelle_minutes: dureeReelleMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', tacheId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating tache duration:', error);
    throw error;
  }
}

/**
 * Met à jour les notes d'une tâche
 */
export async function updateTacheNotes(tacheId: string, notes: string) {
  try {
    const { data, error } = await supabase
      .from('taches')
      .update({
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', tacheId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating tache notes:', error);
    throw error;
  }
}

/**
 * Calcule les stats d'une étape basées sur ses tâches
 */
export async function getEtapeStatsFromTaches(etapeId: string) {
  try {
    const { data: taches, error } = await supabase
      .from('taches')
      .select('*')
      .eq('etape_id', etapeId);

    if (error) throw error;

    const total = taches?.length || 0;
    const terminees = taches?.filter(t => t.statut === 'terminée').length || 0;
    const aFaire = taches?.filter(t => t.statut === 'à_faire' || !t.statut).length || 0;

    const progressionAuto = total > 0
      ? Math.round((terminees / total) * 100)
      : 0;

    const dureeEstimeeMinutes = taches?.reduce((sum, t) => sum + (t.duree_estimee_minutes || 0), 0) || 0;
    const dureeReelleMinutes = taches?.reduce((sum, t) => sum + (t.duree_reelle_minutes || 0), 0) || 0;

    const critiques = taches?.filter(t => t.est_critique).length || 0;

    return {
      total,
      terminees,
      aFaire,
      progressionAuto,
      dureeEstimeeMinutes,
      dureeReelleMinutes,
      critiques
    };
  } catch (error) {
    console.error('Error calculating etape stats:', error);
    throw error;
  }
}

/**
 * Met à jour la progression manuelle d'une étape
 */
export async function updateEtapeProgressionManuelle(etapeId: string, progression: number) {
  try {
    const updates: any = {
      progression,
      updated_at: new Date().toISOString()
    };

    // Si 100%, marquer comme terminé
    if (progression === 100) {
      updates.statut = 'terminé';
      updates.completed_at = new Date().toISOString();
    } else if (progression > 0) {
      // Si > 0%, marquer en cours
      updates.statut = 'en_cours';
    }

    const { data, error } = await supabase
      .from('etapes')
      .update(updates)
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating etape progression:', error);
    throw error;
  }
}

/**
 * Crée une nouvelle tâche
 */
export async function createTache(tacheData: any) {
  try {
    const { data, error } = await supabase
      .from('taches')
      .insert({
        ...tacheData,
        statut: tacheData.statut || 'à_faire',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating tache:', error);
    throw error;
  }
}

/**
 * Supprime une tâche
 */
export async function deleteTache(tacheId: string) {
  try {
    const { error } = await supabase
      .from('taches')
      .delete()
      .eq('id', tacheId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting tache:', error);
    throw error;
  }
}

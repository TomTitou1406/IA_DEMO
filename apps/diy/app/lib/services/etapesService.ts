// apps/diy/app/lib/services/etapesService.ts

import { supabase } from '@/app/lib/supabaseClient';

/**
 * Récupère toutes les étapes d'un travail avec stats
 */
export async function getEtapesByTravail(travailId: string) {
  try {
    // Récupérer le travail
    const { data: travail, error: travailError } = await supabase
      .from('travaux')
      .select('*')
      .eq('id', travailId)
      .single();

    if (travailError) throw travailError;

    // Récupérer les étapes
    const { data: etapes, error: etapesError } = await supabase
      .from('etapes')
      .select('*')
      .eq('travail_id', travailId)
      .order('numero', { ascending: true });

    if (etapesError) throw etapesError;

    // ← AJOUTE ICI : Enrichir avec comptage des tâches
    const etapesWithStats = await Promise.all(
      (etapes || []).map(async (etape) => {
        // Compter le total de tâches
        const { count: totalTaches } = await supabase
          .from('taches')
          .select('*', { count: 'exact', head: true })
          .eq('etape_id', etape.id);
        
        // Compter les tâches terminées
        const { count: tachesTerminees } = await supabase
          .from('taches')
          .select('*', { count: 'exact', head: true })
          .eq('etape_id', etape.id)
          .eq('statut', 'terminée');
        
        return {
          ...etape,
          nombre_taches: totalTaches || 0,
          taches_terminees: tachesTerminees || 0
        };
      })
    );

    return {
      travail,
      etapes: etapesWithStats
    };
  } catch (error) {
    console.error('Error fetching etapes:', error);
    throw error;
  }
}

/**
 * Récupère une étape par ID
 */
export async function getEtapeById(etapeId: string) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .select('*')
      .eq('id', etapeId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching etape:', error);
    throw error;
  }
}

/**
 * Démarre une étape (à_venir → en_cours)
 */
export async function demarrerEtape(etapeId: string) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .update({
        statut: 'en_cours',
        updated_at: new Date().toISOString()
      })
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error starting etape:', error);
    throw error;
  }
}

/**
 * Termine une étape (en_cours → terminé)
 */
export async function terminerEtape(etapeId: string) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .update({
        statut: 'terminé',
        progression: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error completing etape:', error);
    throw error;
  }
}

/**
 * Bloque une étape avec raison
 */
export async function bloquerEtape(etapeId: string, raison: string) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .update({
        statut: 'bloqué',
        blocage_raison: raison,
        updated_at: new Date().toISOString()
      })
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error blocking etape:', error);
    throw error;
  }
}

/**
 * Débloque une étape (bloqué → en_cours)
 */
export async function debloquerEtape(etapeId: string) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .update({
        statut: 'en_cours',
        blocage_raison: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error unblocking etape:', error);
    throw error;
  }
}

/**
 * Annule une étape
 */
export async function annulerEtape(etapeId: string) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .update({
        statut: 'annulé',
        updated_at: new Date().toISOString()
      })
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error canceling etape:', error);
    throw error;
  }
}

/**
 * Réactive une étape annulée (annulé → à_venir)
 */
export async function reactiverEtape(etapeId: string) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .update({
        statut: 'à_venir',
        updated_at: new Date().toISOString()
      })
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error reactivating etape:', error);
    throw error;
  }
}

/**
 * Met à jour la progression d'une étape
 */
export async function updateEtapeProgression(etapeId: string, progression: number) {
  try {
    const updates: any = {
      progression,
      updated_at: new Date().toISOString()
    };

    // Si 100%, marquer comme terminé
    if (progression === 100) {
      updates.statut = 'terminé';
      updates.completed_at = new Date().toISOString();
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
 * Met à jour la durée réelle d'une étape
 */
export async function updateEtapeDuree(etapeId: string, dureeReelleMinutes: number) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .update({
        duree_reelle_minutes: dureeReelleMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', etapeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating etape duration:', error);
    throw error;
  }
}

/**
 * Calcule les stats d'un travail basées sur ses étapes
 */
export async function getTravauxStatsFromEtapes(travailId: string) {
  try {
    const { data: etapes, error } = await supabase
      .from('etapes')
      .select('*')
      .eq('travail_id', travailId);

    if (error) throw error;

    const total = etapes?.length || 0;
    const termines = etapes?.filter(e => e.statut === 'terminé').length || 0;
    const enCours = etapes?.filter(e => e.statut === 'en_cours').length || 0;
    const bloques = etapes?.filter(e => e.statut === 'bloqué').length || 0;
    const aVenir = etapes?.filter(e => e.statut === 'à_venir' || !e.statut).length || 0;

    const progressionMoyenne = total > 0
      ? Math.round(etapes.reduce((sum, e) => sum + (e.progression || 0), 0) / total)
      : 0;

    const dureeEstimeeMinutes = etapes?.reduce((sum, e) => sum + (e.duree_estimee_minutes || 0), 0) || 0;
    const dureeReelleMinutes = etapes?.reduce((sum, e) => sum + (e.duree_reelle_minutes || 0), 0) || 0;

    return {
      total,
      termines,
      enCours,
      bloques,
      aVenir,
      progressionMoyenne,
      dureeEstimeeHeures: Math.round(dureeEstimeeMinutes / 60 * 10) / 10,
      dureeReelleHeures: Math.round(dureeReelleMinutes / 60 * 10) / 10
    };
  } catch (error) {
    console.error('Error calculating travaux stats:', error);
    throw error;
  }
}

/**
 * Crée une nouvelle étape
 */
export async function createEtape(etapeData: any) {
  try {
    const { data, error } = await supabase
      .from('etapes')
      .insert({
        ...etapeData,
        statut: etapeData.statut || 'à_venir',
        progression: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating etape:', error);
    throw error;
  }
}

/**
 * Supprime une étape
 */
export async function deleteEtape(etapeId: string) {
  try {
    const { error } = await supabase
      .from('etapes')
      .delete()
      .eq('id', etapeId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting etape:', error);
    throw error;
  }
}

// Terminer toutes les étapes d'un travail (et leurs tâches)
export async function terminerToutesLesEtapes(travailId: string) {
  try {
    // 1. Récupérer toutes les étapes du travail
    const { data: etapes, error: fetchError } = await supabase
      .from('etapes')
      .select('id')
      .eq('travail_id', travailId)
      .neq('statut', 'terminé');

    if (fetchError) throw fetchError;

    // 2. Pour chaque étape, terminer toutes les tâches
    for (const etape of etapes || []) {
      await supabase
        .from('taches')
        .update({ 
          statut: 'terminée',
          date_fin_reelle: new Date().toISOString()
        })
        .eq('etape_id', etape.id)
        .neq('statut', 'terminée');
    }

    // 3. Terminer toutes les étapes
    const { data, error } = await supabase
      .from('etapes')
      .update({ 
        statut: 'terminé',
        progression: 100
      })
      .eq('travail_id', travailId)
      .neq('statut', 'terminé');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error terminating all etapes:', error);
    throw error;
  }
}

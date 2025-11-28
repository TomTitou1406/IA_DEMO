/**
 * progressionService.ts
 * 
 * Service de gestion de la progression hiérarchique
 * Recalcule et sauvegarde la progression à chaque changement de statut
 * 
 * @version 1.0
 * @date 28 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

type StatutTermine = 'termine' | 'terminé' | 'terminee' | 'terminée';

function isTermine(statut: string | null): boolean {
  if (!statut) return false;
  const s = statut.toLowerCase();
  return s === 'termine' || s === 'terminé' || s === 'terminee' || s === 'terminée';
}

// ==================== CALCULS ====================

/**
 * Calcule la progression d'un lot basée sur ses étapes
 */
async function calculateLotProgression(travailId: string): Promise<number> {
  const { data: etapes, error } = await supabase
    .from('etapes')
    .select('id, statut')
    .eq('travail_id', travailId);

  if (error || !etapes || etapes.length === 0) return 0;

  const terminees = etapes.filter(e => isTermine(e.statut)).length;
  return Math.round((terminees / etapes.length) * 100);
}

/**
 * Calcule la progression d'une étape basée sur ses tâches
 */
async function calculateEtapeProgression(etapeId: string): Promise<number> {
  const { data: taches, error } = await supabase
    .from('taches')
    .select('id, statut')
    .eq('etape_id', etapeId);

  if (error || !taches || taches.length === 0) return 0;

  const terminees = taches.filter(t => isTermine(t.statut)).length;
  return Math.round((terminees / taches.length) * 100);
}

/**
 * Calcule la progression d'un chantier basée sur ses lots
 */
async function calculateChantierProgression(chantierId: string): Promise<number> {
  const { data: lots, error } = await supabase
    .from('travaux')
    .select('id, statut, progression')
    .eq('chantier_id', chantierId);

  if (error || !lots || lots.length === 0) return 0;

  // Moyenne des progressions des lots
  const totalProgression = lots.reduce((sum, lot) => sum + (lot.progression || 0), 0);
  return Math.round(totalProgression / lots.length);
}

// ==================== MISES À JOUR ====================

/**
 * Met à jour la progression d'une étape et propage vers le haut
 */
export async function updateEtapeProgression(etapeId: string): Promise<void> {
  try {
    // 1. Calculer la progression de l'étape
    const progression = await calculateEtapeProgression(etapeId);

    // 2. Mettre à jour l'étape
    const { data: etape, error: updateError } = await supabase
      .from('etapes')
      .update({ progression })
      .eq('id', etapeId)
      .select('travail_id')
      .single();

    if (updateError) throw updateError;

    // 3. Propager au lot parent
    if (etape?.travail_id) {
      await updateLotProgression(etape.travail_id);
    }

    console.log(`✅ Progression étape ${etapeId} mise à jour: ${progression}%`);
  } catch (error) {
    console.error('Erreur mise à jour progression étape:', error);
  }
}

/**
 * Met à jour la progression d'un lot et propage vers le haut
 */
export async function updateLotProgression(travailId: string): Promise<void> {
  try {
    // 1. Calculer la progression du lot
    const progression = await calculateLotProgression(travailId);

    // 2. Déterminer le statut du lot
    let nouveauStatut: string | undefined;
    if (progression === 100) {
      nouveauStatut = 'termine';
    } else if (progression > 0) {
      nouveauStatut = 'en_cours';
    }

    // 3. Mettre à jour le lot
    const updateData: any = { progression };
    if (nouveauStatut) {
      updateData.statut = nouveauStatut;
    }

    const { data: lot, error: updateError } = await supabase
      .from('travaux')
      .update(updateData)
      .eq('id', travailId)
      .select('chantier_id')
      .single();

    if (updateError) throw updateError;

    // 4. Propager au chantier parent
    if (lot?.chantier_id) {
      await updateChantierProgression(lot.chantier_id);
    }

    console.log(`✅ Progression lot ${travailId} mise à jour: ${progression}%`);
  } catch (error) {
    console.error('Erreur mise à jour progression lot:', error);
  }
}

/**
 * Met à jour la progression d'un chantier
 */
export async function updateChantierProgression(chantierId: string): Promise<void> {
  try {
    // 1. Calculer la progression du chantier
    const progression = await calculateChantierProgression(chantierId);

    // 2. Déterminer le statut du chantier
    let nouveauStatut: string | undefined;
    if (progression === 100) {
      nouveauStatut = 'termine';
    } else if (progression > 0) {
      nouveauStatut = 'en_cours';
    }

    // 3. Mettre à jour le chantier
    const updateData: any = { progression };
    if (nouveauStatut) {
      updateData.statut = nouveauStatut;
    }

    const { error: updateError } = await supabase
      .from('chantiers')
      .update(updateData)
      .eq('id', chantierId);

    if (updateError) throw updateError;

    console.log(`✅ Progression chantier ${chantierId} mise à jour: ${progression}%`);
  } catch (error) {
    console.error('Erreur mise à jour progression chantier:', error);
  }
}

// ==================== FONCTION PRINCIPALE ====================

/**
 * Met à jour le statut d'un élément et recalcule toute la hiérarchie
 * 
 * @param level - 'tache' | 'etape' | 'lot'
 * @param id - ID de l'élément
 * @param nouveauStatut - Nouveau statut à appliquer
 */
export async function updateStatutAndProgression(
  level: 'tache' | 'etape' | 'lot',
  id: string,
  nouveauStatut: string
): Promise<boolean> {
  try {
    switch (level) {
      case 'tache': {
        // 1. Mettre à jour la tâche
        const { data: tache, error } = await supabase
          .from('taches')
          .update({ statut: nouveauStatut })
          .eq('id', id)
          .select('etape_id')
          .single();

        if (error) throw error;

        // 2. Propager à l'étape parente
        if (tache?.etape_id) {
          await updateEtapeProgression(tache.etape_id);
        }
        break;
      }

      case 'etape': {
        // 1. Mettre à jour l'étape
        const { data: etape, error } = await supabase
          .from('etapes')
          .update({ statut: nouveauStatut })
          .eq('id', id)
          .select('travail_id')
          .single();

        if (error) throw error;

        // 2. Propager au lot parent
        if (etape?.travail_id) {
          await updateLotProgression(etape.travail_id);
        }
        break;
      }

      case 'lot': {
        // 1. Mettre à jour le lot
        const { data: lot, error } = await supabase
          .from('travaux')
          .update({ statut: nouveauStatut })
          .eq('id', id)
          .select('chantier_id')
          .single();

        if (error) throw error;

        // 2. Propager au chantier parent
        if (lot?.chantier_id) {
          await updateChantierProgression(lot.chantier_id);
        }
        break;
      }
    }

    return true;
  } catch (error) {
    console.error(`Erreur updateStatutAndProgression (${level}/${id}):`, error);
    return false;
  }
}

/**
 * Recalcule toute la hiérarchie d'un chantier (utile pour initialisation)
 */
export async function recalculateFullHierarchy(chantierId: string): Promise<void> {
  try {
    // 1. Charger tous les lots du chantier
    const { data: lots } = await supabase
      .from('travaux')
      .select('id')
      .eq('chantier_id', chantierId);

    if (!lots) return;

    // 2. Pour chaque lot, recalculer
    for (const lot of lots) {
      // Charger les étapes du lot
      const { data: etapes } = await supabase
        .from('etapes')
        .select('id')
        .eq('travail_id', lot.id);

      if (etapes) {
        // Recalculer chaque étape
        for (const etape of etapes) {
          const progEtape = await calculateEtapeProgression(etape.id);
          await supabase
            .from('etapes')
            .update({ progression: progEtape })
            .eq('id', etape.id);
        }
      }

      // Recalculer le lot
      await updateLotProgression(lot.id);
    }

    // 3. Recalculer le chantier
    await updateChantierProgression(chantierId);

    console.log(`✅ Hiérarchie complète recalculée pour chantier ${chantierId}`);
  } catch (error) {
    console.error('Erreur recalcul hiérarchie:', error);
  }
}

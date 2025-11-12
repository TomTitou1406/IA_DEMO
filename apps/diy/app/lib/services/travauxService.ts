import { supabase } from '../supabaseClient';

/**
 * Récupère tous les travaux d'un chantier
 */
export async function getTravauxByChantier(chantierId: string) {
  try {
    const { data, error } = await supabase
      .from('travaux')
      .select(`
        *,
        expertises (
          nom,
          code
        )
      `)
      .eq('chantier_id', chantierId)
      .order('ordre', { ascending: true });

    if (error) {
      console.error('Error fetching travaux:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getTravauxByChantier:', err);
    return [];
  }
}

/**
 * Récupère les travaux par statut
 */
export async function getTravauxByStatut(chantierId: string, statut: string) {
  try {
    const { data, error } = await supabase
      .from('travaux')
      .select(`
        *,
        expertises (
          nom,
          code
        )
      `)
      .eq('chantier_id', chantierId)
      .eq('statut', statut)
      .order('ordre', { ascending: true });

    if (error) {
      console.error('Error fetching travaux by statut:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getTravauxByStatut:', err);
    return [];
  }
}

/**
 * Met à jour le statut d'un travail
 */
export async function updateTravailStatut(travailId: string, statut: string) {
  try {
    const { error } = await supabase
      .from('travaux')
      .update({ 
        statut,
        updated_at: new Date().toISOString()
      })
      .eq('id', travailId);

    if (error) {
      console.error('Error updating travail statut:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateTravailStatut:', err);
    return false;
  }
}

/**
 * Met à jour la progression d'un travail
 */
export async function updateTravailProgression(travailId: string, progression: number) {
  try {
    // Si 100%, passer en terminé
    const statut = progression >= 100 ? 'terminé' : 'en_cours';
    
    const { error } = await supabase
      .from('travaux')
      .update({ 
        progression,
        statut,
        updated_at: new Date().toISOString(),
        ...(progression >= 100 && { completed_at: new Date().toISOString() })
      })
      .eq('id', travailId);

    if (error) {
      console.error('Error updating progression:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateTravailProgression:', err);
    return false;
  }
}

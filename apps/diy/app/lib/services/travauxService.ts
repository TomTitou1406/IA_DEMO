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

/**
 * Annule un travail (soft delete)
 */
export async function annulerTravail(travailId: string) {
  try {
    const { error } = await supabase
      .from('travaux')
      .update({ 
        statut: 'annulé',
        updated_at: new Date().toISOString()
      })
      .eq('id', travailId);

    if (error) {
      console.error('Error annuler travail:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in annulerTravail:', err);
    return false;
  }
}

/**
 * Réactive un travail annulé
 */
export async function reactiverTravail(travailId: string) {
  try {
    const { error } = await supabase
      .from('travaux')
      .update({ 
        statut: 'à_venir',
        updated_at: new Date().toISOString()
      })
      .eq('id', travailId);

    if (error) {
      console.error('Error reactiver travail:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in reactiverTravail:', err);
    return false;
  }
}
// Récupérer les étapes d'un travail
export async function getEtapesByTravail(travailId: string) {
  const { data, error } = await supabase
    .from('travaux')
    .select('id, titre, description, statut, progression, etapes, expertises(nom, code)')
    .eq('id', travailId)
    .single();

  if (error) {
    console.error('Error fetching etapes:', error);
    return null;
  }

  return {
    travail: {
      id: data.id,
      titre: data.titre,
      description: data.description,
      statut: data.statut,
      progression: data.progression,
      expertise: data.expertises?.[0] || null
    },
    etapes: data.etapes?.etapes || []
  };
}

// Compter le nombre d'étapes d'un travail
export function countEtapes(travail: any): number {
  return travail.etapes?.etapes?.length || 0;
}

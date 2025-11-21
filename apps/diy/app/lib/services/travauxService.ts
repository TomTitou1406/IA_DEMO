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
  // 1. Récupérer le travail (sans le champ etapes)
  const { data: travailData, error: travailError } = await supabase
    .from('travaux')
    .select('id, titre, description, statut, progression, expertises(nom, code)')
    .eq('id', travailId)
    .single();

  // 2. Récupérer les étapes depuis la table etapes
  const { data: etapesData, error: etapesError } = await supabase
    .from('etapes')
    .select('*')
    .eq('travail_id', travailId)
    .order('numero', { ascending: true });

  return {
    travail: {
      id: travailData.id,
      titre: travailData.titre,
      description: travailData.description,
      statut: travailData.statut,
      progression: travailData.progression,
      expertise: travailData.expertises?.[0] || null
    },
    etapes: (etapesData || []).map(etape => ({
      numero: etape.numero,
      titre: etape.titre,
      description: etape.description || '',
      duree_minutes: etape.duree_estimee_minutes || 0,
      outils: etape.outils_necessaires || [],
      difficulte: etape.difficulte || 'moyen',
      conseils: etape.conseils_pro || ''
    }))
  };
}

// Compter le nombre d'étapes d'un travail
export async function countEtapes(travailId: string): Promise<number> {
  const { count, error } = await supabase
    .from('etapes')
    .select('*', { count: 'exact', head: true })
    .eq('travail_id', travailId);

  if (error) {
    console.error('Error counting etapes:', error);
    return 0;
  }

  return count || 0;
}

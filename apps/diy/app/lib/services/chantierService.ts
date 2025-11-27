import { supabase } from '../supabaseClient';

// ID du user de démo (Christophe)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Récupère le chantier de Christophe (user démo)
 */
export async function getChantierDemo() {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .single();

    if (error) {
      console.error('Error fetching chantier:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getChantierDemo:', err);
    return null;
  }
}

/**
 * Récupère les stats du chantier
 */
export async function getChantierStats(chantierId: string) {
  try {
    const { data: travaux, error } = await supabase
      .from('travaux')
      .select('statut, progression, duree_estimee_heures, duree_reelle_heures, cout_estime, cout_reel')
      .eq('chantier_id', chantierId);

    if (error) {
      console.error('Error fetching stats:', error);
      return null;
    }

    // Stats de base
    const total = travaux?.length || 0;
    const termines = travaux?.filter(t => t.statut === 'terminé').length || 0;
    const enCours = travaux?.filter(t => t.statut === 'en_cours').length || 0;
    const bloques = travaux?.filter(t => t.statut === 'bloqué').length || 0;
    const aVenir = travaux?.filter(t => t.statut === 'à_venir').length || 0;

    // Progression pondérée (moyenne des progressions)
    const progressionMoyenne = travaux?.length 
      ? Math.round(travaux.reduce((acc, t) => acc + (t.progression || 0), 0) / travaux.length)
      : 0;

    // Heures effectuées vs estimées
    const heuresEstimees = travaux?.reduce((acc, t) => acc + (parseFloat(t.duree_estimee_heures) || 0), 0) || 0;
    
    // Heures terminées = duree_reelle (si existe) sinon duree_estimee
    const heuresReelles = travaux
      ?.filter(t => t.statut === 'terminé')
      .reduce((acc, t) => acc + (parseFloat(t.duree_reelle_heures) || parseFloat(t.duree_estimee_heures) || 0), 0) || 0;
    
    // Heures en cours = duree_estimee × (progression/100)
    const heuresEnCours = travaux
      ?.filter(t => t.statut === 'en_cours')
      .reduce((acc, t) => acc + ((parseFloat(t.duree_estimee_heures) || 0) * ((t.progression || 0) / 100)), 0) || 0;
    
    const heuresEffectuees = heuresReelles + heuresEnCours;
    const progressionHeures = heuresEstimees > 0 ? Math.round((heuresEffectuees / heuresEstimees) * 100) : 0;

    // Budget consommé vs estimé
    const budgetEstime = travaux?.reduce((acc, t) => acc + (parseFloat(t.cout_estime) || 0), 0) || 0;
    const budgetReel = travaux
      ?.filter(t => t.statut === 'terminé')
      .reduce((acc, t) => acc + (parseFloat(t.cout_reel) || parseFloat(t.cout_estime) || 0), 0) || 0;
    const progressionBudget = budgetEstime > 0 ? Math.round((budgetReel / budgetEstime) * 100) : 0;

    return {
      total,
      termines,
      enCours,
      bloques,
      aVenir,
      progressionMoyenne,
      heuresEstimees: Math.round(heuresEstimees * 10) / 10,
      heuresEffectuees: Math.round(heuresEffectuees * 10) / 10,
      progressionHeures,
      budgetEstime: Math.round(budgetEstime),
      budgetReel: Math.round(budgetReel),
      progressionBudget
    };
  } catch (err) {
    console.error('Error in getChantierStats:', err);
    return null;
  }
}

/**
 * Récupère tous les chantiers de l'utilisateur
 * Avec statistiques des travaux associés
 */
export async function getAllChantiers() {
  try {
    const { data: chantiers, error } = await supabase
      .from('chantiers')
      .select(`
        *,
        travaux (
          id,
          statut
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrichir avec les statistiques
    return chantiers.map((chantier: any) => ({
      ...chantier,
      nombre_travaux: chantier.travaux?.length || 0,
      travaux_termines: chantier.travaux?.filter((t: any) => t.statut === 'terminé').length || 0
    }));
  } catch (error) {
    console.error('Error fetching all chantiers:', error);
    throw error;
  }
}

/**
 * Démarre un chantier (passe de "nouveau" à "en_cours")
 */
export async function demarrerChantier(chantierId: string) {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .update({ 
        statut: 'en_cours',
        date_debut: new Date().toISOString()
      })
      .eq('id', chantierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error starting chantier:', error);
    throw error;
  }
}

/**
 * Suspend un chantier (passe en statut "suspendu")
 */
export async function suspendreChantier(chantierId: string) {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .update({ 
        statut: 'suspendu'
      })
      .eq('id', chantierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error suspending chantier:', error);
    throw error;
  }
}

/**
 * Termine un chantier
 */
export async function terminerChantier(chantierId: string) {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .update({ 
        statut: 'terminé',
        date_fin: new Date().toISOString(),
        progression: 100
      })
      .eq('id', chantierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error completing chantier:', error);
    throw error;
  }
}

/**
 * Archive un chantier terminé
 */
export async function archiverChantier(chantierId: string) {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .update({ 
        statut: 'archivé'
      })
      .eq('id', chantierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error archiving chantier:', error);
    throw error;
  }
}

/**
 * Supprime un chantier (uniquement si statut "nouveau")
 */
export async function supprimerChantier(chantierId: string) {
  try {
    const { error } = await supabase
      .from('chantiers')
      .delete()
      .eq('id', chantierId)
      .eq('statut', 'nouveau'); // Sécurité : seulement les nouveaux

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting chantier:', error);
    throw error;
  }
}
/**
 * Récupère un chantier par son ID
 */
export async function getChantierById(chantierId: string) {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .select('*')
      .eq('id', chantierId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching chantier:', error);
    throw error;
  }
}

/**
 * Crée un nouveau chantier
 */
export async function createChantier(chantierData: {
  titre: string;
  description?: string;
  budget_initial?: number;
  duree_estimee_heures?: number;
  date_fin_souhaitee?: string;
  contraintes?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .insert({
        user_id: DEMO_USER_ID,
        titre: chantierData.titre,
        description: chantierData.description,
        budget_initial: chantierData.budget_initial,
        duree_estimee_heures: chantierData.duree_estimee_heures,
        date_fin_souhaitee: chantierData.date_fin_souhaitee,
        statut: 'nouveau',
        progression: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating chantier:', error);
    throw error;
  }
}

/**
 * Met à jour un chantier existant
 */
export async function updateChantier(chantierId: string, updates: {
  titre?: string;
  description?: string;
  budget_initial?: number;
  duree_estimee_heures?: number;
  date_fin_souhaitee?: string;
  contraintes?: string;
  statut?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', chantierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating chantier:', error);
    throw error;
  }
}

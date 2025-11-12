import { supabase } from '../supabaseClient';

// ID du user de démo (Christophe)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

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

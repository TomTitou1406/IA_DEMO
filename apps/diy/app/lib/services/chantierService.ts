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
      .select('statut, progression')
      .eq('chantier_id', chantierId);

    if (error) {
      console.error('Error fetching stats:', error);
      return null;
    }

    // Calcul des stats
    const total = travaux?.length || 0;
    const termines = travaux?.filter(t => t.statut === 'terminé').length || 0;
    const enCours = travaux?.filter(t => t.statut === 'en_cours').length || 0;
    const bloques = travaux?.filter(t => t.statut === 'bloqué').length || 0;
    const aVenir = travaux?.filter(t => t.statut === 'à_venir').length || 0;

    // Progression moyenne
    const progressionMoyenne = travaux?.length 
      ? Math.round(travaux.reduce((acc, t) => acc + (t.progression || 0), 0) / travaux.length)
      : 0;

    return {
      total,
      termines,
      enCours,
      bloques,
      aVenir,
      progressionMoyenne
    };
  } catch (err) {
    console.error('Error in getChantierStats:', err);
    return null;
  }
}

apps/diy/app/lib/services/travauxService.ts

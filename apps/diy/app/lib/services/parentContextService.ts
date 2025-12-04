import { supabase } from '@/app/lib/supabaseClient';

/**
 * Charge les informations minimales d'un chantier (pour le contexte parent)
 */
export async function getChantierMinimal(chantierId: string): Promise<{ titre: string } | null> {
  const { data, error } = await supabase
    .from('chantiers')
    .select('titre')
    .eq('id', chantierId)
    .single();
  
  if (error || !data) return null;
  return { titre: data.titre };
}

/**
 * Charge les informations minimales d'un lot/travail (pour le contexte parent)
 */
export async function getTravailMinimal(travailId: string): Promise<{ titre: string } | null> {
  const { data, error } = await supabase
    .from('travaux')
    .select('titre')
    .eq('id', travailId)
    .single();
  
  if (error || !data) return null;
  return { titre: data.titre };
}

/**
 * Charge les informations minimales d'une étape (pour le contexte parent)
 */
export async function getEtapeMinimal(etapeId: string): Promise<{ titre: string } | null> {
  const { data, error } = await supabase
    .from('etapes')
    .select('titre')
    .eq('id', etapeId)
    .single();
  
  if (error || !data) return null;
  return { titre: data.titre };
}

/**
 * Charge tous les parents en une seule fonction pratique
 */
export async function getParentsContext(params: {
  chantierId?: string;
  travailId?: string;
  etapeId?: string;
}): Promise<{
  chantier?: { titre: string };
  lot?: { titre: string };
  etape?: { titre: string };
}> {
  const result: {
    chantier?: { titre: string };
    lot?: { titre: string };
    etape?: { titre: string };
  } = {};

  // Charger en parallèle pour la performance
  const promises: Promise<void>[] = [];

  if (params.chantierId) {
    promises.push(
      getChantierMinimal(params.chantierId).then(data => {
        if (data) result.chantier = data;
      })
    );
  }

  if (params.travailId) {
    promises.push(
      getTravailMinimal(params.travailId).then(data => {
        if (data) result.lot = data;
      })
    );
  }

  if (params.etapeId) {
    promises.push(
      getEtapeMinimal(params.etapeId).then(data => {
        if (data) result.etape = data;
      })
    );
  }

  await Promise.all(promises);
  return result;
}

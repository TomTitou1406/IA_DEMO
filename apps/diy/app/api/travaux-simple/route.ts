/**
 * API Route : /api/travaux-simples
 * 
 * Récupère les travaux simples (chantiers mono-lot avec type_projet='simple')
 * avec stats de progression
 * 
 * @version 1.1
 * @date 04 janvier 2026
 * 
 * Changelog :
 * - v1.1 : Fix .single() → .maybeSingle() pour éviter erreurs
 * - v1.0 : Création
 * 
 * Query params :
 * - count_only=true : retourne uniquement le compteur
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count_only') === 'true';

    // Récupérer les chantiers de type 'simple'
    const { data: chantiers, error: chantiersError } = await supabase
      .from('chantiers')
      .select('id, titre, description, statut, updated_at')
      .eq('type_projet', 'simple')
      .order('updated_at', { ascending: false });

    if (chantiersError) {
      console.error('❌ Erreur récupération chantiers simples:', chantiersError);
      return NextResponse.json(
        { error: 'Erreur récupération chantiers' },
        { status: 500 }
      );
    }

    console.log(`🔍 Chantiers simples trouvés: ${chantiers?.length || 0}`);

    // Si count_only, retourner juste le nombre
    if (countOnly) {
      return NextResponse.json({
        success: true,
        count: chantiers?.length || 0
      });
    }

    // Pour chaque chantier simple, récupérer le lot unique et ses stats
    const travauxSimples = await Promise.all(
      (chantiers || []).map(async (chantier) => {
        // Récupérer le(s) lot(s) du chantier
        const { data: travaux, error: travailError } = await supabase
          .from('travaux')
          .select('id, titre, description, statut, progression, duree_estimee_heures, duree_reelle_heures')
          .eq('chantier_id', chantier.id)
          .limit(1);

        if (travailError || !travaux || travaux.length === 0) {
          console.log(`⚠️ Pas de lot pour chantier ${chantier.id} (${chantier.titre})`);
          return null;
        }

        const travail = travaux[0];

        // Compter les étapes
        const { count: totalEtapes } = await supabase
          .from('etapes')
          .select('*', { count: 'exact', head: true })
          .eq('travail_id', travail.id);

        // Compter les étapes terminées
        const { count: etapesTerminees } = await supabase
          .from('etapes')
          .select('*', { count: 'exact', head: true })
          .eq('travail_id', travail.id)
          .eq('statut', 'terminé');

        // Calculer la progression
        const progression = totalEtapes && totalEtapes > 0
          ? Math.round(((etapesTerminees || 0) / totalEtapes) * 100)
          : 0;

        return {
          id: travail.id,
          chantier_id: chantier.id,
          titre: travail.titre || chantier.titre,
          description: travail.description || chantier.description,
          statut: travail.statut || chantier.statut,
          progression,
          nombre_etapes: totalEtapes || 0,
          etapes_terminees: etapesTerminees || 0,
          duree_estimee_heures: travail.duree_estimee_heures,
          duree_reelle_heures: travail.duree_reelle_heures,
          updated_at: chantier.updated_at
        };
      })
    );

    // Filtrer les null (chantiers sans lot)
    const travauxFiltres = travauxSimples.filter(t => t !== null);

    console.log(`🔧 Travaux simples avec lots : ${travauxFiltres.length}`);

    return NextResponse.json({
      success: true,
      travaux: travauxFiltres,
      count: travauxFiltres.length
    });

  } catch (error) {
    console.error('❌ Erreur API travaux-simples:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

/**
 * API Route : /api/panier/global
 * 
 * Récupère tous les articles de tous les paniers (tous chantiers confondus)
 * avec les infos des lots et chantiers sources
 * 
 * @version 1.0
 * @date 04 janvier 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    // Récupérer tous les articles avec les infos des lots et chantiers
    const { data: articles, error } = await supabase
      .from('materiaux_budget')
      .select(`
        id,
        nom,
        categorie,
        description,
        quantite_prevue,
        unite,
        cout_unitaire_prevu,
        cout_total_prevu,
        statut,
        travail_id,
        chantier_id
      `)
      .eq('source', 'ia_genere')
      .order('categorie', { ascending: true })
      .order('nom', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération articles:', error);
      return NextResponse.json(
        { error: 'Erreur récupération articles' },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        totalGeneral: 0,
        lotsCount: 0,
        chantiersCount: 0
      });
    }

    // Récupérer les infos des lots
    const lotIds = Array.from(new Set(articles.map(a => a.travail_id).filter(Boolean)));
    const { data: lots } = await supabase
      .from('travaux')
      .select('id, titre, chantier_id')
      .in('id', lotIds);

    // Récupérer les infos des chantiers
    const chantierIds = Array.from(new Set(articles.map(a => a.chantier_id).filter(Boolean)));
    const { data: chantiers } = await supabase
      .from('chantiers')
      .select('id, titre')
      .in('id', chantierIds);

    // Enrichir les articles avec les titres
    const articlesEnrichis = articles.map(article => {
      const lot = lots?.find(l => l.id === article.travail_id);
      const chantier = chantiers?.find(c => c.id === article.chantier_id);
      
      return {
        ...article,
        lot_titre: lot?.titre || 'Lot inconnu',
        chantier_titre: chantier?.titre || 'Chantier inconnu'
      };
    });

    // Calculer les totaux
    const totalGeneral = articles.reduce((sum, a) => sum + (a.cout_total_prevu || 0), 0);
    const lotsCount = lotIds.length;
    const chantiersCount = chantierIds.length;

    console.log(`🛒 Panier global : ${articles.length} articles, ${lotsCount} lots, ${totalGeneral}€`);

    return NextResponse.json({
      success: true,
      articles: articlesEnrichis,
      totalGeneral,
      lotsCount,
      chantiersCount
    });

  } catch (error) {
    console.error('❌ Erreur API panier global:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

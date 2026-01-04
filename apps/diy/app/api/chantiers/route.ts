/**
 * API Route : /api/chantiers
 * 
 * Récupère les chantiers avec filtrage par type
 * 
 * @version 1.0
 * @date 04 janvier 2026
 * 
 * Query params :
 * - type : 'simple' | 'complexe' (optionnel, défaut: tous)
 * - count_only=true : retourne uniquement le compteur
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'simple' | 'complexe' | null
    const countOnly = searchParams.get('count_only') === 'true';

    // Construire la requête
    let query = supabase
      .from('chantiers')
      .select('id, titre, description, statut, type_projet, progression, updated_at')
      .order('updated_at', { ascending: false });

    // Filtrer par type si spécifié
    if (type === 'simple') {
      query = query.eq('type_projet', 'simple');
    } else if (type === 'complexe') {
      query = query.eq('type_projet', 'complexe');
    }

    const { data: chantiers, error } = await query;

    if (error) {
      console.error('❌ Erreur récupération chantiers:', error);
      return NextResponse.json(
        { error: 'Erreur récupération chantiers' },
        { status: 500 }
      );
    }

    console.log(`🏗️ Chantiers trouvés: ${chantiers?.length || 0} (type: ${type || 'tous'})`);

    // Si count_only, retourner juste le nombre
    if (countOnly) {
      return NextResponse.json({
        success: true,
        count: chantiers?.length || 0
      });
    }

    return NextResponse.json({
      success: true,
      chantiers: chantiers || [],
      count: chantiers?.length || 0
    });

  } catch (error) {
    console.error('❌ Erreur API chantiers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

/**
 * API Route : /api/travaux/[travailId]
 * 
 * Récupère les infos d'un lot (travail)
 * 
 * @version 1.0
 * @date 02 décembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { travailId: string } }
) {
  try {
    const { travailId } = params;

    const { data, error } = await supabase
      .from('travaux')
      .select('*')
      .eq('id', travailId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Lot non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur API travaux:', error);
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

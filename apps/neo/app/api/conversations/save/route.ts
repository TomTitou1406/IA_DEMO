import { supabase } from '@/app/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      conversation_id, 
      type, 
      related_entity_id,
      messages, 
      statut 
    } = body;

    // Si pas d'ID, créer nouvelle conversation
    if (!conversation_id) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          type,
          related_entity_id,
          messages,
          statut,
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        conversation_id: data.id,
      });
    }

    // Sinon, mettre à jour
    const { data, error } = await supabase
      .from('conversations')
      .update({
        messages,
        statut,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      conversation_id: data.id,
    });

  } catch (error) {
    console.error('Erreur save conversation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

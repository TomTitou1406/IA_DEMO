// /app/api/medias/route.ts
// API unifiée pour gérer photos et vidéos sur tous les niveaux
// v1.0 - 22/12/2024

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

type NiveauType = 'chantier' | 'travail' | 'etape' | 'tache';

const TABLE_MAP: Record<NiveauType, string> = {
  chantier: 'chantiers',
  travail: 'travaux',
  etape: 'etapes',
  tache: 'taches'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, niveau, niveau_id, data } = body;

    if (!action || !niveau || !niveau_id) {
      return NextResponse.json(
        { error: 'Paramètres manquants: action, niveau, niveau_id requis' },
        { status: 400 }
      );
    }

    const table = TABLE_MAP[niveau as NiveauType];
    if (!table) {
      return NextResponse.json(
        { error: 'Niveau invalide. Valeurs possibles: chantier, travail, etape, tache' },
        { status: 400 }
      );
    }

    switch (action) {
      // ==================== PHOTOS ====================
      case 'add_photo': {
        const { url, legende } = data || {};
        if (!url) {
          return NextResponse.json({ error: 'URL photo requise' }, { status: 400 });
        }

        // Récupérer photos existantes
        const { data: record, error: fetchError } = await supabase
          .from(table)
          .select('photos_urls')
          .eq('id', niveau_id)
          .single();

        if (fetchError) {
          return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        const photos = record?.photos_urls || [];
        const newPhoto = {
          id: crypto.randomUUID(),
          url,
          legende: legende || '',
          created_at: new Date().toISOString()
        };
        photos.push(newPhoto);

        // Mettre à jour
        const { error: updateError } = await supabase
          .from(table)
          .update({ photos_urls: photos, updated_at: new Date().toISOString() })
          .eq('id', niveau_id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, photo: newPhoto });
      }

      case 'remove_photo': {
        const { photo_id } = data || {};
        if (!photo_id) {
          return NextResponse.json({ error: 'photo_id requis' }, { status: 400 });
        }

        // Récupérer photos existantes
        const { data: record, error: fetchError } = await supabase
          .from(table)
          .select('photos_urls')
          .eq('id', niveau_id)
          .single();

        if (fetchError) {
          return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        const photos = (record?.photos_urls || []).filter((p: any) => p.id !== photo_id);

        // Mettre à jour
        const { error: updateError } = await supabase
          .from(table)
          .update({ photos_urls: photos, updated_at: new Date().toISOString() })
          .eq('id', niveau_id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      case 'get_photos': {
        const { data: record, error } = await supabase
          .from(table)
          .select('photos_urls')
          .eq('id', niveau_id)
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, photos: record?.photos_urls || [] });
      }

      // ==================== VIDEOS ====================
      case 'set_video': {
        const { video_id, titre, url, thumbnail } = data || {};
        if (!video_id || !url) {
          return NextResponse.json({ error: 'video_id et url requis' }, { status: 400 });
        }

        const videoData = {
          video_id,
          titre: titre || '',
          url,
          thumbnail: thumbnail || '',
          created_at: new Date().toISOString()
        };

        // Mettre à jour (remplace l'existante)
        const { error: updateError } = await supabase
          .from(table)
          .update({ video_aide: videoData, updated_at: new Date().toISOString() })
          .eq('id', niveau_id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, video: videoData });
      }

      case 'remove_video': {
        const { error: updateError } = await supabase
          .from(table)
          .update({ video_aide: null, updated_at: new Date().toISOString() })
          .eq('id', niveau_id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      case 'get_video': {
        const { data: record, error } = await supabase
          .from(table)
          .select('video_aide')
          .eq('id', niveau_id)
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, video: record?.video_aide || null });
      }

      default:
        return NextResponse.json(
          { error: `Action inconnue: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API medias:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

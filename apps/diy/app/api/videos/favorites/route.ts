/**
 * /api/videos/favorites/route.ts
 * API CRUD pour les vidéos favorites
 * 
 * @version 1.1
 * 
 * Changelog :
 * - v1.1 : Ajout published_at, like_count, is_hd, chapters, has_chapters
 * - v1.0 : Version initiale
 * 
 * Endpoints :
 * - GET : Liste des favoris de l'utilisateur
 * - POST : Ajouter une vidéo aux favoris
 * - DELETE : Retirer une vidéo des favoris
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

// User ID par défaut (en attendant l'auth)
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// GET : Liste des favoris
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chantierId = searchParams.get('chantier_id');
    const travailId = searchParams.get('travail_id');
    
    let query = supabase
      .from('user_video_favorites')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID)
      .order('created_at', { ascending: false });
    
    // Filtres optionnels
    if (chantierId) {
      query = query.eq('chantier_id', chantierId);
    }
    if (travailId) {
      query = query.eq('travail_id', travailId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erreur GET favoris:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      favorites: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('Erreur GET favoris:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================
// POST : Ajouter aux favoris
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      video_id, 
      title, 
      thumbnail, 
      channel_title, 
      duration,
      duration_seconds,
      view_count,
      chantier_id,
      travail_id,
      notes,
      search_query,
      // v1.1 : Nouveaux champs
      published_at,
      like_count,
      is_hd,
      chapters,
      has_chapters
    } = body;
    
    if (!video_id || !title) {
      return NextResponse.json(
        { error: 'video_id et title requis' }, 
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('user_video_favorites')
      .insert({
        user_id: DEFAULT_USER_ID,
        video_id,
        title,
        thumbnail,
        channel_title,
        duration,
        duration_seconds,
        view_count,
        chantier_id: chantier_id || null,
        travail_id: travail_id || null,
        notes: notes || null,
        search_query: search_query || null,
        // v1.1 : Nouveaux champs
        published_at: published_at || null,
        like_count: like_count || 0,
        is_hd: is_hd || false,
        chapters: chapters || null,
        has_chapters: has_chapters || false
      })
      .select()
      .single();
    
    if (error) {
      // Erreur de doublon (déjà en favoris)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Vidéo déjà en favoris', code: 'ALREADY_EXISTS' }, 
          { status: 409 }
        );
      }
      console.error('Erreur POST favori:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const chaptersInfo = has_chapters ? ` (${chapters?.length || 0} chapitres)` : '';
    console.log(`⭐ Vidéo ajoutée aux favoris: ${title}${chaptersInfo}`);
    
    return NextResponse.json({ 
      success: true, 
      favorite: data 
    });
    
  } catch (error) {
    console.error('Erreur POST favori:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================
// DELETE : Retirer des favoris
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('video_id');
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'video_id requis' }, 
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('user_video_favorites')
      .delete()
      .eq('user_id', DEFAULT_USER_ID)
      .eq('video_id', videoId);
    
    if (error) {
      console.error('Erreur DELETE favori:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log(`💔 Vidéo retirée des favoris: ${videoId}`);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Erreur DELETE favori:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * /app/api/youtube/analyze/route.ts
 * API d'analyse de vidéo YouTube (chapitres + IA)
 * 
 * @version 1.0
 * 
 * Endpoints :
 * - POST : Analyse complète d'une vidéo (chapitres + type projet + étapes clés)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  analyzeVideo, 
  toVideoInspiration,
} from '@/app/lib/services/videoAnalyzerService';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ============================================
// POST : Analyse complète d'une vidéo
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_id, title, description, thumbnail, channel, duration_seconds } = body;
    
    // Cas 1 : On a déjà toutes les infos (depuis la page vidéos)
    if (video_id && title && description !== undefined) {
      console.log(`🔍 Analyse vidéo: ${title}`);
      
      const analysis = await analyzeVideo(
        video_id,
        title,
        description || '',
        thumbnail || '',
        channel || '',
        duration_seconds || 0
      );
      
      return NextResponse.json({
        success: true,
        analysis,
        inspiration: toVideoInspiration(analysis),
        message: analysis.has_chapters 
          ? `${analysis.chapters.length} chapitres détectés`
          : 'Aucun chapitre détecté dans cette vidéo'
      });
    }
    
    // Cas 2 : On a juste le video_id, il faut récupérer les infos
    if (video_id && !title) {
      if (!YOUTUBE_API_KEY) {
        return NextResponse.json(
          { error: 'Configuration YouTube API manquante' },
          { status: 500 }
        );
      }
      
      // Récupérer les détails de la vidéo via API YouTube
      const videoDetails = await fetchVideoDetails(video_id);
      
      if (!videoDetails) {
        return NextResponse.json(
          { error: 'Vidéo non trouvée' },
          { status: 404 }
        );
      }
      
      const analysis = await analyzeVideo(
        video_id,
        videoDetails.title,
        videoDetails.description,
        videoDetails.thumbnail,
        videoDetails.channel,
        videoDetails.duration_seconds
      );
      
      return NextResponse.json({
        success: true,
        analysis,
        inspiration: toVideoInspiration(analysis),
        message: analysis.has_chapters 
          ? `${analysis.chapters.length} chapitres détectés`
          : 'Aucun chapitre détecté dans cette vidéo'
      });
    }
    
    return NextResponse.json(
      { error: 'video_id requis' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Erreur analyse vidéo:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse' },
      { status: 500 }
    );
  }
}

// ============================================
// Récupérer les détails d'une vidéo YouTube
// ============================================
async function fetchVideoDetails(videoId: string): Promise<{
  title: string;
  description: string;
  thumbnail: string;
  channel: string;
  duration_seconds: number;
} | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }
    
    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    
    // Parser la durée ISO 8601 (PT1H30M45S)
    const duration_seconds = parseDuration(contentDetails.duration);
    
    return {
      title: snippet.title,
      description: snippet.description || '',
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      channel: snippet.channelTitle,
      duration_seconds
    };
    
  } catch (error) {
    console.error('Erreur fetch video details:', error);
    return null;
  }
}

// ============================================
// Parser durée ISO 8601 → secondes
// ============================================
function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

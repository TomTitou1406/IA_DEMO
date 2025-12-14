/**
 * /api/youtube/search/route.ts
 * Recherche YouTube avec whitelist dynamique et paramètres depuis BDD
 * 
 * @version 2.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

interface TrustedChannel {
  channel_name: string;
  bonus_score: number;
}

interface YouTubeSettings {
  min_views: number;
  min_duration: number;
  max_results_fetch: number;
  max_results_display: number;
  query_suffix: string;
  include_shorts: boolean;
  shorts_max_duration: number;
  shorts_max_display: number;
}

// Charger les paramètres depuis app_settings
async function getYouTubeSettings(): Promise<YouTubeSettings> {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('categorie', 'youtube');

  const settingsMap = new Map(
    (settings || []).map(s => [s.key, s.value])
  );

  return {
    min_views: parseInt(settingsMap.get('youtube_min_views') || '1000'),
    min_duration: parseInt(settingsMap.get('youtube_min_duration') || '45'),
    max_results_fetch: parseInt(settingsMap.get('youtube_max_results_fetch') || '30'),
    max_results_display: parseInt(settingsMap.get('youtube_max_results_display') || '9'),
    query_suffix: (settingsMap.get('youtube_query_suffix') || 'tuto').replace(/"/g, ''),
    include_shorts: settingsMap.get('youtube_include_shorts') === 'true',
    shorts_max_duration: parseInt(settingsMap.get('youtube_shorts_max_duration') || '60'),
    shorts_max_display: parseInt(settingsMap.get('youtube_shorts_max_display') || '6'),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 6 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API not configured' }, { status: 500 });
    }

    // Charger les paramètres depuis BDD
    const settings = await getYouTubeSettings();

    // Charger les chaînes de confiance depuis BDD
    const { data: trustedChannels } = await supabase
      .from('youtube_trusted_channels')
      .select('channel_name, bonus_score')
      .eq('est_actif', true);

    const channelMap = new Map<string, number>(
      (trustedChannels || []).map((c: TrustedChannel) => [
        c.channel_name.toLowerCase(), 
        c.bonus_score
      ])
    );

    console.log(`🎬 Recherche YouTube: "${query}" | Settings:`, settings);

    // Recherche YouTube avec paramètres dynamiques
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: `${query} ${settings.query_suffix}`,
      type: 'video',
      regionCode: 'FR',
      relevanceLanguage: 'fr',
      maxResults: String(settings.max_results_fetch),
      order: 'relevance',
      key: apiKey,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
    if (!res.ok) {
      console.error('YouTube API error:', await res.json());
      return NextResponse.json({ error: 'YouTube search failed' }, { status: 500 });
    }

    const data = await res.json();
    const videoIds = data.items?.map((item: any) => item.id.videoId).filter(Boolean) || [];

    if (videoIds.length === 0) {
      return NextResponse.json({ videos: [], shorts: [] });
    }

    // Stats détaillées
    const statsParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: apiKey,
    });

    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
    const statsData = await statsRes.json();

    // Séparer vidéos normales et Shorts
    const videos: any[] = [];
    const shorts: any[] = [];

    statsData.items?.forEach((v: any) => {
      const viewCount = parseInt(v.statistics?.viewCount || '0');
      const channelTitle = v.snippet.channelTitle;
      const duration = parseDuration(v.contentDetails?.duration);
      
      // Filtrer par vues minimum
      if (viewCount < settings.min_views) return;
      
      // Vérifier si chaîne de confiance
      const channelLower = channelTitle.toLowerCase();
      let bonusScore = 1;
      let isTrusted = false;
      
      channelMap.forEach((bonus, name) => {
        if (channelLower.includes(name)) {
          bonusScore = bonus;
          isTrusted = true;
        }
      });
      
      const score = viewCount * bonusScore;
      
      const videoData = {
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description?.substring(0, 120) || '',
        thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
        channelTitle,
        viewCount,
        duration: formatDuration(v.contentDetails?.duration),
        durationSeconds: duration,
        score,
        isTrusted,
      };

      // Classer en Short ou vidéo normale
      if (duration <= settings.shorts_max_duration) {
        if (settings.include_shorts) {
          shorts.push(videoData);
        }
      } else if (duration >= settings.min_duration) {
        videos.push(videoData);
      }
    });

    // Trier par score et limiter
    videos.sort((a, b) => b.score - a.score);
    shorts.sort((a, b) => b.score - a.score);

    const finalVideos = videos.slice(0, settings.max_results_display);
    const finalShorts = shorts.slice(0, settings.shorts_max_display);

    console.log(`✅ ${finalVideos.length} vidéos + ${finalShorts.length} shorts trouvés`);
    
    return NextResponse.json({ 
      videos: finalVideos, 
      shorts: finalShorts,
      settings: {
        include_shorts: settings.include_shorts,
        query_used: `${query} ${settings.query_suffix}`
      }
    });

  } catch (error) {
    console.error('YouTube error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
}

function formatDuration(iso: string | undefined): string {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  return h > 0 
    ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
    : `${m}:${s.toString().padStart(2,'0')}`;
}

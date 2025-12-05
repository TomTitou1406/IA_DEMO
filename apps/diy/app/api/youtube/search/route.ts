/**
 * /api/youtube/search/route.ts
 * Recherche YouTube avec whitelist dynamique depuis BDD
 * 
 * @version 1.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

interface TrustedChannel {
  channel_name: string;
  bonus_score: number;
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

    console.log(`🎬 Recherche YouTube: "${query}" | ${channelMap.size} chaînes de confiance`);

    // Recherche YouTube
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: `${query} bricolage tutoriel`,
      type: 'video',
      regionCode: 'FR',
      relevanceLanguage: 'fr',
      maxResults: String(Math.min(maxResults * 3, 25)),
      order: 'relevance',
      videoDuration: 'medium',
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
      return NextResponse.json({ videos: [] });
    }

    // Stats détaillées
    const statsParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: apiKey,
    });

    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
    const statsData = await statsRes.json();

    // Formater, filtrer et scorer
    const videos = statsData.items
      ?.map((v: any) => {
        const viewCount = parseInt(v.statistics?.viewCount || '0');
        const channelTitle = v.snippet.channelTitle;
        const duration = parseDuration(v.contentDetails?.duration);
        
        // Exclure les Shorts (< 60 secondes)
        if (duration < 60) return null;
        
        // Vérifier si chaîne de confiance
        const channelLower = channelTitle.toLowerCase();
        let bonusScore = 1;
        let isTrusted = false;
        
        for (const [name, bonus] of channelMap) {
          if (channelLower.includes(name)) {
            bonusScore = bonus;
            isTrusted = true;
            break;
          }
        }
        
        const score = viewCount * bonusScore;
        
        return {
          id: v.id,
          title: v.snippet.title,
          description: v.snippet.description?.substring(0, 120) || '',
          thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
          channelTitle,
          viewCount,
          duration: formatDuration(v.contentDetails?.duration),
          score,
          isTrusted,
        };
      })
      .filter((v: any) => v !== null && v.viewCount >= 5000)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, maxResults) || [];

    console.log(`✅ ${videos.length} vidéos trouvées`);
    return NextResponse.json({ videos });

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

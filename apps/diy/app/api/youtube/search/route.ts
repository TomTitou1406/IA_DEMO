/**
 * /api/youtube/search/route.ts
 * Recherche YouTube pour tutoriels bricolage
 */

import { NextRequest, NextResponse } from 'next/server';

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

    console.log('🎬 Recherche YouTube:', query);

    // Recherche
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: `${query} bricolage tutoriel`,
      type: 'video',
      regionCode: 'FR',
      relevanceLanguage: 'fr',
      maxResults: String(maxResults * 2),
      order: 'relevance',
      videoDuration: 'medium',
      key: apiKey,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'YouTube search failed' }, { status: 500 });
    }

    const data = await res.json();
    const videoIds = data.items?.map((item: any) => item.id.videoId).filter(Boolean) || [];

    if (videoIds.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // Stats
    const statsParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
      key: apiKey,
    });

    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
    const statsData = await statsRes.json();

    const videos = statsData.items
      ?.map((v: any) => ({
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description?.substring(0, 120) || '',
        thumbnail: v.snippet.thumbnails?.high?.url,
        channelTitle: v.snippet.channelTitle,
        viewCount: parseInt(v.statistics?.viewCount || '0'),
        duration: formatDuration(v.contentDetails?.duration),
      }))
      .filter((v: any) => v.viewCount >= 5000)
      .sort((a: any, b: any) => b.viewCount - a.viewCount)
      .slice(0, maxResults) || [];

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('YouTube error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function formatDuration(iso: string | undefined): string {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const h = m[1] ? parseInt(m[1]) : 0;
  const min = m[2] ? parseInt(m[2]) : 0;
  const sec = m[3] ? parseInt(m[3]) : 0;
  return h > 0 
    ? `${h}:${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
    : `${min}:${sec.toString().padStart(2,'0')}`;
}

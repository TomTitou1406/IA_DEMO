/**
 * /api/youtube/search/route.ts
 * Recherche YouTube avec évaluation IA de la pertinence
 * 
 * @version 3.5
 * 
 * Changelog :
 * - v3.5 : Ajout parsing chapitres + description complète + hasChapters
 * - v3.4 : Ajout publishedAt, likeCount, isHD pour enrichir les cards
 * - v3.3 : Ajout displaySettings dans searchInfo (pagination dynamique)
 * - v3.2 : Retourne TOUS les résultats pour pagination côté client
 * - v3.1 : Prompt depuis BDD, évaluation Shorts, filtre FR
 * - v3.0 : Évaluation IA de la pertinence
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

// ============================================
// TYPES
// ============================================

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
  ai_enabled: boolean;
  ai_min_score: number;
  ai_max_retries: number;
}

interface VideoChapter {
  title: string;
  start_seconds: number;
  start_formatted: string;
}

interface VideoResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  viewCount: number;
  duration: string;
  durationSeconds: number;
  score: number;
  isTrusted: boolean;
  isShort: boolean;
  aiScore?: number;
  aiReason?: string;
  // v3.4 : Infos enrichies
  publishedAt: string;
  likeCount: number;
  isHD: boolean;
  // v3.5 : Chapitres
  hasChapters: boolean;
  chapters: VideoChapter[];
}

interface AIEvaluation {
  scores: Array<{
    index: number;
    score: number;
    reason: string;
  }>;
  averageScore: number;
  suggestedQuery?: string;
}

interface SearchInfo {
  originalQuery: string;
  finalQuery: string;
  attempts: number;
  averageScore: number;
  aiEnabled: boolean;
  status: 'excellent' | 'good' | 'acceptable' | 'limited';
  totalVideos: number;
  totalShorts: number;
  displaySettings: {
    videosPerPage: number;
    shortsPerPage: number;
  };
}

interface PromptConfig {
  prompt_text: string;
  temperature: number;
  max_tokens: number;
  model: string;
}

// ============================================
// PARSING DES CHAPITRES
// ============================================

function parseChaptersFromDescription(description: string): VideoChapter[] {
  if (!description) return [];
  
  const chapters: VideoChapter[] = [];
  
  // Regex universelle : capture "H:MM:SS" ou "MM:SS" ou "M:SS" suivi de texte
  const regex = /(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})\s*[•·\-–—]?\s*([A-Za-zÀ-ÿ][^0-9]*?)(?=\s*\d{1,2}:\d{2}|$|\n)/g;
  
  let match;
  while ((match = regex.exec(description)) !== null) {
    const timestamp = match[1];
    let title = match[2].trim();
    
    // Nettoyer le titre
    title = title
      .replace(/^[•·\-–—:]\s*/, '')
      .replace(/[•·\-–—:]\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Ignorer si titre trop court ou trop long
    if (title.length >= 2 && title.length < 80) {
      const seconds = parseTimestampToSeconds(timestamp);
      
      // Éviter les doublons
      if (!chapters.some(c => c.start_seconds === seconds)) {
        chapters.push({
          title,
          start_seconds: seconds,
          start_formatted: timestamp
        });
      }
    }
  }
  
  // Trier par timestamp
  chapters.sort((a, b) => a.start_seconds - b.start_seconds);
  
  // Filtrer les chapitres non pertinents (intro, outro, etc.)
  const filteredChapters = filterRelevantChapters(chapters);
  
  return filteredChapters;
}

function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(p => parseInt(p));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

function filterRelevantChapters(chapters: VideoChapter[]): VideoChapter[] {
  const excludePatterns = [
    /^intro(duction)?$/i,
    /^outro$/i,
    /^conclusion$/i,
    /^générique/i,
    /^pub(licité)?$/i,
    /^sponsor/i,
    /^partenaire/i,
    /^abonne/i,
    /^like/i,
    /^merci/i,
    /^au revoir/i,
    /^à bientôt/i,
  ];
  
  return chapters.filter(chapter => {
    const title = chapter.title.toLowerCase();
    return !excludePatterns.some(pattern => pattern.test(title));
  });
}

// ============================================
// CHARGEMENT PARAMÈTRES BDD
// ============================================

async function getYouTubeSettings(): Promise<YouTubeSettings> {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .eq('categorie', 'youtube');

  const settingsMap = new Map(
    (settings || []).map(s => [s.key, s.value])
  );

  const getValue = (key: string, defaultValue: string): string => {
    const val = settingsMap.get(key);
    if (val === null || val === undefined) return defaultValue;
    return String(val).replace(/"/g, '');
  };

  return {
    min_views: parseInt(getValue('youtube_min_views', '1000')),
    min_duration: parseInt(getValue('youtube_min_duration', '45')),
    max_results_fetch: parseInt(getValue('youtube_max_results_fetch', '30')),
    max_results_display: parseInt(getValue('youtube_max_results_display', '9')),
    query_suffix: getValue('youtube_query_suffix', 'tuto'),
    include_shorts: getValue('youtube_include_shorts', 'false') === 'true',
    shorts_max_duration: parseInt(getValue('youtube_shorts_max_duration', '60')),
    shorts_max_display: parseInt(getValue('youtube_shorts_max_display', '6')),
    ai_enabled: getValue('youtube_ai_enabled', 'false') === 'true',
    ai_min_score: parseInt(getValue('youtube_ai_min_score', '6')),
    ai_max_retries: parseInt(getValue('youtube_ai_max_retries', '2')),
  };
}

async function getEvaluationPrompt(): Promise<PromptConfig | null> {
  const { data, error } = await supabase
    .from('prompts_library')
    .select('prompt_text, temperature, max_tokens, model')
    .eq('code', 'system_youtube_evaluation')
    .eq('est_actif', true)
    .single();

  if (error || !data) {
    console.warn('⚠️ Prompt system_youtube_evaluation non trouvé en BDD');
    return null;
  }

  return {
    prompt_text: data.prompt_text,
    temperature: data.temperature || 0.3,
    max_tokens: data.max_tokens || 1000,
    model: data.model || 'gpt-4o-mini',
  };
}

// ============================================
// ÉVALUATION IA DES RÉSULTATS
// ============================================

async function evaluateWithAI(
  allResults: VideoResult[],
  userQuery: string,
  minScore: number,
  promptConfig: PromptConfig
): Promise<AIEvaluation> {
  
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn('⚠️ OpenAI API key non configurée, évaluation IA désactivée');
    return {
      scores: allResults.map((_, i) => ({ index: i + 1, score: 5, reason: 'Évaluation non disponible' })),
      averageScore: 5
    };
  }

  const videoList = allResults
    .map((v, i) => {
      const shortIndicator = v.isShort ? ' [SHORT]' : '';
      const chapterIndicator = v.hasChapters ? ` [${v.chapters.length} chapitres]` : '';
      return `${i + 1}. "${v.title}"${shortIndicator}${chapterIndicator} - Chaîne: ${v.channelTitle} - ${v.viewCount} vues`;
    })
    .join('\n');

  const prompt = promptConfig.prompt_text
    .replace(/\{\{USER_QUERY\}\}/g, userQuery)
    .replace(/\{\{VIDEO_LIST\}\}/g, videoList)
    .replace(/\{\{MIN_SCORE\}\}/g, String(minScore));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: promptConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: promptConfig.temperature,
        max_tokens: promptConfig.max_tokens,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('OpenAI API failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const evaluation = JSON.parse(cleanJson);
    
    const avgScore = evaluation.scores.reduce((sum: number, s: any) => sum + s.score, 0) / evaluation.scores.length;
    
    return {
      scores: evaluation.scores,
      averageScore: Math.round(avgScore * 10) / 10,
      suggestedQuery: avgScore < minScore ? evaluation.suggestedQuery : undefined
    };

  } catch (error) {
    console.error('Erreur évaluation IA:', error);
    return {
      scores: allResults.map((_, i) => ({ index: i + 1, score: 5, reason: 'Erreur évaluation' })),
      averageScore: 5
    };
  }
}

// ============================================
// RECHERCHE YOUTUBE
// ============================================

async function searchYouTube(
  query: string,
  apiKey: string,
  maxResults: number
): Promise<any[]> {
  
  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    regionCode: 'FR',
    relevanceLanguage: 'fr',
    maxResults: String(maxResults),
    order: 'relevance',
    key: apiKey,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
  if (!res.ok) {
    console.error('YouTube API error:', await res.json());
    throw new Error('YouTube search failed');
  }

  const data = await res.json();
  return data.items || [];
}

async function getVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<any[]> {
  
  if (videoIds.length === 0) return [];

  const statsParams = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(','),
    key: apiKey,
  });

  const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
  const statsData = await statsRes.json();
  return statsData.items || [];
}

// ============================================
// ROUTE PRINCIPALE
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API not configured' }, { status: 500 });
    }

    const settings = await getYouTubeSettings();
    const promptConfig = await getEvaluationPrompt();

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

    console.log(`🎬 Recherche YouTube: "${query}" | IA: ${settings.ai_enabled}`);

    let currentQuery = `${query} ${settings.query_suffix}`;
    const originalQuery = query;
    let attempts = 0;
    let finalVideos: VideoResult[] = [];
    let finalShorts: VideoResult[] = [];
    let lastEvaluation: AIEvaluation | null = null;

    while (attempts <= settings.ai_max_retries) {
      attempts++;
      console.log(`🔍 Tentative ${attempts}: "${currentQuery}"`);

      const searchResults = await searchYouTube(currentQuery, apiKey, settings.max_results_fetch);
      const videoIds = searchResults.map((item: any) => item.id.videoId).filter(Boolean);

      if (videoIds.length === 0) {
        console.log('❌ Aucun résultat YouTube');
        break;
      }

      const videoDetails = await getVideoDetails(videoIds, apiKey);
      const allResults: VideoResult[] = [];

      videoDetails.forEach((v: any) => {
        const viewCount = parseInt(v.statistics?.viewCount || '0');
        const likeCount = parseInt(v.statistics?.likeCount || '0');
        const channelTitle = v.snippet.channelTitle;
        const duration = parseDuration(v.contentDetails?.duration);
        const publishedAt = v.snippet.publishedAt || '';
        const isHD = v.contentDetails?.definition === 'hd';
        
        // v3.5 : Parser les chapitres depuis la description
        const fullDescription = v.snippet.description || '';
        const chapters = parseChaptersFromDescription(fullDescription);
        const hasChapters = chapters.length >= 2;

        if (viewCount < settings.min_views) return;

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
        const isShort = duration <= settings.shorts_max_duration;

        if (isShort && !settings.include_shorts) return;
        if (!isShort && duration < settings.min_duration) return;

        const videoData: VideoResult = {
          id: v.id,
          title: v.snippet.title,
          description: fullDescription, // v3.5 : Description complète
          thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
          channelTitle,
          viewCount,
          duration: formatDuration(v.contentDetails?.duration),
          durationSeconds: duration,
          score,
          isTrusted,
          isShort,
          publishedAt,
          likeCount,
          isHD,
          // v3.5 : Chapitres
          hasChapters,
          chapters,
        };

        allResults.push(videoData);
      });

      // Log des chapitres détectés
      const withChapters = allResults.filter(v => v.hasChapters).length;
      console.log(`📑 ${withChapters}/${allResults.length} vidéos avec chapitres`);

      if (settings.ai_enabled && allResults.length > 0 && promptConfig) {
        console.log(`🤖 Évaluation IA de ${allResults.length} résultats...`);
        lastEvaluation = await evaluateWithAI(allResults, originalQuery, settings.ai_min_score, promptConfig);
        console.log(`📊 Score moyen: ${lastEvaluation.averageScore}/10`);

        lastEvaluation.scores.forEach((s) => {
          if (allResults[s.index - 1]) {
            allResults[s.index - 1].aiScore = s.score;
            allResults[s.index - 1].aiReason = s.reason;
          }
        });

        if (
          lastEvaluation.averageScore < settings.ai_min_score &&
          lastEvaluation.suggestedQuery &&
          attempts <= settings.ai_max_retries
        ) {
          console.log(`🔄 Reformulation suggérée: "${lastEvaluation.suggestedQuery}"`);
          currentQuery = lastEvaluation.suggestedQuery;
          continue;
        }
      }

      const videos = allResults.filter(v => !v.isShort);
      const shorts = allResults.filter(v => v.isShort);

      if (settings.ai_enabled) {
        const filteredVideos = videos.filter(v => (v.aiScore || 5) >= 3);
        const filteredShorts = shorts.filter(v => (v.aiScore || 5) >= 3);
        
        filteredVideos.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0) || b.score - a.score);
        filteredShorts.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0) || b.score - a.score);
        
        finalVideos = filteredVideos;
        finalShorts = filteredShorts;
      } else {
        videos.sort((a, b) => b.score - a.score);
        shorts.sort((a, b) => b.score - a.score);
        
        finalVideos = videos;
        finalShorts = shorts;
      }
      
      break;
    }

    const avgScore = lastEvaluation?.averageScore || 0;
    let status: SearchInfo['status'] = 'acceptable';
    if (avgScore >= 8) status = 'excellent';
    else if (avgScore >= 6) status = 'good';
    else if (avgScore >= 4) status = 'acceptable';
    else status = 'limited';

    const searchInfo: SearchInfo = {
      originalQuery,
      finalQuery: currentQuery,
      attempts,
      averageScore: lastEvaluation?.averageScore || 0,
      aiEnabled: settings.ai_enabled,
      status,
      totalVideos: finalVideos.length,
      totalShorts: finalShorts.length,
      displaySettings: {
        videosPerPage: settings.max_results_display,
        shortsPerPage: settings.shorts_max_display,
      },
    };

    console.log(`✅ ${finalVideos.length} vidéos + ${finalShorts.length} shorts | Status: ${status}`);

    return NextResponse.json({
      videos: finalVideos,
      shorts: finalShorts,
      searchInfo,
    });

  } catch (error) {
    console.error('YouTube error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// ============================================
// UTILITAIRES
// ============================================

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
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

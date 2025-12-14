/**
 * /api/youtube/search/route.ts
 * Recherche YouTube avec évaluation IA de la pertinence
 * 
 * @version 3.0
 * 
 * Fonctionnalités :
 * - Paramètres dynamiques depuis BDD (app_settings)
 * - Chaînes de confiance (youtube_trusted_channels)
 * - Évaluation IA de chaque vidéo (pertinence 0-10)
 * - Reformulation automatique si résultats peu pertinents
 * - Séparation vidéos / shorts
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
  // Paramètres IA
  ai_enabled: boolean;
  ai_min_score: number;
  ai_max_retries: number;
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
  aiScore?: number;
  aiReason?: string;
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

  // Helper pour parser les valeurs (peuvent être string ou autre selon JSONB)
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
    // Paramètres IA
    ai_enabled: getValue('youtube_ai_enabled', 'false') === 'true',
    ai_min_score: parseInt(getValue('youtube_ai_min_score', '6')),
    ai_max_retries: parseInt(getValue('youtube_ai_max_retries', '2')),
  };
}

// ============================================
// ÉVALUATION IA DES RÉSULTATS
// ============================================

async function evaluateWithAI(
  videos: VideoResult[],
  userQuery: string,
  minScore: number
): Promise<AIEvaluation> {
  
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn('⚠️ OpenAI API key non configurée, évaluation IA désactivée');
    return {
      scores: videos.map((_, i) => ({ index: i, score: 5, reason: 'Évaluation non disponible' })),
      averageScore: 5
    };
  }

  const videoList = videos
    .map((v, i) => `${i + 1}. "${v.title}" - Chaîne: ${v.channelTitle} - ${v.viewCount} vues`)
    .join('\n');

  const prompt = `Tu es un expert en bricolage et DIY. L'utilisateur cherche des tutoriels vidéo pour : "${userQuery}"

Voici les vidéos trouvées sur YouTube :
${videoList}

ÉVALUE chaque vidéo selon sa pertinence par rapport à la demande "${userQuery}".

Critères d'évaluation :
- 9-10 : Exactement ce que l'utilisateur cherche (titre contient les mots-clés exacts)
- 7-8 : Très pertinent, couvre bien le sujet
- 5-6 : Partiellement pertinent, peut aider
- 3-4 : Peu pertinent, sujet connexe mais pas la demande
- 0-2 : Hors sujet

IMPORTANT : Sois strict ! Une vidéo sur "abri de jardin" n'est PAS pertinente pour "cabane de jardin". Une vidéo sur "barbecue" n'est PAS pertinente pour "cuisine d'été".

Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) :
{
  "scores": [
    {"index": 1, "score": 8, "reason": "Raison courte"},
    {"index": 2, "score": 3, "reason": "Raison courte"}
  ],
  "suggestedQuery": "nouvelle requête si moyenne < ${minScore}, sinon null"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('OpenAI API failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parser le JSON (nettoyer si nécessaire)
    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const evaluation = JSON.parse(cleanJson);
    
    // Calculer la moyenne
    const avgScore = evaluation.scores.reduce((sum: number, s: any) => sum + s.score, 0) / evaluation.scores.length;
    
    return {
      scores: evaluation.scores,
      averageScore: Math.round(avgScore * 10) / 10,
      suggestedQuery: avgScore < minScore ? evaluation.suggestedQuery : undefined
    };

  } catch (error) {
    console.error('Erreur évaluation IA:', error);
    return {
      scores: videos.map((_, i) => ({ index: i, score: 5, reason: 'Erreur évaluation' })),
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
    const { query, maxResults = 9 } = await request.json();

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

    console.log(`🎬 Recherche YouTube: "${query}" | IA: ${settings.ai_enabled}`);

    // Variables pour la boucle de recherche
    let currentQuery = `${query} ${settings.query_suffix}`;
    const originalQuery = query;
    let attempts = 0;
    let finalVideos: VideoResult[] = [];
    let finalShorts: VideoResult[] = [];
    let lastEvaluation: AIEvaluation | null = null;

    // Boucle de recherche avec reformulation IA
    while (attempts <= settings.ai_max_retries) {
      attempts++;
      console.log(`🔍 Tentative ${attempts}: "${currentQuery}"`);

      // 1. Recherche YouTube
      const searchResults = await searchYouTube(currentQuery, apiKey, settings.max_results_fetch);
      const videoIds = searchResults.map((item: any) => item.id.videoId).filter(Boolean);

      if (videoIds.length === 0) {
        console.log('❌ Aucun résultat YouTube');
        break;
      }

      // 2. Récupérer les détails
      const videoDetails = await getVideoDetails(videoIds, apiKey);

      // 3. Traiter et filtrer les résultats
      const videos: VideoResult[] = [];
      const shorts: VideoResult[] = [];

      videoDetails.forEach((v: any) => {
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

        const videoData: VideoResult = {
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

      // 4. Évaluation IA (si activée)
      if (settings.ai_enabled && videos.length > 0) {
        console.log('🤖 Évaluation IA en cours...');
        lastEvaluation = await evaluateWithAI(videos, originalQuery, settings.ai_min_score);
        console.log(`📊 Score moyen: ${lastEvaluation.averageScore}/10`);

        // Enrichir les vidéos avec les scores IA
        lastEvaluation.scores.forEach((s) => {
          if (videos[s.index - 1]) {
            videos[s.index - 1].aiScore = s.score;
            videos[s.index - 1].aiReason = s.reason;
          }
        });

        // Si pertinence insuffisante et suggestion disponible, reformuler
        if (
          lastEvaluation.averageScore < settings.ai_min_score &&
          lastEvaluation.suggestedQuery &&
          attempts <= settings.ai_max_retries
        ) {
          console.log(`🔄 Reformulation suggérée: "${lastEvaluation.suggestedQuery}"`);
          currentQuery = lastEvaluation.suggestedQuery;
          continue; // Relancer la recherche
        }
      }

      // 5. Trier par score IA puis par vues
      if (settings.ai_enabled) {
        videos.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0) || b.score - a.score);
      } else {
        videos.sort((a, b) => b.score - a.score);
      }
      shorts.sort((a, b) => b.score - a.score);

      finalVideos = videos.slice(0, settings.max_results_display);
      finalShorts = shorts.slice(0, settings.shorts_max_display);
      break; // Sortir de la boucle
    }

    // Déterminer le statut de la recherche
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

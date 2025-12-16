/**
 * /app/lib/services/videoAnalyzerService.ts
 * Service d'analyse de vidéos YouTube pour extraction des chapitres et analyse IA
 * 
 * @version 1.0
 * 
 * Fonctionnalités :
 * - Extraction des chapitres depuis la description YouTube
 * - Analyse IA du titre/description pour identifier le type de projet
 * - Génération des étapes clés pour guider le phasage
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== INTERFACES ====================

export interface VideoChapter {
  title: string;
  start_seconds: number;
  start_formatted: string; // "2:30" ou "1:05:30"
}

export interface VideoAIAnalysis {
  type_projet: string;
  complexity: 'simple' | 'complexe';
  etapes_cles: string[];
  expertise_principale?: string;
  materiaux_suggeres?: string[];
  outils_suggeres?: string[];
}

export interface VideoAnalysis {
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  channel: string;
  duration_seconds: number;
  has_chapters: boolean;
  chapters: VideoChapter[];
  ai_analysis: VideoAIAnalysis | null;
  analyzed_at: string;
}

export interface VideoInspiration {
  video_id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration_seconds: number;
  chapters: VideoChapter[];
  etapes_cles: string[];
  type_projet?: string;
  complexity?: 'simple' | 'complexe';
}

// ==================== EXTRACTION CHAPITRES ====================

/**
 * Parse les chapitres depuis la description YouTube
 * Détecte tous les formats : ligne, inline, avec ou sans séparateurs
 */
export function parseChaptersFromDescription(description: string): VideoChapter[] {
  if (!description) return [];
  
  const chapters: VideoChapter[] = [];
  
  // Regex universelle : capture "H:MM:SS" ou "MM:SS" ou "M:SS" suivi de texte
  // Le texte s'arrête au prochain timestamp ou à la fin
  const regex = /(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})\s*[•·\-–—]?\s*([A-Za-zÀ-ÿ][^0-9]*?)(?=\s*\d{1,2}:\d{2}|$|\n)/g;
  
  let match;
  while ((match = regex.exec(description)) !== null) {
    const timestamp = match[1];
    let title = match[2].trim();
    
    // Nettoyer le titre
    title = title
      .replace(/^[•·\-–—:]\s*/, '')  // Enlever séparateurs au début
      .replace(/[•·\-–—:]\s*$/, '')  // Enlever séparateurs à la fin
      .replace(/\s+/g, ' ')           // Normaliser espaces
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
  
  return chapters;
}

function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(p => parseInt(p));
  if (parts.length === 3) {
    // H:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  // M:SS ou MM:SS
  return parts[0] * 60 + parts[1];
}

/**
 * Filtre les chapitres pour ne garder que les étapes pertinentes
 * (exclut intro, outro, pub, etc.)
 */
export function filterRelevantChapters(chapters: VideoChapter[]): VideoChapter[] {
  const excludePatterns = [
    /^intro(duction)?$/i,
    /^outro$/i,
    /^conclusion$/i,
    /^g[ée]n[ée]rique/i,
    /^pub(licit[ée])?$/i,
    /^sponsor/i,
    /^partenaire/i,
    /^abonne/i,
    /^like/i,
    /^merci/i,
    /^au revoir/i,
    /^[àa] bient[ôo]t/i,
  ];
  
  return chapters.filter(chapter => {
    const title = chapter.title.toLowerCase();
    return !excludePatterns.some(pattern => pattern.test(title));
  });
}

// ==================== ANALYSE IA ====================

/**
 * Analyse la vidéo avec l'IA pour extraire le type de projet et les étapes clés
 */
export async function analyzeVideoWithAI(
  title: string,
  description: string,
  chapters: VideoChapter[]
): Promise<VideoAIAnalysis | null> {
  try {
    // Charger le prompt depuis la BDD
    const { data: promptData } = await supabase
      .from('prompts_library')
      .select('prompt_text, model, temperature')
      .eq('code', 'system_video_analysis')
      .eq('est_actif', true)
      .single();
    
    if (!promptData) {
      console.warn('Prompt system_video_analysis non trouvé, utilisation du fallback');
      return analyzeVideoFallback(title, chapters);
    }
    
    // Construire le contexte
    const chaptersText = chapters.length > 0
      ? chapters.map((c, i) => `${i + 1}. ${c.title}`).join('\n')
      : 'Aucun chapitre disponible';
    
    const userMessage = `
VIDÉO À ANALYSER :
Titre : ${title}

Chapitres détectés :
${chaptersText}

Description (extrait) :
${description.substring(0, 500)}
`.trim();
    
    // Appel API OpenAI
    const response = await fetch('/api/openai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: promptData.prompt_text,
        userMessage,
        model: promptData.model || 'gpt-4o-mini',
        temperature: promptData.temperature || 0.3,
        responseFormat: 'json'
      })
    });
    
    if (!response.ok) {
      console.error('Erreur API OpenAI:', response.status);
      return analyzeVideoFallback(title, chapters);
    }
    
    const data = await response.json();
    return data.analysis as VideoAIAnalysis;
    
  } catch (error) {
    console.error('Erreur analyse IA vidéo:', error);
    return analyzeVideoFallback(title, chapters);
  }
}

/**
 * Fallback simple si l'IA n'est pas disponible
 */
function analyzeVideoFallback(title: string, chapters: VideoChapter[]): VideoAIAnalysis {
  // Détection basique du type de projet depuis le titre
  const titleLower = title.toLowerCase();
  
  let type_projet = 'bricolage';
  let expertise_principale = 'general';
  
  if (titleLower.includes('plomberie') || titleLower.includes('wc') || titleLower.includes('robinet') || titleLower.includes('fuite')) {
    type_projet = 'plomberie';
    expertise_principale = 'plomberie';
  } else if (titleLower.includes('électr') || titleLower.includes('prise') || titleLower.includes('interrupteur')) {
    type_projet = 'électricité';
    expertise_principale = 'electricite';
  } else if (titleLower.includes('carrelage') || titleLower.includes('faïence')) {
    type_projet = 'carrelage';
    expertise_principale = 'carrelage';
  } else if (titleLower.includes('peinture') || titleLower.includes('peindre')) {
    type_projet = 'peinture';
    expertise_principale = 'peinture';
  } else if (titleLower.includes('parquet') || titleLower.includes('sol') || titleLower.includes('stratifié')) {
    type_projet = 'revêtement sol';
    expertise_principale = 'revetement';
  } else if (titleLower.includes('salle de bain') || titleLower.includes('sdb')) {
    type_projet = 'rénovation salle de bain';
    expertise_principale = 'plomberie';
  } else if (titleLower.includes('cuisine')) {
    type_projet = 'aménagement cuisine';
    expertise_principale = 'menuiserie';
  }
  
  // Complexité basée sur la durée des chapitres
  const complexity = chapters.length > 5 ? 'complexe' : 'simple';
  
  // Étapes clés = titres des chapitres filtrés
  const relevantChapters = filterRelevantChapters(chapters);
  const etapes_cles = relevantChapters.map(c => c.title);
  
  return {
    type_projet,
    complexity,
    etapes_cles,
    expertise_principale
  };
}

// ==================== FONCTION PRINCIPALE ====================

/**
 * Analyse complète d'une vidéo YouTube
 */
export async function analyzeVideo(
  videoId: string,
  title: string,
  description: string,
  thumbnail: string,
  channel: string,
  durationSeconds: number
): Promise<VideoAnalysis> {
  // 1. Extraire les chapitres
  const allChapters = parseChaptersFromDescription(description);
  const chapters = filterRelevantChapters(allChapters);
  const has_chapters = chapters.length >= 2; // Au moins 2 chapitres significatifs
  
  // 2. Analyse IA (si chapitres disponibles ou fallback)
  let ai_analysis: VideoAIAnalysis | null = null;
  
  if (has_chapters) {
    ai_analysis = await analyzeVideoWithAI(title, description, chapters);
  } else {
    // Pas de chapitres → analyse basique depuis le titre uniquement
    ai_analysis = analyzeVideoFallback(title, []);
  }
  
  return {
    video_id: videoId,
    title,
    description,
    thumbnail,
    channel,
    duration_seconds: durationSeconds,
    has_chapters,
    chapters,
    ai_analysis,
    analyzed_at: new Date().toISOString()
  };
}

// ==================== HELPERS POUR STOCKAGE ====================

/**
 * Convertit une analyse en objet VideoInspiration pour stockage BDD
 */
export function toVideoInspiration(analysis: VideoAnalysis): VideoInspiration {
  return {
    video_id: analysis.video_id,
    title: analysis.title,
    thumbnail: analysis.thumbnail,
    channel: analysis.channel,
    duration_seconds: analysis.duration_seconds,
    chapters: analysis.chapters,
    etapes_cles: analysis.ai_analysis?.etapes_cles || [],
    type_projet: analysis.ai_analysis?.type_projet,
    complexity: analysis.ai_analysis?.complexity
  };
}

/**
 * Sauvegarde la vidéo d'inspiration dans un chantier
 */
export async function saveVideoInspirationToChantier(
  chantierId: string,
  videoInspiration: VideoInspiration
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chantiers')
      .update({ video_inspiration: videoInspiration })
      .eq('id', chantierId);
    
    if (error) {
      console.error('Erreur sauvegarde video_inspiration:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erreur saveVideoInspirationToChantier:', error);
    return false;
  }
}

/**
 * Sauvegarde une vidéo d'aide sur un lot
 */
export async function saveVideoAideToLot(
  lotId: string,
  videoAide: VideoInspiration
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('travaux')
      .update({ video_aide: videoAide })
      .eq('id', lotId);
    
    return !error;
  } catch (error) {
    console.error('Erreur saveVideoAideToLot:', error);
    return false;
  }
}

/**
 * Sauvegarde une vidéo d'aide sur une étape
 */
export async function saveVideoAideToEtape(
  etapeId: string,
  videoAide: VideoInspiration
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('etapes')
      .update({ video_aide: videoAide })
      .eq('id', etapeId);
    
    return !error;
  } catch (error) {
    console.error('Erreur saveVideoAideToEtape:', error);
    return false;
  }
}

/**
 * Récupère la vidéo d'inspiration d'un chantier
 */
export async function getVideoInspirationFromChantier(
  chantierId: string
): Promise<VideoInspiration | null> {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .select('video_inspiration')
      .eq('id', chantierId)
      .single();
    
    if (error || !data?.video_inspiration) return null;
    return data.video_inspiration as VideoInspiration;
  } catch (error) {
    return null;
  }
}

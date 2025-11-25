/**
 * expertiseService.ts
 * 
 * Service de gestion des expertises IA pour Papibricole DIY
 * Détection, récupération et switch d'expertise
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface Expertise {
  id: string;
  code: string;
  nom: string;
  description?: string;
  categorie: string;
  sous_categorie?: string;
  prompt_system_base: string;
  prompt_variables?: any[];
  prompt_version?: string;
  mots_cles: string[];
  normes_reference?: string[];
  materiel_specifique?: string[];
  materiaux_specifiques?: string[];
  niveau_difficulte_min: string;
  niveau_risque: string;
  triggers_activation?: object;
  nb_utilisations?: number;
  note_moyenne?: number;
  nb_evaluations?: number;
  est_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DetectionResult {
  expertise: Expertise | null;
  confidence: number;           // 0-100
  method: 'keywords' | 'ai' | 'none';
  matchedKeywords?: string[];   // Si méthode keywords
  reasoning?: string;           // Si méthode IA
}

interface KeywordMatch {
  expertise: Expertise;
  matchedKeywords: string[];
  score: number;
}

// ==================== CACHE ====================

let expertisesCache: Expertise[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Invalide le cache des expertises
 */
export function invalidateExpertisesCache(): void {
  expertisesCache = null;
  cacheTimestamp = 0;
}

// ==================== RÉCUPÉRATION ====================

/**
 * Récupère toutes les expertises actives (avec cache)
 */
export async function getAllActiveExpertises(): Promise<Expertise[]> {
  const now = Date.now();

  // Utiliser le cache si valide
  if (expertisesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return expertisesCache;
  }

  try {
    const { data, error } = await supabase
      .from('expertises')
      .select('*')
      .eq('est_active', true)
      .order('categorie', { ascending: true })
      .order('nom', { ascending: true });

    if (error) throw error;

    // Parser les champs JSONB si nécessaire
    const expertises = (data || []).map(exp => ({
      ...exp,
      mots_cles: Array.isArray(exp.mots_cles) ? exp.mots_cles : JSON.parse(exp.mots_cles || '[]'),
      normes_reference: Array.isArray(exp.normes_reference) ? exp.normes_reference : JSON.parse(exp.normes_reference || '[]'),
      materiel_specifique: Array.isArray(exp.materiel_specifique) ? exp.materiel_specifique : JSON.parse(exp.materiel_specifique || '[]'),
      materiaux_specifiques: Array.isArray(exp.materiaux_specifiques) ? exp.materiaux_specifiques : JSON.parse(exp.materiaux_specifiques || '[]'),
    }));

    // Mettre en cache
    expertisesCache = expertises;
    cacheTimestamp = now;

    return expertises;
  } catch (error) {
    console.error('Error fetching expertises:', error);
    return [];
  }
}

/**
 * Récupère une expertise par son code
 */
export async function getExpertiseByCode(code: string): Promise<Expertise | null> {
  try {
    // Essayer le cache d'abord
    const cached = expertisesCache?.find(e => e.code === code);
    if (cached) return cached;

    // Sinon requête BDD
    const { data, error } = await supabase
      .from('expertises')
      .select('*')
      .eq('code', code)
      .eq('est_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Parser les champs JSONB
    return {
      ...data,
      mots_cles: Array.isArray(data.mots_cles) ? data.mots_cles : JSON.parse(data.mots_cles || '[]'),
      normes_reference: Array.isArray(data.normes_reference) ? data.normes_reference : JSON.parse(data.normes_reference || '[]'),
      materiel_specifique: Array.isArray(data.materiel_specifique) ? data.materiel_specifique : JSON.parse(data.materiel_specifique || '[]'),
      materiaux_specifiques: Array.isArray(data.materiaux_specifiques) ? data.materiaux_specifiques : JSON.parse(data.materiaux_specifiques || '[]'),
    };
  } catch (error) {
    console.error('Error getting expertise by code:', error);
    return null;
  }
}

/**
 * Récupère une expertise par son ID
 */
export async function getExpertiseById(id: string): Promise<Expertise | null> {
  try {
    // Essayer le cache d'abord
    const cached = expertisesCache?.find(e => e.id === id);
    if (cached) return cached;

    // Sinon requête BDD
    const { data, error } = await supabase
      .from('expertises')
      .select('*')
      .eq('id', id)
      .eq('est_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Parser les champs JSONB
    return {
      ...data,
      mots_cles: Array.isArray(data.mots_cles) ? data.mots_cles : JSON.parse(data.mots_cles || '[]'),
      normes_reference: Array.isArray(data.normes_reference) ? data.normes_reference : JSON.parse(data.normes_reference || '[]'),
      materiel_specifique: Array.isArray(data.materiel_specifique) ? data.materiel_specifique : JSON.parse(data.materiel_specifique || '[]'),
      materiaux_specifiques: Array.isArray(data.materiaux_specifiques) ? data.materiaux_specifiques : JSON.parse(data.materiaux_specifiques || '[]'),
    };
  } catch (error) {
    console.error('Error getting expertise by id:', error);
    return null;
  }
}

// ==================== DÉTECTION PAR MOTS-CLÉS ====================

/**
 * Normalise un texte pour la comparaison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime accents
    .replace(/[^a-z0-9\s]/g, ' ')    // Garde que lettres/chiffres
    .replace(/\s+/g, ' ')            // Normalise espaces
    .trim();
}

/**
 * Détection rapide via mots-clés (sans appel API)
 */
export async function detectExpertiseFromKeywords(text: string): Promise<DetectionResult> {
  const expertises = await getAllActiveExpertises();
  const normalizedText = normalizeText(text);
  const textWords = normalizedText.split(' ');

  const matches: KeywordMatch[] = [];

  for (const expertise of expertises) {
    const matchedKeywords: string[] = [];
    
    for (const keyword of expertise.mots_cles) {
      const normalizedKeyword = normalizeText(keyword);
      
      // Match exact ou partiel (le mot-clé est contenu dans le texte)
      if (normalizedText.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword);
      } else {
        // Match par mots individuels pour mots-clés composés
        const keywordWords = normalizedKeyword.split(' ');
        const allWordsMatch = keywordWords.every(kw => 
          textWords.some(tw => tw.includes(kw) || kw.includes(tw))
        );
        if (allWordsMatch && keywordWords.length > 1) {
          matchedKeywords.push(keyword);
        }
      }
    }

    if (matchedKeywords.length > 0) {
      // Score basé sur : nombre de matches + longueur des keywords matchés
      const score = matchedKeywords.reduce((acc, kw) => {
        const weight = kw.split(' ').length; // Mots composés = plus de poids
        return acc + (10 * weight);
      }, 0);

      matches.push({
        expertise,
        matchedKeywords,
        score
      });
    }
  }

  // Trier par score décroissant
  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return {
      expertise: null,
      confidence: 0,
      method: 'keywords',
      matchedKeywords: []
    };
  }

  const best = matches[0];
  
  // Calculer la confiance (max 100)
  // Base: 50 + (10 par keyword matché, max 50)
  const confidence = Math.min(100, 50 + (best.matchedKeywords.length * 15));

  return {
    expertise: best.expertise,
    confidence,
    method: 'keywords',
    matchedKeywords: best.matchedKeywords
  };
}

// ==================== DÉTECTION PAR IA ====================

/**
 * Détection intelligente via GPT (fallback si keywords insuffisants)
 */
export async function detectExpertiseWithAI(
  messages: Array<{ role: string; content: string }>
): Promise<DetectionResult> {
  try {
    const expertises = await getAllActiveExpertises();
    
    // Construire la liste des expertises disponibles
    const expertisesList = expertises
      .map(e => `- ${e.code}: ${e.nom} (${e.categorie})`)
      .join('\n');

    // Construire le contexte de conversation (3-5 derniers messages)
    const recentMessages = messages.slice(-5);
    const conversationText = recentMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const detectionPrompt = `Tu es un expert en classification de problèmes de bricolage.

Analyse la conversation suivante et détermine l'expertise bricolage la plus pertinente.

EXPERTISES DISPONIBLES :
${expertisesList}

CONVERSATION :
${conversationText}

RÈGLES :
- Choisis l'expertise la plus spécifique possible
- Si plusieurs expertises sont possibles, choisis la principale
- Si vraiment impossible à déterminer, réponds "generaliste"
- Le score de confiance doit refléter ta certitude (0-100)

Réponds UNIQUEMENT au format JSON (sans markdown) :
{"expertise_code": "code_expertise", "confidence": 85, "reasoning": "explication courte"}`;

    // Appel API via notre route
    const response = await fetch('/api/chat/detect-expertise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: detectionPrompt })
    });

    if (!response.ok) {
      throw new Error('Erreur API détection');
    }

    const data = await response.json();
    
    // Parser la réponse JSON
    let result;
    try {
      // Nettoyer la réponse si elle contient des backticks
      const cleanResponse = data.message
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      result = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing AI detection response:', parseError);
      return {
        expertise: null,
        confidence: 0,
        method: 'ai',
        reasoning: 'Erreur parsing réponse IA'
      };
    }

    // Récupérer l'expertise détectée
    const expertise = await getExpertiseByCode(result.expertise_code);

    return {
      expertise,
      confidence: result.confidence || 0,
      method: 'ai',
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error('Error in AI expertise detection:', error);
    return {
      expertise: null,
      confidence: 0,
      method: 'ai',
      reasoning: 'Erreur lors de la détection IA'
    };
  }
}

// ==================== DÉTECTION PRINCIPALE ====================

/**
 * Fonction principale de détection d'expertise
 * Utilise les mots-clés d'abord, puis l'IA si nécessaire
 * 
 * @param messages - Historique de conversation
 * @param options - Options de détection
 */
export async function detectExpertise(
  messages: Array<{ role: string; content: string }>,
  options?: {
    minMessages?: number;      // Minimum de messages requis (défaut: 2)
    keywordThreshold?: number; // Seuil confiance keywords (défaut: 70)
    aiThreshold?: number;      // Seuil confiance IA (défaut: 60)
    skipAI?: boolean;          // Ne pas utiliser l'IA (défaut: false)
  }
): Promise<DetectionResult> {
  const {
    minMessages = 2,
    keywordThreshold = 70,
    aiThreshold = 60,
    skipAI = false
  } = options || {};

  // Vérifier qu'on a assez de messages
  if (messages.length < minMessages) {
    return {
      expertise: null,
      confidence: 0,
      method: 'none',
      reasoning: `Minimum ${minMessages} messages requis pour la détection`
    };
  }

  // Extraire le texte des messages utilisateur
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ');

  // Étape 1 : Détection par mots-clés
  const keywordResult = await detectExpertiseFromKeywords(userMessages);

  if (keywordResult.confidence >= keywordThreshold) {
    console.log(`✅ Expertise détectée par keywords: ${keywordResult.expertise?.code} (${keywordResult.confidence}%)`);
    return keywordResult;
  }

  // Étape 2 : Détection par IA (si autorisé et keywords insuffisants)
  if (!skipAI) {
    console.log(`🤖 Keywords insuffisants (${keywordResult.confidence}%), appel IA...`);
    
    const aiResult = await detectExpertiseWithAI(messages);

    if (aiResult.confidence >= aiThreshold) {
      console.log(`✅ Expertise détectée par IA: ${aiResult.expertise?.code} (${aiResult.confidence}%)`);
      return aiResult;
    }

    // IA aussi insuffisante
    console.log(`❌ Détection IA insuffisante (${aiResult.confidence}%)`);
    return {
      expertise: null,
      confidence: Math.max(keywordResult.confidence, aiResult.confidence),
      method: 'ai',
      reasoning: aiResult.reasoning || 'Confiance insuffisante pour déterminer une expertise'
    };
  }

  // Retourner le résultat keywords même si insuffisant
  return keywordResult;
}

// ==================== ANALYTICS ====================

/**
 * Incrémente le compteur d'utilisation d'une expertise
 */
export async function incrementExpertiseUsage(expertiseId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_expertise_usage', {
      expertise_id: expertiseId
    });

    // Si la fonction RPC n'existe pas, faire un update classique
    if (error && error.code === 'PGRST202') {
      const { error: updateError } = await supabase
        .from('expertises')
        .update({ 
          nb_utilisations: supabase.rpc('increment', { row_id: expertiseId }) 
        })
        .eq('id', expertiseId);

      // Fallback: récupérer et incrémenter manuellement
      if (updateError) {
        const expertise = await getExpertiseById(expertiseId);
        if (expertise) {
          await supabase
            .from('expertises')
            .update({ nb_utilisations: (expertise.nb_utilisations || 0) + 1 })
            .eq('id', expertiseId);
        }
      }
    }
  } catch (error) {
    console.error('Error incrementing expertise usage:', error);
    // Non bloquant - on continue même si l'analytics échoue
  }
}

/**
 * Récupère les expertises les plus utilisées
 */
export async function getTopExpertises(limit: number = 10): Promise<Expertise[]> {
  try {
    const { data, error } = await supabase
      .from('expertises')
      .select('*')
      .eq('est_active', true)
      .order('nb_utilisations', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting top expertises:', error);
    return [];
  }
}

// ==================== UTILITAIRES ====================

/**
 * Vérifie si une expertise est disponible
 */
export async function isExpertiseAvailable(code: string): Promise<boolean> {
  const expertise = await getExpertiseByCode(code);
  return expertise !== null && expertise.est_active;
}

/**
 * Récupère les expertises par catégorie
 */
export async function getExpertisesByCategory(categorie: string): Promise<Expertise[]> {
  const expertises = await getAllActiveExpertises();
  return expertises.filter(e => e.categorie === categorie);
}

/**
 * Recherche d'expertises par texte (nom ou description)
 */
export async function searchExpertises(query: string): Promise<Expertise[]> {
  const expertises = await getAllActiveExpertises();
  const normalizedQuery = normalizeText(query);

  return expertises.filter(e => {
    const normalizedNom = normalizeText(e.nom);
    const normalizedDesc = normalizeText(e.description || '');
    return normalizedNom.includes(normalizedQuery) || normalizedDesc.includes(normalizedQuery);
  });
}

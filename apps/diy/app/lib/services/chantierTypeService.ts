/**
 * chantierTypeService.ts
 * 
 * Service de gestion des types de chantier
 * - Chargement des configurations depuis chantier_types_config
 * - Détection du type à partir d'une description
 * - Formatage pour injection dans le contexte IA
 * 
 * @version 1.0
 * @date 1 décembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface ChantierTypeConfig {
  id: string;
  code: string;
  nom: string;
  description: string;
  icone: string;
  questions_specifiques: string[];
  equipements_suggestibles: string[];
  lots_typiques: string[];
  risques_courants: string[];
  points_attention: string[];
  expertises_courantes: string[];
  ordre: number;
  est_actif: boolean;
}

export interface Phase1Synthese {
  type_projet: string;
  description_courte: string;
  taille_projet: 'petit' | 'moyen' | 'gros' | null;
  motivations: string[];
  points_vigilance: string[];
  est_hors_scope: boolean;
  raison_hors_scope: string | null;
}

// ==================== CACHE ====================

let typesCache: Map<string, ChantierTypeConfig> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ==================== FONCTIONS ====================

/**
 * Charge tous les types de chantier en cache
 */
async function loadAllTypes(): Promise<Map<string, ChantierTypeConfig>> {
  const now = Date.now();
  
  // Retourner le cache s'il est encore valide
  if (typesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return typesCache;
  }
  
  const { data, error } = await supabase
    .from('chantier_types_config')
    .select('*')
    .eq('est_actif', true)
    .order('ordre', { ascending: true });
  
  if (error) {
    console.error('❌ Erreur chargement types chantier:', error);
    return typesCache || new Map();
  }
  
  typesCache = new Map();
  for (const row of data || []) {
    typesCache.set(row.code, row as ChantierTypeConfig);
  }
  
  cacheTimestamp = now;
  console.log(`✅ ${typesCache.size} types de chantier chargés`);
  return typesCache;
}

/**
 * Invalide le cache (pour forcer un rechargement)
 */
export function invalidateTypesCache(): void {
  typesCache = null;
  cacheTimestamp = 0;
}

/**
 * Détecte le type de chantier à partir d'une description
 * Retourne le code du type ou null si non détecté
 */
export function detectChantierType(description: string): string | null {
  if (!description) return null;
  
  const desc = description.toLowerCase();
  
  const patterns: Record<string, string[]> = {
    'cuisine': ['cuisine', 'cuisson', 'plaque', 'hotte', 'évier cuisine', 'ilot central', 'îlot central', 'plan de travail cuisine'],
    'salle_de_bain': ['salle de bain', 'sdb', 'douche', 'baignoire', 'vasque', 'wc', 'toilette', 'sanitaire'],
    'chambre': ['chambre', 'dressing', 'placard chambre', 'suite parentale'],
    'salon': ['salon', 'séjour', 'living', 'cheminée', 'poêle', 'pièce de vie'],
    'combles': ['combles', 'grenier', 'sous-toit', 'mansarde', 'rampant', 'sous pente'],
    'terrasse': ['terrasse', 'balcon', 'deck', 'extérieur bois'],
    'garage': ['garage', 'atelier', 'buanderie'],
    'renovation_complete': ['rénovation complète', 'maison entière', 'appartement entier', 'corps de ferme', 'longère', 'grange']
  };
  
  for (const [type, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return type;
    }
  }
  
  return null;
}

/**
 * Récupère la configuration d'un type de chantier
 */
export async function getChantierTypeConfig(typeCode: string): Promise<ChantierTypeConfig | null> {
  const types = await loadAllTypes();
  return types.get(typeCode) || null;
}

/**
 * Récupère tous les types de chantier disponibles
 */
export async function getAllChantierTypes(): Promise<ChantierTypeConfig[]> {
  const types = await loadAllTypes();
  return Array.from(types.values());
}

/**
 * Récupère les codes des types disponibles
 */
export async function getAvailableTypeCodes(): Promise<string[]> {
  const types = await loadAllTypes();
  return Array.from(types.keys());
}

/**
 * Formate la configuration pour injection dans le contexte IA (Phase 2)
 */
export function formatTypeConfigForAI(config: ChantierTypeConfig): string {
  const sections: string[] = [];
  
  sections.push(`## TYPE DE CHANTIER : ${config.icone} ${config.nom.toUpperCase()}`);
  sections.push(`${config.description}\n`);
  
  if (config.questions_specifiques?.length > 0) {
    sections.push(`### Questions spécifiques à poser :`);
    config.questions_specifiques.forEach(q => {
      sections.push(`- ${q}`);
    });
    sections.push('');
  }
  
  if (config.equipements_suggestibles?.length > 0) {
    sections.push(`### Équipements à suggérer :`);
    sections.push(config.equipements_suggestibles.join(', '));
    sections.push('');
  }
  
  if (config.risques_courants?.length > 0) {
    sections.push(`### Risques et vigilance :`);
    config.risques_courants.forEach(r => {
      sections.push(`- ⚠️ ${r}`);
    });
    sections.push('');
  }
  
  if (config.points_attention?.length > 0) {
    sections.push(`### Points d'attention :`);
    config.points_attention.forEach(p => {
      sections.push(`- 💡 ${p}`);
    });
    sections.push('');
  }
  
  if (config.lots_typiques?.length > 0) {
    sections.push(`### Lots typiques pour ce type de chantier :`);
    sections.push(config.lots_typiques.join(' → '));
    sections.push('');
  }
  
  return sections.join('\n');
}

/**
 * Vérifie si un projet est hors scope via la table alertes_critiques
 */
export async function checkHorsScope(description: string): Promise<{
  estHorsScope: boolean;
  raison: string | null;
  alertes: Array<{ code: string; titre: string; niveau: string; message: string }>;
}> {
  const desc = description.toLowerCase();
  
  const { data: alertes, error } = await supabase
    .from('alertes_critiques')
    .select('code, titre, niveau, message_alerte, mots_cles')
    .eq('niveau', 'interdit');
  
  if (error) {
    console.error('❌ Erreur vérification hors scope:', error);
    return { estHorsScope: false, raison: null, alertes: [] };
  }
  
  const alertesDetectees: Array<{ code: string; titre: string; niveau: string; message: string }> = [];
  
  for (const alerte of alertes || []) {
    const motsCles = alerte.mots_cles || [];
    const match = motsCles.some((mot: string) => desc.includes(mot.toLowerCase()));
    
    if (match) {
      alertesDetectees.push({
        code: alerte.code,
        titre: alerte.titre,
        niveau: alerte.niveau,
        message: alerte.message_alerte
      });
    }
  }
  
  if (alertesDetectees.length > 0) {
    return {
      estHorsScope: true,
      raison: alertesDetectees.map(a => a.message).join(' '),
      alertes: alertesDetectees
    };
  }
  
  return { estHorsScope: false, raison: null, alertes: [] };
}

/**
 * Vérifie les alertes critiques (niveau critique, pas interdit)
 */
export async function checkAlertesCritiques(description: string): Promise<Array<{
  code: string;
  titre: string;
  message: string;
}>> {
  const desc = description.toLowerCase();
  
  const { data: alertes, error } = await supabase
    .from('alertes_critiques')
    .select('code, titre, message_alerte, mots_cles')
    .eq('niveau', 'critique');
  
  if (error) {
    console.error('❌ Erreur vérification alertes critiques:', error);
    return [];
  }
  
  const alertesDetectees: Array<{ code: string; titre: string; message: string }> = [];
  
  for (const alerte of alertes || []) {
    const motsCles = alerte.mots_cles || [];
    const match = motsCles.some((mot: string) => desc.includes(mot.toLowerCase()));
    
    if (match) {
      alertesDetectees.push({
        code: alerte.code,
        titre: alerte.titre,
        message: alerte.message_alerte
      });
    }
  }
  
  return alertesDetectees;
}

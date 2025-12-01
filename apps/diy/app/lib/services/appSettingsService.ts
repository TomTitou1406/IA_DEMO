/**
 * appSettingsService.ts
 * 
 * Service de gestion des paramètres globaux de l'application
 * Charge les settings depuis la table app_settings avec cache en mémoire
 * 
 * @version 1.0
 * @date 1 décembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  categorie: string;
  description?: string;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  est_public: boolean;
  est_modifiable: boolean;
}

export type SettingsCategory = 
  | 'feature'
  | 'limite'
  | 'tarif'
  | 'config_ia'
  | 'config_avatar'
  | 'config_budget'
  | 'config_expertises'
  | 'config_chantier'
  | 'config_optimisation'
  | 'config_securite';

// ==================== CACHE ====================

let settingsCache: Map<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Vérifie si le cache est encore valide
 */
function isCacheValid(): boolean {
  return settingsCache !== null && (Date.now() - cacheTimestamp) < CACHE_TTL_MS;
}

/**
 * Invalide le cache (à appeler après une modification)
 */
export function invalidateSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
  console.log('🔄 Cache app_settings invalidé');
}

// ==================== CHARGEMENT ====================

/**
 * Charge tous les settings en cache
 */
async function loadAllSettings(): Promise<Map<string, any>> {
  if (isCacheValid() && settingsCache) {
    return settingsCache;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, categorie, value_type')
      .eq('environnement', 'production');

    if (error) {
      console.error('❌ Erreur chargement app_settings:', error);
      return settingsCache || new Map();
    }

    settingsCache = new Map();
    
    for (const setting of data || []) {
      // Parser la valeur selon son type
      let parsedValue = setting.value;
      
      // JSONB stocke déjà les valeurs typées, mais parfois elles sont wrappées
      if (typeof parsedValue === 'string') {
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch {
          // Garder comme string si pas parsable
        }
      }
      
      settingsCache.set(setting.key, parsedValue);
    }

    cacheTimestamp = Date.now();
    console.log(`✅ ${settingsCache.size} settings chargés depuis app_settings`);
    
    return settingsCache;
    
  } catch (error) {
    console.error('❌ Erreur critique chargement settings:', error);
    return settingsCache || new Map();
  }
}

// ==================== GETTERS ====================

/**
 * Récupère un setting par sa clé
 * 
 * @param key - Clé du setting (ex: 'openai_model_default')
 * @param defaultValue - Valeur par défaut si non trouvé
 */
export async function getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
  const settings = await loadAllSettings();
  
  if (settings.has(key)) {
    return settings.get(key) as T;
  }
  
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  console.warn(`⚠️ Setting non trouvé: ${key}`);
  return undefined as T;
}

/**
 * Récupère plusieurs settings d'un coup
 * 
 * @param keys - Liste des clés à récupérer
 */
export async function getSettings(keys: string[]): Promise<Record<string, any>> {
  const settings = await loadAllSettings();
  const result: Record<string, any> = {};
  
  for (const key of keys) {
    if (settings.has(key)) {
      result[key] = settings.get(key);
    }
  }
  
  return result;
}

/**
 * Récupère tous les settings d'une catégorie
 * 
 * @param category - Catégorie (ex: 'config_ia', 'config_budget')
 */
export async function getSettingsByCategory(category: SettingsCategory): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('categorie', category)
      .eq('environnement', 'production');

    if (error) {
      console.error(`❌ Erreur chargement catégorie ${category}:`, error);
      return {};
    }

    const result: Record<string, any> = {};
    for (const setting of data || []) {
      let parsedValue = setting.value;
      if (typeof parsedValue === 'string') {
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch {
          // Garder comme string
        }
      }
      result[setting.key] = parsedValue;
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Erreur critique catégorie ${category}:`, error);
    return {};
  }
}

// ==================== HELPERS TYPÉS ====================

/**
 * Récupère les settings IA par défaut
 */
export async function getDefaultIASettings(): Promise<{
  model: string;
  temperature: number;
  maxTokens: number;
  promptMaxLength: number;
  historyMaxMessages: number;
}> {
  const settings = await getSettingsByCategory('config_ia');
  
  return {
    model: settings.openai_model_default || 'gpt-4o-mini',
    temperature: settings.openai_temperature_default || 0.4,
    maxTokens: settings.openai_max_tokens_default || 2500,
    promptMaxLength: settings.prompt_system_max_length || 4000,
    historyMaxMessages: settings.conversation_history_max_messages || 20
  };
}

/**
 * Récupère les settings budget
 */
export async function getBudgetSettings(): Promise<{
  seuilAlertePourcent: number;
  seuilCritiquePourcent: number;
  coefficientPerte: number;
}> {
  const settings = await getSettingsByCategory('config_budget');
  
  return {
    seuilAlertePourcent: settings.budget_seuil_alerte_pourcent || 80,
    seuilCritiquePourcent: settings.budget_seuil_critique_pourcent || 95,
    coefficientPerte: settings.budget_coefficient_perte_defaut || 0.15
  };
}

/**
 * Récupère les limites selon le plan utilisateur
 * 
 * @param plan - 'free', 'basic', ou 'premium'
 */
export async function getLimitesForPlan(plan: 'free' | 'basic' | 'premium'): Promise<{
  maxChantiers: number;
  maxConversationsMois: number | null;
  tarifMensuel: number;
}> {
  const settings = await loadAllSettings();
  
  return {
    maxChantiers: settings.get(`limite_chantiers_${plan}`) || (plan === 'free' ? 2 : plan === 'basic' ? 5 : 20),
    maxConversationsMois: settings.get(`limite_conversations_mois_${plan}`) || null,
    tarifMensuel: settings.get(`tarif_plan_${plan}`) || 0
  };
}

/**
 * Vérifie si une feature est activée
 * 
 * @param featureKey - Clé sans le préfixe 'feature_' (ex: 'avatar_heygen_enabled')
 */
export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
  const fullKey = featureKey.startsWith('feature_') ? featureKey : `feature_${featureKey}`;
  return await getSetting<boolean>(fullKey, false);
}

/**
 * Récupère les settings chantier
 */
export async function getChantierSettings(): Promise<{
  dureeMaxSemaines: number;
  budgetMinEuros: number;
  budgetMaxEuros: number;
}> {
  const settings = await getSettingsByCategory('config_chantier');
  
  return {
    dureeMaxSemaines: settings.chantier_duree_max_semaines || 52,
    budgetMinEuros: settings.chantier_budget_min_euros || 100,
    budgetMaxEuros: settings.chantier_budget_max_euros || 50000
  };
}

/**
 * Récupère les settings d'optimisation
 */
export async function getOptimisationSettings(): Promise<{
  gainTempsMinHeures: number;
  gainArgentMinEuros: number;
  maxPropositionsActives: number;
}> {
  const settings = await getSettingsByCategory('config_optimisation');
  
  return {
    gainTempsMinHeures: settings.optimisation_gain_temps_min_heures || 0.5,
    gainArgentMinEuros: settings.optimisation_gain_argent_min_euros || 10,
    maxPropositionsActives: settings.optimisation_max_propositions_actives || 5
  };
}

// ==================== SETTERS (Admin) ====================

/**
 * Met à jour un setting (nécessite les droits admin)
 * 
 * @param key - Clé du setting
 * @param value - Nouvelle valeur
 * @param updatedBy - UUID de l'utilisateur qui modifie
 */
export async function updateSetting(
  key: string, 
  value: any, 
  updatedBy?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        value, 
        updated_at: new Date().toISOString(),
        updated_by: updatedBy 
      })
      .eq('key', key)
      .eq('est_modifiable', true);

    if (error) {
      console.error(`❌ Erreur mise à jour setting ${key}:`, error);
      return false;
    }

    // Invalider le cache
    invalidateSettingsCache();
    
    console.log(`✅ Setting ${key} mis à jour`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erreur critique mise à jour ${key}:`, error);
    return false;
  }
}

// ==================== EXPORT PAR DÉFAUT ====================

export default {
  getSetting,
  getSettings,
  getSettingsByCategory,
  getDefaultIASettings,
  getBudgetSettings,
  getLimitesForPlan,
  isFeatureEnabled,
  getChantierSettings,
  getOptimisationSettings,
  updateSetting,
  invalidateSettingsCache
};

// ============================================================================
// useAvatarConfigFromDB.ts – Hook personnalisé pour config avatar
// Version: 1.0
// Description: Charge et synchronise la configuration avatar depuis la BDD
// Features:
//   - Chargement initial depuis BDD
//   - Sauvegarde automatique ou manuelle
//   - Conversion BDD ↔ HeyGen StartAvatarRequest
//   - Reset aux valeurs par défaut
//   - Gestion des erreurs
// Auteur: Christophe Fischer / Op'Team-IA
// ============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { StartAvatarRequest, AvatarQuality, VoiceEmotion } from '@heygen/streaming-avatar';

// ============================================================================
// TYPES
// ============================================================================
interface AvatarConfigParameter {
  id: string;
  category: string;
  parameter_name: string;
  parameter_key: string;
  parameter_type: string;
  default_value: string | null;
  current_value: string | null;
  min_value: number | null;
  max_value: number | null;
  allowed_values: string[] | null;
  description: string;
  is_user_editable: boolean;
  requires_restart: boolean;
}

interface UseAvatarConfigOptions {
  autoSave?: boolean;           // Sauvegarder automatiquement les changements
  autoSaveDelay?: number;        // Délai avant auto-save (ms)
  onConfigLoaded?: (config: StartAvatarRequest) => void;
  onConfigSaved?: () => void;
  onError?: (error: Error) => void;
}

interface UseAvatarConfigReturn {
  config: StartAvatarRequest | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  updateConfig: (updates: Partial<StartAvatarRequest>) => void;
  saveConfig: () => Promise<void>;
  resetConfig: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

// ============================================================================
// FONCTION UTILITAIRE : BDD → HeyGen Config
// ============================================================================
function buildConfigFromParams(params: AvatarConfigParameter[]): StartAvatarRequest {
  const config: any = {};

  params.forEach(param => {
    const keys = param.parameter_key.split('.');
    const value = param.current_value || param.default_value;

    if (!value) return;

    // Convertir selon le type
    let parsedValue: any = value;

    switch (param.parameter_type) {
      case 'number':
        parsedValue = parseFloat(value);
        break;
      case 'boolean':
        parsedValue = value === 'true';
        break;
      case 'enum':
        // Gérer les enums HeyGen
        if (param.parameter_key === 'quality') {
          const qualityMap: Record<string, AvatarQuality> = {
            'low': AvatarQuality.Low,
            'medium': AvatarQuality.Medium,
            'high': AvatarQuality.High,
          };
          parsedValue = qualityMap[value.toLowerCase()] || AvatarQuality.High;
        } else if (param.parameter_key === 'voice.emotion') {
          parsedValue = VoiceEmotion[value as keyof typeof VoiceEmotion] || VoiceEmotion.FRIENDLY;
        } else {
          parsedValue = value;
        }
        break;
      default:
        parsedValue = value;
    }

    // Construire l'objet imbriqué
    if (keys.length === 1) {
      config[keys[0]] = parsedValue;
    } else if (keys.length === 2) {
      if (!config[keys[0]]) config[keys[0]] = {};
      config[keys[0]][keys[1]] = parsedValue;
    }
  });

  return config as StartAvatarRequest;
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================
export function useAvatarConfigFromDB(
  options: UseAvatarConfigOptions = {}
): UseAvatarConfigReturn {
  const {
    autoSave = false,
    autoSaveDelay = 1000,
    onConfigLoaded,
    onConfigSaved,
    onError,
  } = options;

  // États
  const [config, setConfig] = useState<StartAvatarRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // ============================================================================
  // Charger la configuration depuis la BDD
  // ============================================================================
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📥 Chargement configuration avatar...');

      const response = await fetch('/api/avatar-config');

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const params: AvatarConfigParameter[] = await response.json();

      console.log(`✅ ${params.length} paramètres chargés`);

      const builtConfig = buildConfigFromParams(params);

      setConfig(builtConfig);
      hasLoadedRef.current = true;

      if (onConfigLoaded) {
        onConfigLoaded(builtConfig);
      }

      console.log('✅ Configuration avatar chargée:', builtConfig);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      console.error('❌ Erreur chargement config:', error);
      setError(error);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [onConfigLoaded, onError]);

  // ============================================================================
  // Sauvegarder la configuration dans la BDD
  // ============================================================================
  const saveConfig = useCallback(async () => {
    if (!config) {
      console.warn('⚠️ Pas de configuration à sauvegarder');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      console.log('💾 Sauvegarde configuration avatar...');

      const response = await fetch('/api/avatar-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();

      console.log(`✅ Configuration sauvegardée: ${result.updated} paramètres`);

      if (onConfigSaved) {
        onConfigSaved();
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      console.error('❌ Erreur sauvegarde config:', error);
      setError(error);

      if (onError) {
        onError(error);
      }
    } finally {
      setSaving(false);
    }
  }, [config, onConfigSaved, onError]);

  // ============================================================================
  // Mettre à jour la configuration (local)
  // ============================================================================
  const updateConfig = useCallback((updates: Partial<StartAvatarRequest>) => {
    setConfig(prev => {
      if (!prev) return null;

      const newConfig = { ...prev };

      // Gérer les updates imbriqués (voice, sttSettings)
      Object.keys(updates).forEach(key => {
        if (key === 'voice' && typeof updates.voice === 'object') {
          newConfig.voice = { ...prev.voice, ...updates.voice };
        } else if (key === 'sttSettings' && typeof updates.sttSettings === 'object') {
          newConfig.sttSettings = { ...prev.sttSettings, ...updates.sttSettings };
        } else {
          (newConfig as any)[key] = (updates as any)[key];
        }
      });

      console.log('📝 Configuration mise à jour localement:', updates);

      // Auto-save si activé
      if (autoSave) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
          console.log(`⏰ Auto-save déclenché (délai: ${autoSaveDelay}ms)`);
          saveConfig();
        }, autoSaveDelay);
      }

      return newConfig;
    });
  }, [autoSave, autoSaveDelay, saveConfig]);

  // ============================================================================
  // Réinitialiser aux valeurs par défaut
  // ============================================================================
  const resetConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Réinitialisation configuration...');

      const response = await fetch('/api/avatar-config?action=reset', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      console.log('✅ Configuration réinitialisée');

      // Recharger la config
      await loadConfig();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      console.error('❌ Erreur reset config:', error);
      setError(error);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [loadConfig, onError]);

  // ============================================================================
  // Rafraîchir la configuration
  // ============================================================================
  const refreshConfig = useCallback(async () => {
    console.log('🔄 Rafraîchissement configuration...');
    await loadConfig();
  }, [loadConfig]);

  // ============================================================================
  // Chargement initial
  // ============================================================================
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadConfig();
    }
  }, [loadConfig]);

  // ============================================================================
  // Cleanup auto-save timeout
  // ============================================================================
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    config,
    loading,
    saving,
    error,
    updateConfig,
    saveConfig,
    resetConfig,
    refreshConfig,
  };
}

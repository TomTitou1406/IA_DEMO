/**
 * useExpertiseDetection.ts
 * 
 * Hook React pour détecter automatiquement l'expertise nécessaire
 * basé sur la conversation en cours
 * 
 * @version 1.0
 * @date 25 novembre 2025
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  detectExpertise, 
  getExpertiseByCode,
  incrementExpertiseUsage,
  type Expertise,
  type DetectionResult 
} from '@/app/lib/services/expertiseService';

// ==================== TYPES ====================

export interface UseExpertiseDetectionOptions {
  /** Nombre minimum de messages avant détection (défaut: 3) */
  minMessages?: number;
  
  /** Activer la détection automatique (défaut: true) */
  autoDetect?: boolean;
  
  /** Expertise déjà active (ne pas re-détecter) */
  currentExpertiseCode?: string;
  
  /** Seuil de confiance pour afficher la suggestion (défaut: 65) */
  displayThreshold?: number;
  
  /** Délai avant détection après dernier message en ms (défaut: 1500) */
  debounceDelay?: number;
  
  /** Callback quand une expertise est détectée */
  onExpertiseDetected?: (result: DetectionResult) => void;
}

export interface UseExpertiseDetectionReturn {
  /** Expertise détectée (null si aucune) */
  detectedExpertise: Expertise | null;
  
  /** Score de confiance (0-100) */
  confidence: number;
  
  /** Méthode de détection utilisée */
  detectionMethod: 'keywords' | 'ai' | 'none';
  
  /** Mots-clés matchés (si méthode keywords) */
  matchedKeywords: string[];
  
  /** Raisonnement IA (si méthode ai) */
  reasoning: string | null;
  
  /** Détection en cours */
  isDetecting: boolean;
  
  /** La suggestion a été affichée à l'utilisateur */
  suggestionShown: boolean;
  
  /** Confirmer l'expertise détectée */
  confirmExpertise: () => Promise<Expertise | null>;
  
  /** Refuser la suggestion */
  dismissSuggestion: () => void;
  
  /** Forcer une nouvelle détection */
  triggerDetection: () => Promise<void>;
  
  /** Réinitialiser complètement */
  reset: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ==================== HOOK ====================

export function useExpertiseDetection(
  messages: Message[],
  options: UseExpertiseDetectionOptions = {}
): UseExpertiseDetectionReturn {
  
  const {
    minMessages = 3,
    autoDetect = true,
    currentExpertiseCode,
    displayThreshold = 65,
    debounceDelay = 1500,
    onExpertiseDetected
  } = options;

  // État
  const [detectedExpertise, setDetectedExpertise] = useState<Expertise | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [detectionMethod, setDetectionMethod] = useState<'keywords' | 'ai' | 'none'>('none');
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [suggestionShown, setSuggestionShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);
  const hasDetectedRef = useRef(false);

  // ==================== DÉTECTION ====================

  /**
   * Exécute la détection d'expertise
   */
  const runDetection = useCallback(async () => {
    // Ne pas détecter si déjà une expertise active
    if (currentExpertiseCode) {
      console.log('⏭️ Détection ignorée: expertise déjà active');
      return;
    }

    // Ne pas détecter si suggestion refusée
    if (dismissed) {
      console.log('⏭️ Détection ignorée: suggestion refusée');
      return;
    }

    // Ne pas détecter si pas assez de messages
    if (messages.length < minMessages) {
      console.log(`⏭️ Détection ignorée: ${messages.length}/${minMessages} messages`);
      return;
    }

    setIsDetecting(true);

    try {
      console.log('🔍 Lancement détection expertise...');
      
      const result = await detectExpertise(messages, {
        minMessages,
        keywordThreshold: 70,
        aiThreshold: 60
      });

      setConfidence(result.confidence);
      setDetectionMethod(result.method);
      setMatchedKeywords(result.matchedKeywords || []);
      setReasoning(result.reasoning || null);

      if (result.expertise && result.confidence >= displayThreshold) {
        setDetectedExpertise(result.expertise);
        setSuggestionShown(true);
        hasDetectedRef.current = true;
        
        console.log(`✅ Expertise suggérée: ${result.expertise.nom} (${result.confidence}%)`);
        
        // Callback
        onExpertiseDetected?.(result);
      } else {
        console.log(`❌ Pas d'expertise claire (confiance: ${result.confidence}%)`);
      }

    } catch (error) {
      console.error('Erreur détection expertise:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [messages, minMessages, currentExpertiseCode, dismissed, displayThreshold, onExpertiseDetected]);

  /**
   * Déclenche la détection manuellement
   */
  const triggerDetection = useCallback(async () => {
    setDismissed(false);
    hasDetectedRef.current = false;
    await runDetection();
  }, [runDetection]);

  // ==================== AUTO-DÉTECTION ====================

  /**
   * Détection automatique quand les messages changent
   */
  useEffect(() => {
    // Skip si désactivé ou déjà détecté
    if (!autoDetect || hasDetectedRef.current || currentExpertiseCode) {
      return;
    }

    // Skip si pas de nouveaux messages utilisateur
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length <= lastMessageCountRef.current) {
      return;
    }
    lastMessageCountRef.current = userMessages.length;

    // Skip si pas assez de messages
    if (messages.length < minMessages) {
      return;
    }

    // Debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      runDetection();
    }, debounceDelay);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [messages, autoDetect, minMessages, debounceDelay, currentExpertiseCode, runDetection]);

  // ==================== ACTIONS ====================

  /**
   * Confirme l'expertise détectée
   */
  const confirmExpertise = useCallback(async (): Promise<Expertise | null> => {
    if (!detectedExpertise) {
      console.warn('Pas d\'expertise à confirmer');
      return null;
    }

    try {
      // Incrémenter le compteur d'utilisation
      await incrementExpertiseUsage(detectedExpertise.id);
      
      console.log(`✅ Expertise confirmée: ${detectedExpertise.code}`);
      
      // Garder l'expertise mais masquer la suggestion
      setSuggestionShown(false);
      
      return detectedExpertise;

    } catch (error) {
      console.error('Erreur confirmation expertise:', error);
      return detectedExpertise; // Retourner quand même
    }
  }, [detectedExpertise]);

  /**
   * Refuse la suggestion
   */
  const dismissSuggestion = useCallback(() => {
    console.log('❌ Suggestion refusée par l\'utilisateur');
    setSuggestionShown(false);
    setDismissed(true);
    // On garde l'expertise détectée en mémoire au cas où
  }, []);

  /**
   * Réinitialise tout
   */
  const reset = useCallback(() => {
    setDetectedExpertise(null);
    setConfidence(0);
    setDetectionMethod('none');
    setMatchedKeywords([]);
    setReasoning(null);
    setSuggestionShown(false);
    setDismissed(false);
    hasDetectedRef.current = false;
    lastMessageCountRef.current = 0;
  }, []);

  // ==================== RETOUR ====================

  return {
    detectedExpertise,
    confidence,
    detectionMethod,
    matchedKeywords,
    reasoning,
    isDetecting,
    suggestionShown,
    confirmExpertise,
    dismissSuggestion,
    triggerDetection,
    reset
  };
}

export default useExpertiseDetection;

/**
 * @file useNeoAvatar.ts
 * @version v0.06
 * @date 07 novembre 2025
 * @description Hook pour gérer l'avatar HeyGen - Version simplifiée basée sur code officiel HeyGen
 * @changelog 
 *   v0.06 - Ajout nettoyage automatique transcription (mots collés)
 *   v0.05 - Réécriture complète basée sur InteractiveAvatar.tsx officiel HeyGen
 *   v0.04 - Fix doublon message initial avec vérification
 *   v0.03 - Amélioration gestion chat history
 *   v0.02 - Message initial caché du chat + utilisation TaskType.TALK
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  VoiceEmotion,
  StartAvatarRequest,
  TaskType,
} from "@heygen/streaming-avatar";

// ============================================
// FONCTION NETTOYAGE TRANSCRIPTION
// ============================================
function cleanTranscription(text: string): string {
  if (!text) return text;
  
  console.log('🧹 AVANT nettoyage:', text);
  
  // Pattern 1: minuscule + Majuscule = mot collé (PLUS AGRESSIF)
  text = text.replace(/([a-zàâäéèêëïîôùûüÿç]{2,})([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸ])/g, '$1 $2');
  
  // Pattern 2: Majuscule répétée (ElleElle → Elle Elle)
  text = text.replace(/([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸ][a-zàâäéèêëïîôùûüÿç]+)([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸ][a-zàâäéèêëïîôùûüÿç]+)/g, '$1 $2');
  
  // Pattern 3: mot + "de" collé (membredede → membre de de)
  text = text.replace(/([a-zàâäéèêëïîôùûüÿç]{3,})(de)/g, '$1 $2');
  
  // Pattern 4: virgule sans espace
  text = text.replace(/,([a-zA-ZÀ-ÿ])/g, ', $1');
  
  // Pattern 5: point sans espace
  text = text.replace(/\.([a-zA-ZÀ-ÿ])/g, '. $1');
  
  // Pattern 6: ponctuation collée
  text = text.replace(/([a-zàâäéèêëïîôùûüÿç])([;:!?])/g, '$1 $2');
  
  const result = text.trim();
  console.log('✨ APRÈS nettoyage:', result);
  
  return result;
}

type SessionState = "inactive" | "loading" | "active" | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface UseNeoAvatarConfig {
  knowledgeId?: string;
  avatarName?: string;
  voiceRate?: number;
  language?: string;
  initialMessage?: string;
  initialChatHistory?: ChatMessage[];
}

interface UseNeoAvatarReturn {
  sessionState: SessionState;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isTalking: boolean;
  chatHistory: ChatMessage[];
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  interrupt: () => Promise<void>;
  startInitialSpeak: (text: string) => Promise<void>;
}

export function useNeoAvatar(config?: UseNeoAvatarConfig): UseNeoAvatarReturn {
  const [sessionState, setSessionState] = useState<SessionState>("inactive");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const avatarRef = useRef<StreamingAvatar | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const isLoading = sessionState === "loading";

  // Initialize chat history from initialChatHistory if provided
  useEffect(() => {
    if (config?.initialChatHistory && config.initialChatHistory.length > 0) {
      setChatHistory(config.initialChatHistory);
    }
  }, [config?.initialChatHistory]);

  // ============================================
  // HANDLERS - Version simplifiée façon HeyGen
  // ============================================

  const handleUserTalkingMessage = useCallback((event: any) => {
    const message = event.detail.message;
    
    // 🔍 LOG TEMPORAIRE POUR DEBUG
    console.log('🎙️ USER CHUNK:', JSON.stringify(message), 'Length:', message.length);
  
    setChatHistory((prev) => {
      const lastMsg = prev[prev.length - 1];
      
      // Si dernier message = user, concat sans espace
      if (lastMsg && lastMsg.role === "user") {
        return [
          ...prev.slice(0, -1),
          {
            ...lastMsg,
            content: lastMsg.content + message,
          },
        ];
      }
      
      // Sinon, nouveau message user
      return [
        ...prev,
        {
          role: "user",
          content: message,
          timestamp: new Date(),
        },
      ];
    });
  }, []);

  const handleAvatarTalkingMessage = useCallback((event: any) => {
    const message = event.detail.message;
    
    // 🔍 LOG TEMPORAIRE POUR DEBUG
    console.log('🎤 AVATAR CHUNK:', JSON.stringify(message), 'Length:', message.length);
  
    setChatHistory((prev) => {
      const lastMsg = prev[prev.length - 1];
      
      // Si dernier message = assistant, concat sans espace
      if (lastMsg && lastMsg.role === "assistant") {
        return [
          ...prev.slice(0, -1),
          {
            ...lastMsg,
            content: lastMsg.content + message,
          },
        ];
      }
      
      // Sinon, nouveau message assistant
      return [
        ...prev,
        {
          role: "assistant",
          content: message,
          timestamp: new Date(),
        },
      ];
    });
  }, []);

  const handleEndMessage = useCallback(() => {
    // Rien à faire - l'API HeyGen gère tout
  }, []);

  // ============================================
  // 🆕 HANDLER : Nettoyage message user complet
  // ============================================
  const handleUserStopMessage = useCallback(() => {
    console.log('🔔 USER_END_MESSAGE DÉCLENCHÉ !'); // ← AJOUTE CETTE LIGNE
    setChatHistory((prev) => {
      if (prev.length === 0) return prev;
      
      const lastMsg = prev[prev.length - 1];
      
      // Si le dernier message est user, le nettoyer
      if (lastMsg.role === "user") {
        const cleaned = cleanTranscription(lastMsg.content);
        
        console.log('✨ USER NETTOYÉ:', {
          avant: lastMsg.content.substring(0, 100),
          après: cleaned.substring(0, 100)
        });
        
        return [
          ...prev.slice(0, -1),
          {
            ...lastMsg,
            content: cleaned,
          },
        ];
      }
      
      return prev;
    });
  }, []);

  // ============================================
  // AVATAR INITIALIZATION
  // ============================================

  const fetchAccessToken = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Impossible de récupérer le token HeyGen");
      }

      const token = await response.text();
      return token;
    } catch (err) {
      console.error("❌ Erreur token:", err);
      throw new Error("Échec de connexion au serveur HeyGen");
    }
  }, []);

  const initializeAvatar = useCallback(
    async (token: string) => {
      try {
        const avatar = new StreamingAvatar({ token });

        avatar.on(StreamingEvents.STREAM_READY, (event) => {
          if (event.detail) {
            setStream(event.detail);
          }
        });

        avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
          setIsTalking(true);
        });

        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          setIsTalking(false);
        });

        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          setSessionState("inactive");
          setStream(null);
        });

        avatar.on(StreamingEvents.USER_TALKING_MESSAGE, handleUserTalkingMessage);
        avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, handleAvatarTalkingMessage);
        avatar.on(StreamingEvents.USER_END_MESSAGE, handleUserStopMessage);  // 🆕 NETTOYAGE ICI
        avatar.on(StreamingEvents.AVATAR_END_MESSAGE, handleEndMessage);

        avatarRef.current = avatar;
        return avatar;
      } catch (err) {
        console.error("❌ Erreur initialisation:", err);
        throw new Error("Impossible d'initialiser l'avatar");
      }
    },
    [handleUserTalkingMessage, handleAvatarTalkingMessage, handleEndMessage, handleUserStopMessage]
  );

  // ============================================
  // PUBLIC METHODS
  // ============================================

  const startInitialSpeak = useCallback(async (text: string) => {
    if (!avatarRef.current) {
      console.warn("Avatar pas initialisé");
      return;
    }
    try {
      await avatarRef.current.speak({
        text,
        task_type: TaskType.REPEAT,
      });
    } catch (err) {
      console.warn("⚠️ Erreur lors de l'envoi du message initial :", err);
    }
  }, []);

  const interrupt = useCallback(async () => {
    if (!avatarRef.current) {
      console.warn("Avatar pas initialisé");
      return;
    }
    try {
      await avatarRef.current.interrupt();
    } catch (err) {
      console.warn("⚠️ Erreur lors de l'interruption :", err);
    }
  }, []);

  const startSession = useCallback(async () => {
    if (sessionState === "loading" || sessionState === "active") {
      return;
    }
    try {
      setSessionState("loading");
      setError(null);
      setChatHistory(config?.initialChatHistory ?? []);

      const token = await fetchAccessToken();
      const avatar = await initializeAvatar(token);

      const avatarConfig: StartAvatarRequest = {
        quality: AvatarQuality.High,
        avatarName: config?.avatarName || "Anastasia_Chair_Sitting_public",
        language: config?.language || "fr",
        voice: {
          voiceId: "fb9f9dc7e44847eabba57860c277af42",
          rate: config?.voiceRate || 1.2,
          emotion: VoiceEmotion.FRIENDLY,
        },
        knowledgeId: config?.knowledgeId || undefined,
      };

      const sessionData = await avatar.createStartAvatar(avatarConfig);
      sessionIdRef.current = sessionData.session_id;
      setSessionState("active");
      
      await avatar.startVoiceChat();
      
      if (config?.initialMessage) {
        await startInitialSpeak(initialMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSessionState("error");
    }
  }, [sessionState, config, fetchAccessToken, initializeAvatar, startInitialSpeak]);

  const stopSession = useCallback(async () => {
    if (!avatarRef.current || !sessionIdRef.current) {
      return;
    }
    try {
      await avatarRef.current.stopAvatar();

      avatarRef.current = null;
      sessionIdRef.current = null;
      setStream(null);
      setSessionState("inactive");
      setIsTalking(false);
    } catch (err) {
      setError("Impossible d'arrêter la session");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (avatarRef.current && sessionIdRef.current) {
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

  return {
    sessionState,
    stream,
    isLoading: sessionState === "loading",
    error,
    isTalking,
    chatHistory,
    startSession,
    stopSession,
    interrupt,
    startInitialSpeak,
  };
}

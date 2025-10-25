// /app/(neo)/neo/hooks/useNeoAvatar.ts

import { useState, useRef, useCallback, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  VoiceEmotion,
  StartAvatarRequest,
} from "@heygen/streaming-avatar";

// ========================================================================
// Types
// ========================================================================

type SessionState = "inactive" | "loading" | "active" | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
}

// ========================================================================
// Hook Principal
// ========================================================================

export function useNeoAvatar(): UseNeoAvatarReturn {
  // États
  const [sessionState, setSessionState] = useState<SessionState>("inactive");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Refs
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentSenderRef = useRef<"user" | "assistant" | null>(null);

  const isLoading = sessionState === "loading";

  // ─────────────────────────────────────────────────────────────────────
  // Handlers HeyGen-style (accumulation sans timer)
  // ─────────────────────────────────────────────────────────────────────

  const handleUserTalkingMessage = useCallback((event: any) => {
    const word = event.detail.message;
    
    if (currentSenderRef.current === "user") {
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: prev[prev.length - 1].content + word,
        },
      ]);
    } else {
      currentSenderRef.current = "user";
      setChatHistory((prev) => [
        ...prev,
        {
          role: "user",
          content: word,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const handleAvatarTalkingMessage = useCallback((event: any) => {
    const word = event.detail.message;
    
    if (currentSenderRef.current === "assistant") {
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: prev[prev.length - 1].content + word,
        },
      ]);
    } else {
      currentSenderRef.current = "assistant";
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: word,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const handleEndMessage = useCallback(() => {
    currentSenderRef.current = null;
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // Récupérer le token HeyGen
  // ─────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────
  // Initialiser l'instance StreamingAvatar
  // ─────────────────────────────────────────────────────────────────────

  const initializeAvatar = useCallback(
    async (token: string) => {
      try {
        const avatar = new StreamingAvatar({ token });

        // Événements de base
        avatar.on(StreamingEvents.STREAM_READY, (event) => {
          console.log("✅ Stream prêt");
          if (event.detail) {
            setStream(event.detail);
          }
        });

        avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
          console.log("🗣️ Avatar commence");
          setIsTalking(true);
        });

        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          console.log("🤐 Avatar arrête");
          setIsTalking(false);
        });

        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          console.log("🔌 Stream déconnecté");
          setSessionState("inactive");
          setStream(null);
        });

        // Événements HeyGen
        avatar.on(StreamingEvents.USER_TALKING_MESSAGE, handleUserTalkingMessage);
        avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, handleAvatarTalkingMessage);
        avatar.on(StreamingEvents.USER_END_MESSAGE, handleEndMessage);
        avatar.on(StreamingEvents.AVATAR_END_MESSAGE, handleEndMessage);

        avatarRef.current = avatar;
        return avatar;
      } catch (err) {
        console.error("❌ Erreur initialisation:", err);
        throw new Error("Impossible d'initialiser l'avatar");
      }
    },
    [handleUserTalkingMessage, handleAvatarTalkingMessage, handleEndMessage]
  );

  // ─────────────────────────────────────────────────────────────────────
  // Démarrer la session
  // ─────────────────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    if (sessionState === "loading" || sessionState === "active") {
      console.warn("⚠️ Session déjà en cours");
      return;
    }

    try {
      setSessionState("loading");
      setError(null);
      setChatHistory([]);
      currentSenderRef.current = null;

      console.log("🔄 Récupération du token...");
      const token = await fetchAccessToken();

      console.log("🔄 Initialisation de l'avatar...");
      const avatar = await initializeAvatar(token);

      // 🔥 CONFIGURATION AVEC KNOWLEDGE BASE (EN DUR POUR DEBUG)
      const avatarConfig: StartAvatarRequest = {
        quality: AvatarQuality.High,
        avatarName: "Anastasia_Chair_Sitting_public",
        language: "fr",
        voice: {
          rate: 1.2,
          emotion: VoiceEmotion.FRIENDLY,
        },
        knowledgeBase: "19df36d7a9354a1aa664c34686256df1", // ← EN DUR
      };

      // 🔥 LOG POUR VÉRIFIER LA CONFIG
      console.log("🔥 Configuration envoyée à HeyGen:", avatarConfig);
      console.log("🔥 Knowledge Base ID:", avatarConfig.knowledgeBase);

      console.log("🔄 Démarrage de la session avec Knowledge Base...");
      const sessionData = await avatar.createStartAvatar(avatarConfig);

      sessionIdRef.current = sessionData.session_id;

      console.log("✅ Session démarrée:", sessionData.session_id);
      console.log("✅ Knowledge Base appliquée:", avatarConfig.knowledgeBase);
      
      setSessionState("active");

      console.log("🎤 Activation du micro...");
      await avatar.startVoiceChat();
      
      // 🆕 ATTENDRE 1 SECONDE pour que le voice chat soit bien actif
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 🆕 DÉCLENCHER LA CONVERSATION avec un message d'accueil
      console.log("🚀 Déclenchement du message d'accueil...");
      try {
        await avatar.speak({
          text: "Bonjour",
          task_type: "repeat",
        });
        console.log("✅ Message d'accueil envoyé");
      } catch (err) {
        console.warn("⚠️ Impossible d'envoyer le message d'accueil:", err);
      }
  
    } catch (err) {
      console.error("❌ Erreur démarrage:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSessionState("error");
    }
  }, [sessionState, fetchAccessToken, initializeAvatar]);

  // ─────────────────────────────────────────────────────────────────────
  // Arrêter la session
  // ─────────────────────────────────────────────────────────────────────

  const stopSession = useCallback(async () => {
    if (!avatarRef.current || !sessionIdRef.current) {
      console.warn("⚠️ Aucune session active");
      return;
    }

    try {
      console.log("🛑 Arrêt de la session...");

      await avatarRef.current.stopAvatar();

      avatarRef.current = null;
      sessionIdRef.current = null;
      currentSenderRef.current = null;
      setStream(null);
      setSessionState("inactive");
      setIsTalking(false);

      console.log("✅ Session arrêtée");
    } catch (err) {
      console.error("❌ Erreur arrêt:", err);
      setError("Impossible d'arrêter la session");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // Nettoyage au démontage
  // ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (avatarRef.current && sessionIdRef.current) {
        console.log("🧹 Nettoyage automatique");
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // Retour du hook
  // ─────────────────────────────────────────────────────────────────────

  return {
    sessionState,
    stream,
    isLoading,
    error,
    isTalking,
    chatHistory,
    startSession,
    stopSession,
  };
}

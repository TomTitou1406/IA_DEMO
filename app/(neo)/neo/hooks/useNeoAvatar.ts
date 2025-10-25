// /app/(neo)/neo/hooks/useNeoAvatar.ts

import { useState, useRef, useCallback, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  VoiceEmotion,
  StartAvatarRequest,
} from "@heygen/streaming-avatar";

// ========================================================================
// 🎯 Types
// ========================================================================

type SessionState = "inactive" | "loading" | "active" | "error";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseNeoAvatarReturn {
  // États
  sessionState: SessionState;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isTalking: boolean;
  chatHistory: ChatMessage[]; // 🆕 Historique des messages

  // Actions
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
}

// ========================================================================
// 🔧 Configuration par défaut (Anastasia, Français, Mode Vocal)
// ========================================================================

const DEFAULT_AVATAR_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Anastasia_Chair_Sitting_public",
  language: "fr",
  voice: {
    rate: 1.0,
    emotion: VoiceEmotion.FRIENDLY,
  },
  knowledgeBase: "",
};

// ========================================================================
// 🎣 Hook Principal
// ========================================================================

export function useNeoAvatar(): UseNeoAvatarReturn {
  // ─────────────────────────────────────────────────────────────────────
  // États
  // ─────────────────────────────────────────────────────────────────────
  const [sessionState, setSessionState] = useState<SessionState>("inactive");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]); // 🆕

  // ─────────────────────────────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────────────────────────────
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────────────────────────────
  const isLoading = sessionState === "loading";

  // ─────────────────────────────────────────────────────────────────────
  // 1️⃣ Récupérer le token HeyGen
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
      console.error("❌ Erreur lors de la récupération du token:", err);
      throw new Error("Échec de connexion au serveur HeyGen");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // 2️⃣ Initialiser l'instance StreamingAvatar
  // ─────────────────────────────────────────────────────────────────────
  const initializeAvatar = useCallback(async (token: string) => {
    try {
      const avatar = new StreamingAvatar({ token });

      // Écouteurs d'événements HeyGen
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log("✅ Stream prêt:", event);
        if (event.detail) {
          setStream(event.detail);
        }
      });

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        console.log("🗣️ Avatar commence à parler");
        setIsTalking(true);
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log("🤐 Avatar arrête de parler");
        setIsTalking(false);
      });

      // 🆕 Transcription de ce que dit l'avatar
      avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        console.log("💬 Avatar dit:", event.detail.message);
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: event.detail.message,
            timestamp: new Date(),
          },
        ]);
      });

      // 🆕 Transcription de ce que dit l'utilisateur
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        console.log("🎤 Utilisateur dit:", event.detail.message);
        setChatHistory((prev) => [
          ...prev,
          {
            role: "user",
            content: event.detail.message,
            timestamp: new Date(),
          },
        ]);
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("🔌 Stream déconnecté");
        setSessionState("inactive");
        setStream(null);
      });

      avatarRef.current = avatar;
      return avatar;
    } catch (err) {
      console.error("❌ Erreur lors de l'initialisation de l'avatar:", err);
      throw new Error("Impossible d'initialiser l'avatar");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // 3️⃣ Démarrer la session vocale
  // ─────────────────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (sessionState === "loading" || sessionState === "active") {
      console.warn("⚠️ Session déjà en cours");
      return;
    }

    try {
      setSessionState("loading");
      setError(null);
      setChatHistory([]); // Réinitialiser l'historique

      console.log("🔄 Récupération du token...");
      const token = await fetchAccessToken();

      console.log("🔄 Initialisation de l'avatar...");
      const avatar = await initializeAvatar(token);

      console.log("🔄 Démarrage de la session vocale...");
      const sessionData = await avatar.createStartAvatar(
        DEFAULT_AVATAR_CONFIG
      );

      sessionIdRef.current = sessionData.session_id;

      console.log("✅ Session démarrée avec succès:", sessionData.session_id);
      setSessionState("active");

      // Démarrer le mode vocal (micro)
      console.log("🎤 Activation du micro...");
      await avatar.startVoiceChat();

    } catch (err) {
      console.error("❌ Erreur lors du démarrage de la session:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSessionState("error");
    }
  }, [sessionState, fetchAccessToken, initializeAvatar]);

  // ─────────────────────────────────────────────────────────────────────
  // 4️⃣ Arrêter la session
  // ─────────────────────────────────────────────────────────────────────
  const stopSession = useCallback(async () => {
    if (!avatarRef.current || !sessionIdRef.current) {
      console.warn("⚠️ Aucune session active à arrêter");
      return;
    }

    try {
      console.log("🛑 Arrêt de la session...");

      // Stopper l'avatar (arrête automatiquement le voice chat)
      await avatarRef.current.stopAvatar();

      // Nettoyer
      avatarRef.current = null;
      sessionIdRef.current = null;
      setStream(null);
      setSessionState("inactive");
      setIsTalking(false);

      console.log("✅ Session arrêtée avec succès");
    } catch (err) {
      console.error("❌ Erreur lors de l'arrêt de la session:", err);
      setError("Impossible d'arrêter la session proprement");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // 5️⃣ Nettoyage automatique au démontage du composant
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (avatarRef.current && sessionIdRef.current) {
        console.log("🧹 Nettoyage automatique de la session");
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // 6️⃣ Retour du hook
  // ─────────────────────────────────────────────────────────────────────
  return {
    // États
    sessionState,
    stream,
    isLoading,
    error,
    isTalking,
    chatHistory, // 🆕

    // Actions
    startSession,
    stopSession,
  };
}

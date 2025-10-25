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
// 🔧 Configuration par défaut
// ========================================================================

const DEFAULT_AVATAR_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "Anastasia_Grey_Shirt_public",
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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // ─────────────────────────────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────────────────────────────
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // 🆕 Refs pour l'accumulation des messages
  const avatarMessageBufferRef = useRef<string>("");
  const avatarMessageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userMessageBufferRef = useRef<string>("");
  const userMessageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─────────────────────────────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────────────────────────────
  const isLoading = sessionState === "loading";

  // ─────────────────────────────────────────────────────────────────────
  // 🆕 Fonction d'accumulation pour l'avatar
  // ─────────────────────────────────────────────────────────────────────
  const accumulateAvatarMessage = useCallback((word: string) => {
    // Ajouter le mot au buffer
    avatarMessageBufferRef.current += (avatarMessageBufferRef.current ? " " : "") + word;

    // Nettoyer le timer précédent
    if (avatarMessageTimerRef.current) {
      clearTimeout(avatarMessageTimerRef.current);
    }

    // Vérifier si c'est la fin d'une phrase (ponctuation)
    const endsWithPunctuation = /[.!?]$/.test(word.trim());

    if (endsWithPunctuation) {
      // Fin de phrase détectée → Ajouter immédiatement
      const completeMessage = avatarMessageBufferRef.current.trim();
      if (completeMessage) {
        console.log("💬 Avatar (phrase complète):", completeMessage);
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: completeMessage,
            timestamp: new Date(),
          },
        ]);
        avatarMessageBufferRef.current = "";
      }
    } else {
      // Attendre 800ms de silence avant de considérer la phrase terminée
      avatarMessageTimerRef.current = setTimeout(() => {
        const completeMessage = avatarMessageBufferRef.current.trim();
        if (completeMessage) {
          console.log("💬 Avatar (timeout 800ms):", completeMessage);
          setChatHistory((prev) => [
            ...prev,
            {
              role: "assistant",
              content: completeMessage,
              timestamp: new Date(),
            },
          ]);
          avatarMessageBufferRef.current = "";
        }
      }, 800);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // 🆕 Fonction d'accumulation pour l'utilisateur
  // ─────────────────────────────────────────────────────────────────────
  const accumulateUserMessage = useCallback((word: string) => {
    // Ajouter le mot au buffer
    userMessageBufferRef.current += (userMessageBufferRef.current ? " " : "") + word;

    // Nettoyer le timer précédent
    if (userMessageTimerRef.current) {
      clearTimeout(userMessageTimerRef.current);
    }

    // Vérifier si c'est la fin d'une phrase
    const endsWithPunctuation = /[.!?]$/.test(word.trim());

    if (endsWithPunctuation) {
      // Fin de phrase détectée → Ajouter immédiatement
      const completeMessage = userMessageBufferRef.current.trim();
      if (completeMessage) {
        console.log("🎤 Utilisateur (phrase complète):", completeMessage);
        setChatHistory((prev) => [
          ...prev,
          {
            role: "user",
            content: completeMessage,
            timestamp: new Date(),
          },
        ]);
        userMessageBufferRef.current = "";
      }
    } else {
      // Attendre 1000ms de silence
      userMessageTimerRef.current = setTimeout(() => {
        const completeMessage = userMessageBufferRef.current.trim();
        if (completeMessage) {
          console.log("🎤 Utilisateur (timeout 1000ms):", completeMessage);
          setChatHistory((prev) => [
            ...prev,
            {
              role: "user",
              content: completeMessage,
              timestamp: new Date(),
            },
          ]);
          userMessageBufferRef.current = "";
        }
      }, 1000);
    }
  }, []);

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
  const initializeAvatar = useCallback(
    async (token: string) => {
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

          // Forcer l'ajout du message en cours si l'avatar s'arrête
          if (avatarMessageTimerRef.current) {
            clearTimeout(avatarMessageTimerRef.current);
          }
          const remaining = avatarMessageBufferRef.current.trim();
          if (remaining) {
            console.log("💬 Avatar (fin de parole):", remaining);
            setChatHistory((prev) => [
              ...prev,
              {
                role: "assistant",
                content: remaining,
                timestamp: new Date(),
              },
            ]);
            avatarMessageBufferRef.current = "";
          }
        });

        // 🆕 Transcription de l'avatar (mot par mot) → Accumulation
        avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
          const word = event.detail.message;
          console.log("📝 Avatar mot:", word);
          accumulateAvatarMessage(word);
        });

        // 🆕 Transcription utilisateur (mot par mot) → Accumulation
        avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
          const word = event.detail.message;
          console.log("📝 User mot:", word);
          accumulateUserMessage(word);
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
    },
    [accumulateAvatarMessage, accumulateUserMessage]
  );

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
      setChatHistory([]);

      console.log("🔄 Récupération du token...");
      const token = await fetchAccessToken();

      console.log("🔄 Initialisation de l'avatar...");
      const avatar = await initializeAvatar(token);

      console.log("🔄 Démarrage de la session vocale...");
      const sessionData = await avatar.createStartAvatar(DEFAULT_AVATAR_CONFIG);

      sessionIdRef.current = sessionData.session_id;

      console.log("✅ Session démarrée avec succès:", sessionData.session_id);
      setSessionState("active");

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

      // Nettoyer les timers et buffers
      if (avatarMessageTimerRef.current) {
        clearTimeout(avatarMessageTimerRef.current);
      }
      if (userMessageTimerRef.current) {
        clearTimeout(userMessageTimerRef.current);
      }

      // Ajouter les messages restants dans les buffers
      const remainingAvatar = avatarMessageBufferRef.current.trim();
      const remainingUser = userMessageBufferRef.current.trim();

      if (remainingAvatar) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: remainingAvatar,
            timestamp: new Date(),
          },
        ]);
      }

      if (remainingUser) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "user",
            content: remainingUser,
            timestamp: new Date(),
          },
        ]);
      }

      // Réinitialiser les buffers
      avatarMessageBufferRef.current = "";
      userMessageBufferRef.current = "";

      // Stopper l'avatar
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
  // 5️⃣ Nettoyage automatique au démontage
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (avatarRef.current && sessionIdRef.current) {
        console.log("🧹 Nettoyage automatique de la session");
        avatarRef.current.stopAvatar().catch(console.error);
      }

      // Nettoyer les timers
      if (avatarMessageTimerRef.current) {
        clearTimeout(avatarMessageTimerRef.current);
      }
      if (userMessageTimerRef.current) {
        clearTimeout(userMessageTimerRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // 6️⃣ Retour du hook
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

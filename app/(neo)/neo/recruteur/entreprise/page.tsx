// /app/(neo)/neo/hooks/useNeoAvatar.ts

import { useState, useRef, useCallback, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  VoiceEmotion,
  StartAvatarRequest,
} from "@heygen/streaming-avatar";

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

export function useNeoAvatar(config?: UseNeoAvatarConfig): UseNeoAvatarReturn {
  const [sessionState, setSessionState] = useState<SessionState>("inactive");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const avatarRef = useRef<StreamingAvatar | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentSenderRef = useRef<"user" | "assistant" | null>(null);

  const isLoading = sessionState === "loading";

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

      const avatarConfig: StartAvatarRequest = {
        quality: AvatarQuality.High,
        avatarName: config?.avatarName || "Anastasia_Chair_Sitting_public",
        language: config?.language || "fr",
        voice: {
          rate: config?.voiceRate || 1.2,
          emotion: VoiceEmotion.FRIENDLY,
        },
        knowledgeId: config?.knowledgeId || undefined,
      };

      console.log("🔥 Configuration envoyée à HeyGen:", avatarConfig);
      if (avatarConfig.knowledgeId) {
        console.log("🔥 Knowledge ID:", avatarConfig.knowledgeId);
      } else {
        console.log("ℹ️ Aucune Knowledge Base (conversation générale)");
      }

      console.log("🔄 Démarrage de la session...");
      const sessionData = await avatar.createStartAvatar(avatarConfig);

      sessionIdRef.current = sessionData.session_id;

      console.log("✅ Session démarrée:", sessionData.session_id);
      setSessionState("active");

      console.log("🎤 Activation du micro...");
      await avatar.startVoiceChat();

      console.log("✅ Voice Chat actif - l'utilisateur peut parler");
    } catch (err) {
      console.error("❌ Erreur démarrage:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSessionState("error");
    }
  }, [sessionState, config, fetchAccessToken, initializeAvatar]);

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

  useEffect(() => {
    return () => {
      if (avatarRef.current && sessionIdRef.current) {
        console.log("🧹 Nettoyage automatique");
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

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

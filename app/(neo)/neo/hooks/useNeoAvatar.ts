// /app/(neo)/neo/hooks/useNeoAvatar.ts
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  VoiceEmotion,
  StartAvatarRequest,
  TaskType,
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
  const currentSenderRef = useRef<"user" | "assistant" | null>(null);
  
  // 🆕 NOUVEAU : Flag pour ignorer le premier message user (message initial)
  const shouldIgnoreNextUserMessage = useRef(false);

  const isLoading = sessionState === "loading";

  // Initialize chat history from initialChatHistory if provided
  useEffect(() => {
    if (config?.initialChatHistory && config.initialChatHistory.length > 0) {
      setChatHistory(config.initialChatHistory);
    }
  }, [config?.initialChatHistory]);

  const handleUserTalkingMessage = useCallback((event: any) => {
    const word = event.detail.message;

    // 🆕 NOUVEAU : Ignorer le message si c'est celui envoyé par initialMessage
    if (shouldIgnoreNextUserMessage.current) {
      console.log("🔇 Message initial ignoré (pas de doublon)");
      shouldIgnoreNextUserMessage.current = false;
      return;
    }

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

  // Méthode pour faire parler l'avatar (phrase initiale)
  const startInitialSpeak = useCallback(async (text: string) => {
    if (!avatarRef.current) {
      console.warn("Avatar pas initialisé");
      return;
    }
    try {
      // 🆕 NOUVEAU : Activer le flag pour ignorer le prochain message user
      shouldIgnoreNextUserMessage.current = true;

      await avatarRef.current.speak({
        text,
        task_type: TaskType.TALK,
      });
      
      console.log("✅ Message initial envoyé (sera ignoré du chat)");
    } catch (err) {
      console.warn("⚠️ Erreur lors de l'envoi du message initial :", err);
      // Réinitialiser le flag en cas d'erreur
      shouldIgnoreNextUserMessage.current = false;
    }
  }, []);

  // Méthode pour interrompre la parole de l'avatar
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
      currentSenderRef.current = null;
      // 🆕 NOUVEAU : Réinitialiser le flag
      shouldIgnoreNextUserMessage.current = false;

      const token = await fetchAccessToken();
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

      const sessionData = await avatar.createStartAvatar(avatarConfig);
      sessionIdRef.current = sessionData.session_id;
      setSessionState("active");

      await avatar.startVoiceChat();

      if (config?.initialMessage) {
        await startInitialSpeak(config.initialMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSessionState("error");
      // 🆕 NOUVEAU : Réinitialiser le flag en cas d'erreur
      shouldIgnoreNextUserMessage.current = false;
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
      currentSenderRef.current = null;
      // 🆕 NOUVEAU : Réinitialiser le flag
      shouldIgnoreNextUserMessage.current = false;
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

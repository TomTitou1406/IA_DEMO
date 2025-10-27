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
  sessionId?: string; // Pour reprise de session
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
  getSessionId: () => string | null;
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

  useEffect(() => {
    if (config?.initialChatHistory && config.initialChatHistory.length > 0) {
      setChatHistory(config.initialChatHistory);
    }
  }, [config?.initialChatHistory]);

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

  // --- Correction principale ici : distinction création/reprise session ---
  const fetchAccessToken = useCallback(async (): Promise<string> => {
    try {
      if (config?.sessionId) {
        // Reprise de session : session_id connu => on récupère le session token
        const response = await fetch("/api/get-session-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: config.sessionId }),
        });

        if (!response.ok) {
          throw new Error("Impossible de récupérer le token de session");
        }
        const data = await response.json();
        if (!data.token) {
          throw new Error("Token de session invalide");
        }

        return data.token;
      } else {
        // Création nouvelle session : token classique
        const response = await fetch("/api/get-access-token", {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("Impossible de récupérer le token d'accès");
        }
        const token = await response.text();
        return token;
      }
    } catch (err) {
      console.error("❌ Erreur récupération token :", err);
      throw new Error("Échec de connexion au serveur HeyGen");
    }
  }, [config?.sessionId]);
  // ------------------------------------------------------

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

  const startInitialSpeak = useCallback(async (text: string) => {
    if (!avatarRef.current) {
      console.warn("Avatar pas initialisé");
      return;
    }
    try {
      await avatarRef.current.speak({
        text,
        task_type: TaskType.TALK,
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

  // Main session flow (reprendre la session selon token, pas dans l'objet config !)
  const startSession = useCallback(async () => {
    if (sessionState === "loading" || sessionState === "active") {
      return;
    }
    try {
      setSessionState("loading");
      setError(null);
      setChatHistory(config?.initialChatHistory ?? []);
      currentSenderRef.current = null;

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

      // Nouveau : la reprise se fait par le token de session, pas par sessionId dans config
      if (config?.sessionId) {
        // Mode REPRISE
        sessionIdRef.current = config.sessionId;
        console.log("Reprise de session avec session_id & TOKEN", sessionIdRef.current);

        // On demande au SDK de se synchroniser via le token, pas via la config
        const resumedSessionData = await avatar.createStartAvatar(avatarConfig);

        if (!resumedSessionData.session_id) {
          throw new Error("Impossible de reprendre la session : session_id manquant");
        }
        sessionIdRef.current = resumedSessionData.session_id;

        await avatar.startSession(); // Sans argument
      } else {
        // Mode CREATION
        const sessionData = await avatar.newSession(avatarConfig);

        if (sessionData && typeof sessionData.session_id === "string" && sessionData.session_id.length > 0) {
          sessionIdRef.current = sessionData.session_id;
          console.log("Nouvelle session créée avec session_id", sessionIdRef.current);
        } else {
          sessionIdRef.current = null;
          console.error("Problème : session_id absent dans la réponse", sessionData);
        }

        await avatar.startSession(); // Sans argument
      }

      setSessionState("active");
      console.log("[HOOK] sessionState passé à active");

      await avatar.startVoiceChat().catch((err) => {
        console.error("[HOOK] Erreur startVoiceChat :", err);
      });

      if (config?.initialMessage) {
        await startInitialSpeak(config.initialMessage);
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
      currentSenderRef.current = null;
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

  const getSessionId = useCallback((): string | null => {
    return sessionIdRef.current;
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
    interrupt,
    startInitialSpeak,
    getSessionId,
  };
}

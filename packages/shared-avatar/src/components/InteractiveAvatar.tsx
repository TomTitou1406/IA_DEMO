import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  StartAvatarRequest,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, useUnmount } from "ahooks";
import { AvatarConfig } from "./AvatarConfig";
import { AvatarVideo } from "./AvatarSession/AvatarVideo";
import { Button } from '@neorecrut/shared-ui';
import { useStreamingAvatarSession } from '../hooks/useStreamingAvatarSession';
import { AvatarControls } from "./AvatarSession/AvatarControls";
import { useVoiceChat } from '../hooks/useVoiceChat';
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "../hooks";
import { LoadingIcon } from '@neorecrut/shared-ui';
import { MessageHistory } from "./AvatarSession/MessageHistory";
import { AVATARS } from "@/app/lib/constants";

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: AVATARS[0]?.avatar_id ?? "Pedro_Blue_Shirt_public",
  knowledgeId: "262a94b9bd4a45ad94ea3f7fd4264300", //Base de bricolage
  voice: {
    rate: 1.2, //mieux pour le phraser français
    emotion: VoiceEmotion.FRIENDLY,
    model: ElevenLabsModel.eleven_multilingual_v2, // Mieux pour le phraser français
  },
  language: "fr",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();

  const [config, setConfig] = useState<StartAvatarRequest>(DEFAULT_CONFIG);

  const mediaStream = useRef<HTMLVideoElement>(null);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
      });
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail);
      });
      avatar.on(StreamingEvents.USER_START, (event) => {
        console.log(">>>>> User started talking:", event);
      });
      avatar.on(StreamingEvents.USER_STOP, (event) => {
        console.log(">>>>> User stopped talking:", event);
      });
      avatar.on(StreamingEvents.USER_END_MESSAGE, (event) => {
        console.log(">>>>> User end message:", event);
      });
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        console.log(">>>>> User talking message:", event);
      });
      avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        console.log(">>>>> Avatar talking message:", event);
      });
      avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        console.log(">>>>> Avatar end message:", event);
      });

      await startAvatar(config);

      if (isVoiceChat) {
        await startVoiceChat();
      }
    } catch (error) {
      console.error("Error starting avatar session:", error);
    }
  });

  useUnmount(() => {
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [mediaStream, stream]);

  return (
  <>
    {sessionState === StreamingAvatarSessionState.INACTIVE ? (
      // ===== Page d'accueil scrollable (fond principal, pas de "fenêtre") =====
      <div className="w-full max-w-5xl mx-auto px-4 pt-4 pb-28">
        <AvatarConfig config={config} onConfigChange={setConfig} />
      </div>
    ) : (
      // ===== Mode session : vidéo + contrôles =====
      <div className="w-full flex flex-col gap-4">
        <div className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden">
          <div className="relative w-full aspect-video overflow-hidden flex items-center justify-center">
            <AvatarVideo ref={mediaStream} />
          </div>
          <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
            <AvatarControls />
          </div>
        </div>

        <MessageHistory />
      </div>
    )}

    {/* ===== Barre d'actions flottante (seulement à l'accueil) ===== */}
    {sessionState === StreamingAvatarSessionState.INACTIVE && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex gap-3 bg-zinc-900/90 border border-zinc-700 rounded-xl px-4 py-3 shadow-xl backdrop-blur">
          <Button onClick={() => startSessionV2(true)}>
            Parler avec l’avatar (réponses orales)
          </Button>
          <Button onClick={() => startSessionV2(false)}>
            Écrire à l’avatar (réponses orales)
          </Button>
        </div>
      </div>
    )}
  </>
);
}
export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}

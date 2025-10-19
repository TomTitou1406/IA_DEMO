// ============================================================================
// index.tsx – Version v0.1
// Refonte de la page de configuration de l'avatar interactif HeyGen
// Objectif : une expérience claire en 3 étapes, responsive desktop/mobile
// Étapes :
//   1. Sélection d’un avatar (grille dynamique)
//   2. Sélection de la langue de travail
//   3. Accès aux paramètres avancés (ShowMore)
// Auteur : Christophe Fischer / Op’Team-IA
// ============================================================================

"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  AvatarQuality,
  ElevenLabsModel,
  STTProvider,
  VoiceEmotion,
  StartAvatarRequest,
  VoiceChatTransport,
} from "@heygen/streaming-avatar";

import { Input } from "../Input";
import { Select } from "../Select";
import { Field } from "./Field";
import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

// ============================================================================
// ⚙️ Valeurs par défaut (modifiables)
// ============================================================================
const DEFAULT_KB_ID = "262a94b9bd4a45ad94ea3f7fd4264300";
const DEFAULT_LANGUAGE = "fr";

// ============================================================================
// 🧩 Composant principal
// ============================================================================
interface AvatarConfigProps {
  onConfigChange: (config: StartAvatarRequest) => void;
  config: StartAvatarRequest;
}

export const AvatarConfig: React.FC<AvatarConfigProps> = ({
  onConfigChange,
  config,
}) => {
  // --------------------------------------------------------------------------
  // Hooks principaux
  // --------------------------------------------------------------------------
  const onChange = <T extends keyof StartAvatarRequest>(
    key: T,
    value: StartAvatarRequest[T],
  ) => {
    onConfigChange({ ...config, [key]: value });
  };

  const [showMore, setShowMore] = useState<boolean>(false);
  const didInitDefaults = useRef(false);

  // --------------------------------------------------------------------------
  // 🧠 Avatar sélectionné
  // --------------------------------------------------------------------------
  const selectedAvatar = useMemo(() => {
    const avatar = AVATARS.find(
      (avatar) => avatar.avatar_id === config.avatarName,
    );

    if (!avatar) {
      return { isCustom: true, name: "Custom Avatar ID", avatarId: null };
    } else {
      return { isCustom: false, name: avatar.name, avatarId: avatar.avatar_id };
    }
  }, [config.avatarName]);

  // --------------------------------------------------------------------------
  // ⚙️ Valeurs par défaut (Knowledge Base + Langue)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!config.knowledgeId || config.knowledgeId.trim() === "") {
      onChange("knowledgeId", DEFAULT_KB_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.knowledgeId]);

  useEffect(() => {
    if (didInitDefaults.current) return;
    didInitDefaults.current = true;
    const firstOption = STT_LANGUAGE_LIST?.[0]?.value; // souvent "en"
    if (!config.language || config.language === firstOption) {
      onChange("language", DEFAULT_LANGUAGE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // 🎨 Rendu principal
  // --------------------------------------------------------------------------
  const gridCols =
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center";

  return (
    <div className="relative flex flex-col gap-4 w-full max-w-[900px] py-8 pb-24 mx-auto px-4">

      {/* =========================================================================
         🧩 Étape 1 — Sélection de l'avatar
         ========================================================================= */}
      <h1 className="text-zinc-100 w-full text-center text-lg font-semibold mb-4">
        1 – Sélectionnez votre avatar
      </h1>

      <div className={gridCols}>
        {AVATARS.slice(0, 9).map((avatar) => (
          <div
            key={avatar.avatar_id}
            onClick={() => onChange("avatarName", avatar.avatar_id)}
            className={`relative flex flex-col items-center p-3 rounded-xl cursor-pointer transition border shadow-sm
              ${
                config.avatarName === avatar.avatar_id
                  ? "border-blue-500 bg-blue-950/30 scale-[1.02]"
                  : "border-zinc-700 hover:border-blue-400 hover:bg-blue-950/10"
              }`}
          >
            <img
              src={avatar.image || "/avatars/default.webp"}
              alt={avatar.name}
              className="w-24 h-24 object-cover rounded-full mb-2"
            />
            <p className="text-sm text-center text-zinc-200 font-medium">
              {avatar.name}
            </p>
            {config.avatarName === avatar.avatar_id && (
              <span className="text-xs text-blue-400 mt-1">Sélectionné</span>
            )}
          </div>
        ))}
      </div>

      {config.avatarName && (
        <p className="text-center text-xs text-zinc-400 mt-2">
          Avatar ID : {config.avatarName}
        </p>
      )}

      {/* =========================================================================
         🧩 Étape 2 — Sélection de la langue
         ========================================================================= */}
      <h1 className="text-zinc-100 w-full text-center text-lg font-semibold mt-10">
        2 – Sélectionnez votre langue de travail
      </h1>

      <Field label="Langue">
        <Select
          isSelected={(option) =>
            option.value === (config.language || DEFAULT_LANGUAGE)
          }
          options={STT_LANGUAGE_LIST}
          renderOption={(option) => option.label}
          value={
            (
              STT_LANGUAGE_LIST.find((o) => o.value === config.language) ||
              STT_LANGUAGE_LIST.find((o) => o.value === DEFAULT_LANGUAGE)
            )?.label
          }
          onSelect={(option) => onChange("language", option.value)}
        />
      </Field>

      {/* =========================================================================
         🧩 Étape 3 — Paramètres avancés
         ========================================================================= */}
      <h1 className="text-zinc-100 w-full text-center text-lg font-semibold mt-10">
        3 – Paramètres avancés
      </h1>

      {showMore && (
        <>
          <Field label="Identifiant de la base de connaissances spécifiques">
            <Input
              placeholder="Saisir l'identifiant"
              value={config.knowledgeId || DEFAULT_KB_ID}
              onChange={(value) => onChange("knowledgeId", value)}
            />
          </Field>

          <Field label="Qualité vidéo de l'avatar">
            <Select
              isSelected={(option) => option === config.quality}
              options={Object.values(AvatarQuality)}
              renderOption={(option) => option}
              value={config.quality}
              onSelect={(option) => onChange("quality", option)}
            />
          </Field>

          <Field label="Méthode de transport de la voix">
            <Select
              isSelected={(option) => option === config.voiceChatTransport}
              options={Object.values(VoiceChatTransport)}
              renderOption={(option) => option}
              value={config.voiceChatTransport}
              onSelect={(option) => onChange("voiceChatTransport", option)}
            />
          </Field>

          <h1 className="text-zinc-100 w-full text-center mt-5">
            Voice Settings
          </h1>
          <Field label="Identifiant de la voix personnalisée">
            <Input
              placeholder="Saisir l'identifiant de la voix personnalisée"
              value={config.voice?.voiceId}
              onChange={(value) =>
                onChange("voice", { ...config.voice, voiceId: value })
              }
            />
          </Field>
          <Field label="Émotion">
            <Select
              isSelected={(option) => option === config.voice?.emotion}
              options={Object.values(VoiceEmotion)}
              renderOption={(option) => option}
              value={config.voice?.emotion}
              onSelect={(option) =>
                onChange("voice", { ...config.voice, emotion: option })
              }
            />
          </Field>
          <Field label="Modèle ElevenLabs">
            <Select
              isSelected={(option) => option === config.voice?.model}
              options={Object.values(ElevenLabsModel)}
              renderOption={(option) => option}
              value={config.voice?.model}
              onSelect={(option) =>
                onChange("voice", { ...config.voice, model: option })
              }
            />
          </Field>

          <h1 className="text-zinc-100 w-full text-center mt-5">
            STT Settings
          </h1>
          <Field label="Provider">
            <Select
              isSelected={(option) => option === config.sttSettings?.provider}
              options={Object.values(STTProvider)}
              renderOption={(option) => option}
              value={config.sttSettings?.provider}
              onSelect={(option) =>
                onChange("sttSettings", {
                  ...config.sttSettings,
                  provider: option,
                })
              }
            />
          </Field>
        </>
      )}

      {/* Bouton de bascule pour afficher/masquer les paramètres */}
      <button
        className="text-zinc-400 text-sm cursor-pointer w-full text-center bg-transparent mt-2"
        onClick={() => setShowMore(!showMore)}
      >
        {showMore
          ? "Masquer les paramètres avancés"
          : "Afficher les paramètres avancés"}
      </button>
    </div>
  );
};

// ============================================================================
// index.tsx – Version v0.2
// Refonte de la page de configuration de l'avatar interactif HeyGen
// AMÉLIORATIONS v0.2 :
//   - Ajout voice.rate (vitesse parole)
//   - Ajout sttSettings.confidence (seuil confiance)
//   - Ajout activityIdleTimeout (timeout session)
//   - Section Session Settings
// Objectif : une expérience claire en 3 étapes, responsive desktop/mobile
// Étapes :
//   1. Sélection d'un avatar (grille dynamique)
//   2. Sélection de la langue de travail
//   3. Accès aux paramètres avancés (ShowMore)
// Auteur : Christophe Fischer / Op'Team-IA
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
const DEFAULT_VOICE_RATE = 1.0;
const DEFAULT_STT_CONFIDENCE = 0.70;
const DEFAULT_IDLE_TIMEOUT = 300;

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
    const firstOption = STT_LANGUAGE_LIST?.[0]?.value;
    if (!config.language || config.language === firstOption) {
      onChange("language", DEFAULT_LANGUAGE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // 🎨 Rendu principal
  // --------------------------------------------------------------------------
  const gridCols =
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 justify-items-center";

  return (
    <div className="relative flex flex-col gap-3 w-full py-2 px-3">

      {/* =========================================================================
         🧩 Étape 1 — Sélection de l'avatar
         ========================================================================= */}
      <h1 className="text-zinc-100 text-base font-semibold text-center mt-2 mb-2">
        1 – Sélectionnez votre avatar
      </h1>

      <div className={gridCols}>
        {AVATARS.slice(0, 9).map((avatar) => (
          <div
            key={avatar.avatar_id}
            onClick={() => onChange("avatarName", avatar.avatar_id)}
            className={`relative flex flex-col items-center p-2 rounded-xl cursor-pointer transition border
              ${
                config.avatarName === avatar.avatar_id
                  ? "border-blue-500 bg-blue-950/30"
                  : "border-zinc-700 hover:border-blue-400 hover:bg-blue-950/10"
              }`}
          >
            <img
              src={avatar.image || "/avatars/default.webp"}
              alt={avatar.name}
              className="w-20 h-20 object-cover rounded-full mb-1"
            />
            <p className="text-[13px] leading-tight text-center text-zinc-200">{avatar.name}</p>
            {config.avatarName === avatar.avatar_id && (
              <span className="text-[11px] text-blue-400 mt-0.5">Sélectionné</span>
            )}
          </div>
        ))}
      </div>

      {config.avatarName && (
        <p className="text-center text-xs text-zinc-500 mt-1">
          Avatar ID : {config.avatarName}
        </p>
      )}

      {/* =========================================================================
         🧩 Étape 2 — Sélection de la langue
         ========================================================================= */}
      <h1 className="text-zinc-100 text-base font-semibold text-center mt-2 mb-2">
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
      <h1 className="text-zinc-100 text-base font-semibold text-center mt-2 mb-2">
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

          {/* ================================================================
              🆕 VOICE SETTINGS (ENRICHI)
              ================================================================ */}
          <h1 className="text-zinc-100 w-full text-center mt-5 mb-2 font-semibold">
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

          <Field 
            label="Vitesse de la parole" 
            tooltip="Contrôle la vitesse de parole de l'avatar (0.5 = lent, 1.5 = rapide)"
          >
            <Input
              type="number"
              min="0.5"
              max="1.5"
              step="0.1"
              placeholder="1.0 (naturel)"
              value={config.voice?.rate?.toString() || DEFAULT_VOICE_RATE.toString()}
              onChange={(value) => {
                const rate = parseFloat(value) || DEFAULT_VOICE_RATE;
                onChange("voice", { ...config.voice, rate });
              }}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Valeur actuelle : {config.voice?.rate || DEFAULT_VOICE_RATE} 
              {(config.voice?.rate || DEFAULT_VOICE_RATE) === 1.0 && " (naturel)"}
            </p>
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

          {/* ================================================================
              🆕 STT SETTINGS (ENRICHI)
              ================================================================ */}
          <h1 className="text-zinc-100 w-full text-center mt-5 mb-2 font-semibold">
            STT Settings (Speech-to-Text)
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

          <Field 
            label="Seuil de confiance" 
            tooltip="Précision requise pour accepter la transcription (0.5 = permissif, 0.9 = strict)"
          >
            <Input
              type="number"
              min="0"
              max="1"
              step="0.05"
              placeholder="0.70 (recommandé FR)"
              value={config.sttSettings?.confidence?.toString() || DEFAULT_STT_CONFIDENCE.toString()}
              onChange={(value) => {
                const confidence = parseFloat(value) || DEFAULT_STT_CONFIDENCE;
                onChange("sttSettings", {
                  ...config.sttSettings,
                  confidence,
                });
              }}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Valeur actuelle : {config.sttSettings?.confidence || DEFAULT_STT_CONFIDENCE}
              {(config.sttSettings?.confidence || DEFAULT_STT_CONFIDENCE) === 0.70 && " (recommandé FR)"}
            </p>
          </Field>

          {/* ================================================================
              🆕 SESSION SETTINGS (NOUVEAU)
              ================================================================ */}
          <h1 className="text-zinc-100 w-full text-center mt-5 mb-2 font-semibold">
            Session Settings
          </h1>

          <Field 
            label="Timeout d'inactivité (secondes)" 
            tooltip="Délai avant fermeture automatique de la session (30-3600s)"
          >
            <Input
              type="number"
              min="30"
              max="3600"
              step="30"
              placeholder="300 (5 minutes)"
              value={config.activityIdleTimeout?.toString() || DEFAULT_IDLE_TIMEOUT.toString()}
              onChange={(value) => {
                const timeout = parseInt(value) || DEFAULT_IDLE_TIMEOUT;
                onChange("activityIdleTimeout", timeout);
              }}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Valeur actuelle : {config.activityIdleTimeout || DEFAULT_IDLE_TIMEOUT}s 
              ({Math.floor((config.activityIdleTimeout || DEFAULT_IDLE_TIMEOUT) / 60)} minutes)
            </p>
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
        </>
      )}

      {/* Bouton de bascule pour afficher/masquer les paramètres */}
      <button
        className="text-zinc-400 text-sm cursor-pointer w-full text-center bg-transparent mt-2 hover:text-blue-400 transition"
        onClick={() => setShowMore(!showMore)}
      >
        {showMore
          ? "▲ Masquer les paramètres avancés"
          : "▼ Afficher les paramètres avancés"}
      </button>
    </div>
  );
};

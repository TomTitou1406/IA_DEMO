// components/ui/InteractiveBlock.tsx

"use client";

import React, { useEffect, useRef } from "react";
import { useNeoAvatar } from "@/app/(neo)/neo/hooks/useNeoAvatar";

type EtatDiscussion = "init" | "active" | "pause" | "stopped" | "finalized";

type Props = {
  title: string;
  subtitle?: string;
  discussion: string[];
  etatDiscussion: EtatDiscussion;
  setEtatDiscussion: React.Dispatch<React.SetStateAction<EtatDiscussion>>;
  setDiscussion: React.Dispatch<React.SetStateAction<string[]>>;
  onAbandonner: () => void;
  onConfirmerAbandon: (confirmer: boolean) => void;
  showConfirmation: boolean;
  onFinaliser: () => void;
  onSauvegarder: () => void;
  showSavedMessage: boolean;
};

export default function InteractiveBlock({
  title,
  subtitle,
  discussion,
  etatDiscussion,
  setEtatDiscussion,
  setDiscussion,
  onAbandonner,
  onConfirmerAbandon,
  showConfirmation,
  onFinaliser,
  onSauvegarder,
  showSavedMessage,
}: Props) {
  // ─────────────────────────────────────────────────────────────────────
  // 🎣 Hook HeyGen
  // ─────────────────────────────────────────────────────────────────────
  const {
    sessionState,
    stream,
    isLoading,
    error,
    isTalking,
    startSession,
    stopSession,
  } = useNeoAvatar();

  // ─────────────────────────────────────────────────────────────────────
  // 📹 Référence vidéo pour afficher le stream
  // ─────────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mettre à jour la vidéo quand le stream change
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Erreur lecture vidéo:", err);
      });
    }
  }, [stream]);

  // ─────────────────────────────────────────────────────────────────────
  // 🎮 Handlers pour boutons (synchronisés avec HeyGen)
  // ─────────────────────────────────────────────────────────────────────
  const demarrerDiscussion = async () => {
    try {
      setDiscussion(["🔄 Connexion à l'avatar HeyGen en cours..."]);
      await startSession();
      setDiscussion((prev) => [
        ...prev,
        "✅ Avatar connecté ! Vous pouvez parler, Anastasia vous écoute.",
      ]);
      setEtatDiscussion("active");
    } catch (err) {
      setDiscussion((prev) => [
        ...prev,
        "❌ Erreur : Impossible de démarrer la session.",
      ]);
    }
  };

  const fairePause = () => {
    if (etatDiscussion === "active") {
      setDiscussion((prev) => [...prev, "⏸️ Discussion en pause."]);
      setEtatDiscussion("pause");
      // Note : On ne coupe pas la session HeyGen, juste l'état UI
    }
  };

  const reprendreDiscussion = () => {
    if (etatDiscussion === "pause") {
      setDiscussion((prev) => [...prev, "▶️ Discussion reprise."]);
      setEtatDiscussion("active");
    }
  };

  const stopperDiscussion = async () => {
    if (etatDiscussion === "pause") {
      setDiscussion((prev) => [...prev, "🛑 Arrêt de la session HeyGen..."]);
      await stopSession();
      setDiscussion((prev) => [...prev, "✅ Session arrêtée."]);
      setEtatDiscussion("stopped");
    }
  };

  const canFinalize = etatDiscussion === "stopped";

  // ─────────────────────────────────────────────────────────────────────
  // 🎨 Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* ========== En-tête ========== */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--nc-blue)] mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 text-sm">{subtitle}</p>
        )}
      </div>

      {/* ========== Zone Avatar + Fil de discussion ========== */}
      <div className="flex gap-6 items-start">
        {/* Colonne Gauche : Avatar Vidéo */}
        <div className="w-1/2 flex flex-col gap-4">
          {/* Zone Vidéo Avatar */}
          <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-[var(--nc-blue)]">
            {sessionState === "inactive" && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center text-white px-4">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-lg font-medium">
                    Cliquez sur "Discuter" pour démarrer
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    L'avatar Anastasia sera prêt à vous écouter
                  </p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <div className="animate-spin text-5xl mb-4">⏳</div>
                  <p className="text-lg">Connexion en cours...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
                <div className="text-center text-white px-4">
                  <div className="text-5xl mb-4">❌</div>
                  <p className="text-lg font-medium">Erreur</p>
                  <p className="text-sm text-red-300 mt-2">{error}</p>
                </div>
              </div>
            )}

            {/* Vidéo de l'avatar */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${
                sessionState === "active" ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Indicateur "En train de parler" */}
            {isTalking && sessionState === "active" && (
              <div className="absolute bottom-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <span className="animate-pulse">🎤</span>
                Anastasia parle...
              </div>
            )}

            {/* Indicateur Session Active */}
            {sessionState === "active" && !isTalking && (
              <div className="absolute bottom-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                🎧 En écoute
              </div>
            )}
          </div>

          {/* Barre de boutons de contrôle */}
          <div className="flex gap-2 justify-center flex-wrap">
            {/* Colonne 1: Discuter, Faire pause, Reprendre */}
            {etatDiscussion === "init" && (
              <button
                onClick={demarrerDiscussion}
                disabled={isLoading}
                className="bg-[var(--nc-blue)] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[var(--nc-cyan)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Connexion..." : "Discuter"}
              </button>
            )}

            {etatDiscussion === "active" && (
              <button
                onClick={fairePause}
                className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600 transition"
              >
                Faire pause
              </button>
            )}

            {etatDiscussion === "pause" && (
              <button
                onClick={reprendreDiscussion}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition"
              >
                Reprendre
              </button>
            )}

            {/* Colonne 2: Stopper / Abandonner */}
            {etatDiscussion === "pause" && (
              <button
                onClick={stopperDiscussion}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition"
              >
                Stopper
              </button>
            )}

            {etatDiscussion === "stopped" && (
              <button
                onClick={onAbandonner}
                className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition"
              >
                Abandonner
              </button>
            )}

            {/* Colonne 3: Ajouter PDF (finalized) */}
            {etatDiscussion === "finalized" && (
              <button className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700 transition">
                Ajouter PDF
              </button>
            )}

            {/* Colonne 4: Quitter / Finaliser / Sauvegarder */}
            {etatDiscussion === "init" && (
              <button
                onClick={() => window.history.back()}
                className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap hover:bg-gray-900 transition"
              >
                Quitter
              </button>
            )}

            {etatDiscussion === "stopped" && (
              <button
                onClick={onFinaliser}
                disabled={!canFinalize}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finaliser
              </button>
            )}

            {etatDiscussion === "finalized" && (
              <button
                onClick={onSauvegarder}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition"
              >
                Sauvegarder
              </button>
            )}
          </div>
        </div>

        {/* Colonne Droite : Fil de discussion */}
        <div className="w-1/2 bg-white border border-gray-300 rounded-xl p-4 h-[600px] overflow-y-auto shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
            📝 Fil de discussion
          </h3>
          {discussion.length === 0 ? (
            <p className="text-gray-400 text-center mt-8">
              Le fil de discussion apparaîtra ici.
            </p>
          ) : (
            <div className="space-y-2">
              {discussion.map((msg, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border-l-4 border-[var(--nc-cyan)]"
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== Confirmation abandon ========== */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md">
            <p className="text-lg font-medium text-gray-800 mb-6">
              Vous êtes sur le point d'abandonner cette tâche, confirmez-vous
              votre souhait (Oui/Non) ?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => onConfirmerAbandon(true)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition"
              >
                Oui
              </button>
              <button
                onClick={() => onConfirmerAbandon(false)}
                className="flex-1 bg-gray-300 px-4 py-2 rounded font-medium hover:bg-gray-400 transition"
              >
                Non
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Message sauvegarde ========== */}
      {showSavedMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          ✅ Sauvegarde de votre tâche effectuée
        </div>
      )}
    </div>
  );
}

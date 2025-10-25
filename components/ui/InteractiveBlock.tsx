// components/ui/InteractiveBlock.tsx

"use client";

import React, { useEffect, useRef } from "react";
import { useNeoAvatar } from "@/app/(neo)/neo/hooks/useNeoAvatar";

type Props = {
  title: string;
  subtitle?: string;
  avatarPreviewImage?: string;
  onFinaliser?: () => void;
  onSauvegarder?: () => void;
  onAbandonner?: () => void;
};

export default function InteractiveBlock({
  title,
  subtitle,
  avatarPreviewImage = "/avatars/Anastasia.png",
  onFinaliser,
  onSauvegarder,
  onAbandonner,
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
    chatHistory,
    startSession,
    stopSession,
  } = useNeoAvatar();

  // ─────────────────────────────────────────────────────────────────────
  // État local
  // ─────────────────────────────────────────────────────────────────────
  const [workflowState, setWorkflowState] = React.useState<
    "inactive" | "active" | "terminated"
  >("inactive");

  // ─────────────────────────────────────────────────────────────────────
  // 📹 Références
  // ─────────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mettre à jour la vidéo quand le stream change
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Erreur lecture vidéo:", err);
      });
    }
  }, [stream]);

  // Auto-scroll du chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Synchroniser workflow avec sessionState
  useEffect(() => {
    if (sessionState === "active") {
      setWorkflowState("active");
    } else if (sessionState === "inactive" && workflowState === "active") {
      setWorkflowState("terminated");
    }
  }, [sessionState, workflowState]);

  // ─────────────────────────────────────────────────────────────────────
  // 🎮 Handlers
  // ─────────────────────────────────────────────────────────────────────
  const handleDiscuter = async () => {
    setWorkflowState("active");
    await startSession();
  };

  const handleTerminer = async () => {
    console.log("🛑 Fermeture propre de la session HeyGen...");
    await stopSession();
  };

  const handleAjouterPDF = () => {
    console.log("📎 Ajout de PDF");
  };

  const handleFinaliser = () => {
    console.log("✅ Finalisation");
    if (onFinaliser) onFinaliser();
  };

  const handleSauvegarder = () => {
    console.log("💾 Sauvegarde");
    if (onSauvegarder) onSauvegarder();
  };

  const handleAbandonner = () => {
    console.log("❌ Abandon");
    if (onAbandonner) onAbandonner();
  };

  // ─────────────────────────────────────────────────────────────────────
  // 🎨 Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-5xl mx-auto px-4 py-2">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--nc-blue)] mb-2">
          {title}
        </h1>
        {subtitle && <p className="text-gray-600 text-sm">{subtitle}</p>}
      </div>

      {/* Zone Avatar Vidéo avec boutons en overlay */}
      <div className="w-full max-w-3xl">
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-[var(--nc-blue)] shadow-lg">
          {/* État Inactif / Terminé : Image de prévisualisation */}
          {(workflowState === "inactive" || workflowState === "terminated") &&
            !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="relative w-full h-full">
                  <img
                    src={avatarPreviewImage}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center text-white px-4">
                      {workflowState === "inactive" && (
                        <>
                          <p className="text-xl font-medium mb-2">
                            Cliquez sur &quot;Discuter&quot; pour démarrer
                          </p>
                          <p className="text-sm text-gray-300">
                            L'avatar Anastasia sera prêt à vous écouter
                          </p>
                        </>
                      )}
                      {workflowState === "terminated" && (
                        <>
                          <p className="text-xl font-medium mb-2">
                            ✅ Discussion terminée
                          </p>
                          <p className="text-sm text-gray-300">
                            Session fermée proprement
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Loading */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <div className="animate-spin text-5xl mb-4">⏳</div>
                <p className="text-lg">Connexion en cours...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
              <div className="text-center text-white px-4">
                <div className="text-5xl mb-4">❌</div>
                <p className="text-lg font-medium">Erreur</p>
                <p className="text-sm text-red-300 mt-2">{error}</p>
              </div>
            </div>
          )}

          {/* Vidéo active */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              workflowState === "active" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Indicateur "En train de parler" - Haut gauche */}
          {isTalking && workflowState === "active" && (
            <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 animate-pulse backdrop-blur-sm">
              <span>🎤</span>
              Anastasia parle...
            </div>
          )}

          {/* Indicateur "En écoute" - Haut gauche */}
          {workflowState === "active" && !isTalking && (
            <div className="absolute top-4 left-4 bg-blue-500/90 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
              🎧 En écoute
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* BOUTONS EN OVERLAY - BAS DE LA VIDÉO (GAIN DE PLACE)   */}
          {/* ═══════════════════════════════════════════════════════ */}

          {/* Boutons état INACTIF */}
          {workflowState === "inactive" && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 backdrop-blur-sm">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDiscuter}
                  className="bg-[var(--nc-blue)] text-white px-8 py-2.5 rounded-lg text-base font-medium hover:bg-[var(--nc-cyan)] transition shadow-lg"
                >
                  Discuter
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="bg-gray-700/80 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-600 transition shadow-lg backdrop-blur-sm"
                >
                  Quitter
                </button>
              </div>
            </div>
          )}

          {/* Boutons état ACTIVE */}
          {workflowState === "active" && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 backdrop-blur-sm">
              <div className="flex justify-center">
                <button
                  onClick={handleTerminer}
                  className="bg-red-600 text-white px-8 py-2.5 rounded-lg text-base font-medium hover:bg-red-700 transition shadow-lg"
                >
                  Terminer
                </button>
              </div>
            </div>
          )}

          {/* Boutons état TERMINÉ */}
          {workflowState === "terminated" && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 backdrop-blur-sm">
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={handleAjouterPDF}
                  className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition shadow-lg"
                >
                  Ajouter PDF
                </button>
                <button
                  onClick={handleFinaliser}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg"
                >
                  Finaliser
                </button>
                <button
                  onClick={handleAbandonner}
                  className="bg-gray-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition shadow-lg"
                >
                  Abandonner
                </button>
                <button
                  onClick={handleSauvegarder}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition shadow-lg"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fil de discussion - HAUTEUR DYNAMIQUE */}
      <div className="w-full max-w-3xl bg-white border border-gray-300 rounded-xl shadow-lg flex flex-col max-h-[50vh]">
        {/* Header compact */}
        <div className="px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span>💬</span>
            <span>Discussion</span>
          </h3>
        </div>

        {/* Conteneur de messages avec scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {chatHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              {workflowState === "inactive"
                ? "La conversation apparaîtra ici en temps réel."
                : workflowState === "terminated"
                ? "Discussion terminée. Historique préservé."
                : "La conversation apparaîtra ici en temps réel."}
            </p>
          ) : (
            <div className="space-y-3">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-100 border-l-4 border-blue-500"
                        : "bg-green-100 border-l-4 border-green-500"
                    }`}
                  >
                    <p className="font-medium text-xs text-gray-600 mb-1">
                      {msg.role === "user" ? "Vous" : "Anastasia"}
                    </p>
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

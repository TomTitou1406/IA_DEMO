"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNeoAvatar } from "@/app/(neo)/neo/hooks/useNeoAvatar";

type Props = {
  title: string;
  subtitle?: string;
  avatarPreviewImage?: string;
  knowledgeId?: string;
  avatarName?: string;
  voiceRate?: number;
  onFinaliser?: () => void;
  onSauvegarder?: () => void;
  onAbandonner?: () => void;
  initialMessage?: string;
};

export default function InteractiveBlock({
  title,
  subtitle,
  avatarPreviewImage,
  knowledgeId,
  avatarName,
  voiceRate,
  onFinaliser,
  onSauvegarder,
  onAbandonner,
  initialMessage = "Bonjour, je suis prêt à vous aider.",
}: Props) {
  const {
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
  } = useNeoAvatar({
    knowledgeId,
    avatarName,
    voiceRate,
    // Ici tu peux aussi passer initialMessage, si tu veux un message par défaut
    initialMessage: "Bonjour ! Je suis là pour vous assister.",
  });

  const [workflowState, setWorkflowState] = useState<
    "inactive" | "active" | "terminated"
  >("inactive");

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Démarre la session + parle le message d'entrée
  useEffect(() => {
    async function start() {
      await startSession();
      await startInitialSpeak(initialMessage);
      setTimeout(() => {
        startInitialSpeak(initialMessage);
      }, 500); // 500ms d’attente
    }
    start();
  }, [knowledgeId]); //avec knowledgeId, si change

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Erreur lecture vidéo:", err);
      });
    }
  }, [stream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    if (sessionState === "active") {
      setWorkflowState("active");
    } else if (sessionState === "inactive" && workflowState === "active") {
      setWorkflowState("terminated");
    }
  }, [sessionState, workflowState]);

  // Gère le bouton "Discuter"
  const handleDiscuter = async () => {
    await startSession();
    await startInitialSpeak(initialMessage);
  };

  const handleTerminer = async () => {
    await stopSession();
    setWorkflowState("terminated");
  };

  const handleInterrompre = async () => {
    await interrupt();
  };

  const handleAjouterPDF = () => {
    console.log("📎 Ajout de PDF");
  };

  const handleFinaliser = () => {
    if (onFinaliser) onFinaliser();
  };

  const handleSauvegarder = () => {
    if (onSauvegarder) onSauvegarder();
  };

  const handleAbandonner = () => {
    if (onAbandonner) onAbandonner();
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-5xl mx-auto px-4 mt-2">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--nc-blue)] mb-1">{title}</h1>
        {subtitle && <p className="text-gray-600 text-xs">{subtitle}</p>}
      </div>

      <div className="w-full max-w-3xl">
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-[var(--nc-blue)] shadow-lg">
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
                            L'avatar sera prêt à vous écouter
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

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              workflowState === "active" ? "opacity-100" : "opacity-0"
            }`}
          />

          {isTalking && workflowState === "active" && (
            <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 animate-pulse backdrop-blur-sm">
              <span>🎤</span>
              L'avatar parle...
            </div>
          )}

          {workflowState === "active" && !isTalking && (
            <div className="absolute top-4 left-4 bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
              🎧 En écoute
            </div>
          )}

          {/* BOUTONS EN OVERLAY */}

          {workflowState === "inactive" && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 backdrop-blur-sm">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDiscuter}
                  className="bg-[var(--nc-blue)] text-white px-8 py-2 rounded-lg text-sm font-medium hover:bg-[var(--nc-cyan)] transition shadow-lg"
                >
                  Discuter
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="bg-gray-700/80 text-white px-6 py-2 rounded-lg text-xs font-medium hover:bg-gray-600 transition shadow-lg backdrop-blur-sm"
                >
                  Quitter
                </button>
              </div>
            </div>
          )}

          {workflowState === "active" && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 backdrop-blur-sm">
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleTerminer}
                  className="bg-red-600 text-white px-8 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-lg"
                >
                  Terminer
                </button>
                {/* Nouveau bouton interruption */}
                <button
                  onClick={handleInterrompre}
                  disabled={!isTalking}
                  className={`bg-yellow-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition shadow-lg ${
                    !isTalking ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title="Interrompre la parole"
                >
                  Interrompre l’avatar
                </button>
              </div>
            </div>
          )}

          {workflowState === "terminated" && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 backdrop-blur-sm">
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={handleAjouterPDF}
                  className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 transition shadow-lg"
                >
                  Ajouter PDF
                </button>
                <button
                  onClick={handleFinaliser}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition shadow-lg"
                >
                  Finaliser
                </button>
                <button
                  onClick={handleAbandonner}
                  className="bg-gray-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 transition shadow-lg"
                >
                  Abandonner
                </button>
                <button
                  onClick={handleSauvegarder}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition shadow-lg"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fil de discussion */}
      <div className="w-full max-w-3xl bg-white border border-gray-300 rounded-xl shadow-lg flex flex-col max-h-[35vh]">
        <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span>💬</span>
            <span>Discussion</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {chatHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-6 text-xs">
              {workflowState === "inactive"
                ? "La conversation apparaîtra ici en temps réel."
                : workflowState === "terminated"
                ? "Discussion terminée. Historique préservé."
                : "La conversation apparaîtra ici en temps réel."}
            </p>
          ) : (
            <div className="space-y-2">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-100 border-l-4 border-blue-500 text-right"
                        : "bg-green-100 border-l-4 border-green-500"
                    }`}
                  >
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

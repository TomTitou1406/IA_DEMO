"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNeoAvatar } from "@/app/(neo)/neo/hooks/useNeoAvatar";
import { supabase } from "@/app/lib/supabaseClient";
import Toast from '@/components/ui/Toast';
import { DEFAULT_USER_ID } from "@/app/lib/constants";

type Props = {
  conversationId: string | null;
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
  conversationId,
  title,
  subtitle,
  avatarPreviewImage = "/avatars/anastasia_16_9_preview.webp",
  knowledgeId,
  avatarName,
  voiceRate,
  onFinaliser,
  onSauvegarder,
  onAbandonner,
  initialMessage = "Bonjour ! Pouvez-vous m'assister ?",
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
  });

  const [workflowState, setWorkflowState] = useState<"inactive" | "active" | "terminated">("inactive");
  const [timerSec, setTimerSec] = useState(0);
  const [initMessageSent, setInitMessageSent] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Timer
  useEffect(() => {
    if (sessionState === "active") {
      setTimerSec(0);
      timerRef.current = setInterval(() => setTimerSec((sec) => sec + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState]);

  // Initial message
  useEffect(() => {
    if (sessionState === "active" && !initMessageSent && initialMessage) {
      startInitialSpeak(initialMessage);
      setInitMessageSent(true);
    }
    if (sessionState === "inactive") setInitMessageSent(false);
  }, [sessionState, initMessageSent, initialMessage, startInitialSpeak]);

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
    if (sessionState === "active") setWorkflowState("active");
    else if (sessionState === "inactive" && workflowState === "active") setWorkflowState("terminated");
  }, [sessionState, workflowState]);

  const handleDiscuter = async () => { await startSession(); };
  const handleTerminer = async () => { await stopSession(); setWorkflowState("terminated");};
  const handleInterrompre = async () => { await interrupt(); };
  const handleAjouterPDF = () => { console.log("📎 Ajout de PDF"); };
  const handleFinaliser = () => { if (onFinaliser) onFinaliser(); };
  const handleSauvegarder = () => { if (onSauvegarder) onSauvegarder(); };
  const handleAbandonner = () => { if (onAbandonner) onAbandonner(); };

  const timerStr = `Durée : ${String(Math.floor(timerSec / 60)).padStart(2, "0")}:${String(timerSec % 60).padStart(2, "0")}`;

  // Fonction de sauvegarde des conversations
  async function saveConversation() {
    if (conversationId && conversationId !== "new") {
      // Update de la conversation existante
      const { error } = await supabase
        .from("conversations")
        .update({
          title,
          subtitle,
          avatar_preview_image: avatarPreviewImage,
          avatar_name: avatarName,
          knowledge_id: knowledgeId,
          initial_message: initialMessage,
          messages: chatHistory,
          updated_at: new Date(),
        })
        .eq("id", conversationId);
  
      if (error) {
        console.error("Erreur de mise à jour de la conversation :", error);
        setToastMessage("Erreur lors de la mise à jour de la conversation.");
        return;
      }
    } else {
      // Insertion d’une nouvelle conversation
      const { data, error } = await supabase.from("conversations").insert([
        {
          user_id: DEFAULT_USER_ID, // À gérer plus tard si authentification
          type: "entreprise", // ou 'poste' selon le contexte
          title,
          subtitle,
          avatar_preview_image: avatarPreviewImage,
          avatar_name: avatarName,
          knowledge_id: knowledgeId,
          initial_message: initialMessage,
          messages: chatHistory,
        },
      ]);
  
      if (error) {
        console.error("Erreur de sauvegarde de la conversation :", error);
        setToastMessage("Erreur lors de la sauvegarde de la conversation.");
        return;
      }
    }
  
    setToastMessage("Conversation sauvegardée avec succès !");
    console.log("Conversation sauvegardée");
    setTimeout(() => {
      setToastMessage(null);
      window.history.back();
    }, 2000); // Délai ajustable (ms)
  }
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-5xl mx-auto px-4 mt-2 relative">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--nc-blue)] mb-1">{title}</h1>
        {subtitle && <p className="text-gray-600 text-xs">{subtitle}</p>}
      </div>

      {/* Zone avatar principale */}
      <div className="w-full max-w-3xl relative">
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-[var(--nc-blue)] shadow-lg">

          {/* Preview + overlay inactif ou terminé */}
          {(workflowState === "inactive" || workflowState === "terminated") && !isLoading && (
            <div className="absolute inset-0 z-10">
              {/* Layer d'image en background */}
              <img
                src={avatarPreviewImage}
                alt="Avatar preview"
                className="absolute w-full h-full object-cover inset-0 z-0"
                style={{ pointerEvents: "none" }}
              />
              {/* Layer texte & boutons par dessus */}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10">
                <div className="text-center text-white px-4 mt-20 z-10">
                  {workflowState === "inactive" && (
                    <>
                      <p className="text-xl font-medium mb-2">Cliquez sur &quot;Discuter&quot; pour démarrer</p>
                      <p className="text-sm text-gray-300">L'avatar sera prêt à vous écouter</p>
                    </>
                  )}
                  {workflowState === "terminated" && (
                    <>
                      <p className="text-xl font-medium mb-2">✅ Discussion terminée</p>
                      <p className="text-sm text-gray-300">Session fermée normalement</p>
                    </>
                  )}
                </div>
                {/* Boutons inactif au-dessus (toujours cliquables) */}
                {workflowState === "inactive" && (
                  <div className="flex gap-3 justify-center mt-4 z-10">
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
                )}
              </div>
            </div>
          )}

          {/* Timer en overlay coin haut droit */}
          {(workflowState === "active" || workflowState === "terminated") && (
            <div className="absolute top-4 right-4 z-20">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium border shadow">
                {timerStr}
              </span>
            </div>
          )}

          {/* Indicateur dynamique haut gauche */}
          {workflowState === "active" && (
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              {isTalking ? (
                <span className="bg-gray-500/90 text-white px-3 py-1 rounded-full text-xs font-medium inline-flex items-center">
                  🎧 L’avatar parle...
                </span>
              ) : (
                <span className="bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-medium inline-flex items-center">
                  🎤 En écoute (parlez pour répondre)
                </span>
              )}
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

          {/* Loading */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
              <div className="text-center text-white">
                <div className="animate-spin text-5xl mb-4">⏳</div>
                <p className="text-lg">Connexion en cours...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-20">
              <div className="text-center text-white px-4">
                <div className="text-5xl mb-4">❌</div>
                <p className="text-lg font-medium">Erreur</p>
                <p className="text-sm text-red-300 mt-2">{error}</p>
              </div>
            </div>
          )}

          {/* Boutons overlay pour état ACTIVE, TOUJOURS visibles devant la vidéo */}
          {workflowState === "active" && (
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center z-20">
              <div className="text-xs text-gray-700 mb-1 text-center">
                - Pour interrompre l’avatar, parlez simplement ou cliquez :
              </div>
              <div className="flex flex-row gap-2 w-full justify-center">
                <button
                  onClick={handleTerminer}
                  className="w-40 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-lg"
                >
                  Terminer
                </button>
                <button
                  onClick={handleInterrompre}
                  disabled={!isTalking}
                  className={`w-40 bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition shadow-lg ${
                    !isTalking ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title="Interrompre la parole"
                >
                  Interrompre l’avatar
                </button>
              </div>
            </div>
          )}

          {/* Boutons overlay pour état TERMINÉ */}
          {workflowState === "terminated" && !isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 backdrop-blur-sm z-20">
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
                  onClick={saveConversation}
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
                    <p className="text-gray-800 text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>
      {/* TOAST EN FIN DE RENDU */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

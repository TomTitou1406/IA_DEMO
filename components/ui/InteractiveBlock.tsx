/**
 * @file InteractiveBlock.tsx
 * @version v0.06
 * @date 01 novembre 2025
 * @description Composant principal pour l'interaction avec l'avatar HeyGen
 * @changelog 
 *   v0.06 - Ajout analyse progression temps réel + barre de progression
 *   v0.05 - Réactivation message initial avec startInitialSpeak (caché du chat)
 *   v0.04 - Suppression du passage d'initialMessage (erreur : avatar passif)
 *   v0.03 - Désactivation startInitialSpeak
 *   v0.02 - Ajout types locaux et callback onConversationUpdate
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNeoAvatar } from "@/app/(neo)/neo/hooks/useNeoAvatar";
import { supabase } from "@/app/lib/supabaseClient";
import Toast from '@/components/ui/Toast';
import { DEFAULT_USER_ID } from "@/app/lib/constants";
import type { ChatMessage } from "@/app/(neo)/neo/hooks/useNeoAvatar";

// ============================================
// TYPES DÉFINIS LOCALEMENT
// ============================================

export interface ConversationContext {
  id?: string;
  context_key: string;
  context_type: string;
  title: string;
  subtitle?: string | null;
  avatar_preview_image?: string | null;
  avatar_name?: string | null;
  knowledge_id: string;
  voice_rate?: number | null;
  language?: string | null;
  initial_message_new: string;
  initial_message_resume?: string | null;
  is_active?: boolean;
}

type Props = {
  conversationId: string | null;
  conversationType: string;
  context: ConversationContext;
  chatHistory?: ChatMessage[];
  knowledgeBaseId?: string;
  entrepriseId?: string | null;
  onConversationUpdate?: (messages: ChatMessage[]) => void;
  onFinaliser?: () => void;
  onSauvegarder?: () => void;
  onAbandonner?: () => void;
};

export default function InteractiveBlock({
  conversationId,
  conversationType,
  context,
  chatHistory = [],
  knowledgeBaseId,
  entrepriseId,
  onConversationUpdate,
  onFinaliser,
  onSauvegarder,
  onAbandonner,
}: Props) {

  console.log('🎬 InteractiveBlock reçoit:', {
    entrepriseId,
    conversationId,
    conversationType
  });
  
  const initialMessage = chatHistory.length > 0 
    ? (context.initial_message_resume || context.initial_message_new)
    : context.initial_message_new;

  // ============================================
  // HOOK AVATAR
  // ============================================
  const {
    sessionState,
    stream,
    isLoading,
    error,
    isTalking,
    chatHistory: liveChatHistory,
    startSession,
    stopSession,
    interrupt,
    startInitialSpeak,
  } = useNeoAvatar({
    knowledgeId: knowledgeBaseId || context.knowledge_id,
    avatarName: context.avatar_name || undefined,
    voiceRate: context.voice_rate || 1.0,
    language: context.language || 'fr',
    initialMessage: initialMessage,
    initialChatHistory: chatHistory,
  });
    
  // ============================================
  // ÉTATS LOCAUX
  // ============================================
  const [workflowState, setWorkflowState] = useState<"inactive" | "active" | "terminated">("inactive");
  const [timerSec, setTimerSec] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [progression, setProgression] = useState({
    completed: 0,
    percentage: 0,
    themes: {
      histoire: false,
      mission: false,
      produits: false,
      marche: false,
      culture: false,
      equipe: false,
      avantages: false,
      localisation: false,
      perspectives: false,
      complementaire: false,
    }
  });
  
  // ============================================
  // REFS
  // ============================================
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveChatHistoryRef = useRef<ChatMessage[]>([]);
    
  // ============================================
  // EFFET : Timer
  // ============================================
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

  // ============================================
  // EFFET : Message initial (UNIQUE)
  // ============================================
  useEffect(() => {
    if (
      sessionState === "active" && 
      !initialMessageSentRef.current && 
      initialMessage 
    ) {
      const timeout = setTimeout(() => {
        if (sessionState === "active" && !initialMessageSentRef.current) {
          console.log('🎤 Envoi message initial (UNIQUE):', initialMessage);
          startInitialSpeak(initialMessage);
          initialMessageSentRef.current = true;
        }
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
    
    if (sessionState === "inactive") {
      initialMessageSentRef.current = false;
    }
  }, [sessionState, initialMessage, startInitialSpeak]);

  // ============================================
  // EFFET : Stream vidéo
  // ============================================
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Erreur lecture vidéo:", err);
      });
    }
  }, [stream]);

  // ============================================
  // EFFET : Auto-scroll chat
  // ============================================
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [liveChatHistory]);

  // ============================================
  // EFFET : Synchroniser chat history avec ref
  // ============================================
  useEffect(() => {
    liveChatHistoryRef.current = liveChatHistory;
  }, [liveChatHistory]);

  // ============================================
  // EFFET : Analyser progression au chargement
  // ============================================
  useEffect(() => {
    if (liveChatHistory.length > 0) {
      const initialProgression = analyzeProgression(liveChatHistory);
      setProgression(initialProgression);
      console.log('📊 Progression initiale:', initialProgression);
    }
  }, []); // Se déclenche une fois au mount

  // ============================================
  // EFFET : Workflow state
  // ============================================
  useEffect(() => {
    if (sessionState === "active") setWorkflowState("active");
    else if (sessionState === "inactive" && workflowState === "active") setWorkflowState("terminated");
  }, [sessionState, workflowState]);

  // ============================================
  // EFFET : Auto-save toutes les 30s
  // ============================================
  useEffect(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
  
    if (sessionState !== "active") {
      console.log('⚠️ Auto-save désactivé: session pas active');
      return;
    }
    
    console.log('✅ Auto-save ACTIVÉ');
  
    autoSaveIntervalRef.current = setInterval(async () => {
      const currentHistory = liveChatHistoryRef.current;
      const currentEntrepriseId = entrepriseId;
      const currentConversationId = conversationId;
  
      console.log('💾 Auto-save tick', {
        messages: currentHistory.length,
        entrepriseId: currentEntrepriseId,
        conversationId: currentConversationId
      });
  
      if (currentHistory.length === 0) {
        console.log('⏭️ Auto-save skip: pas de messages encore');
        return;
      }
  
      setIsSaving(true);
      
      try {
        let saveSuccess = false;
  
        if (currentConversationId) {
          const { error } = await supabase
            .from("conversations")
            .update({
              messages: currentHistory,
              last_activity_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentConversationId);
  
          if (error) {
            console.error('❌ Auto-save conversations:', error);
          } else {
            console.log('✅ Auto-save conversations OK:', currentHistory.length, 'messages');
            saveSuccess = true;
          }
        }
  
        if (currentEntrepriseId) {
          const { error } = await supabase
            .from("entreprises")
            .update({
              raw_conversation: currentHistory,
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentEntrepriseId);
  
          if (error) {
            console.error('❌ Auto-save entreprises:', error);
          } else {
            console.log('✅ Auto-save entreprises OK');
            saveSuccess = true;
          }
        }
  
        if (saveSuccess) {
          // Analyser et mettre à jour la progression
          const newProgression = analyzeProgression(currentHistory);
          setProgression(newProgression);
          console.log('📊 Progression mise à jour:', newProgression);
          
          setTimeout(() => setIsSaving(false), 2000);
        } else {
          setIsSaving(false);
        }
        
      } catch (error) {
        console.error('❌ Exception auto-save:', error);
        setIsSaving(false);
      }
    }, 30000);
  
    return () => {
      if (autoSaveIntervalRef.current) {
        console.log('🛑 Nettoyage auto-save interval');
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [sessionState, entrepriseId, conversationId]);
  
  // ============================================
  // HANDLERS
  // ============================================
  const handleDiscuter = async () => { 
    await startSession(); 
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

  // ============================================
  // ANALYSE PROGRESSION
  // ============================================
  function analyzeProgression(messages: ChatMessage[]) {
    const themes = {
      histoire: false,
      mission: false,
      produits: false,
      marche: false,
      culture: false,
      equipe: false,
      avantages: false,
      localisation: false,
      perspectives: false,
      complementaire: false,
    };

      // Analyser uniquement les messages de l'AVATAR
      const avatarMessages = messages
        .filter(m => m.role === 'assistant')
        .map(m => m.content.toLowerCase());
    
      const fullText = avatarMessages.join(' ');

    // Détecter les validations explicites de l'avatar
    if (fullText.match(/tout ce qu'il me faut sur (votre |l')?histoire|fondation validée|histoire.*complet/)) {
      themes.histoire = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (votre |la )?mission|vision.*validée|mission.*complet/)) {
      themes.mission = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (vos |les )?produits?|services?|offre.*validée/)) {
      themes.produits = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (votre )?marché|clients?.*validé|cible.*complet/)) {
      themes.marche = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (votre )?culture|valeurs?.*validée/)) {
      themes.culture = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (votre )?équipe|collaborateurs?.*validé|effectif.*complet/)) {
      themes.equipe = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (vos )?avantages?|bénéfices?.*validé/)) {
      themes.avantages = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (votre )?localisation|bureaux?.*validé|adresse.*complet/)) {
      themes.localisation = true;
    }
    if (fullText.match(/tout ce qu'il me faut sur (vos )?perspectives?|futur.*validé|ambitions?.*complet/)) {
      themes.perspectives = true;
    }
    if (fullText.match(/tout ce qu'il me faut|informations? complémentaires?.*validé|synthèse/)) {
      themes.complementaire = true;
    }

    const completed = Object.values(themes).filter(Boolean).length;
    const percentage = Math.round((completed / 10) * 100);

    return { themes, completed, percentage };
  }

  // ============================================
  // SAUVEGARDE CONVERSATION
  // ============================================
  async function saveConversation() {
    if (conversationId && conversationId !== "new") {
      const { error } = await supabase
        .from("conversations")
        .update({
          title: context.title,
          subtitle: context.subtitle,
          avatar_preview_image: context.avatar_preview_image,
          avatar_name: context.avatar_name,
          knowledge_id: context.knowledge_id,
          initial_message: initialMessage,
          messages: liveChatHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
  
      if (error) {
        console.error("Erreur de mise à jour de la conversation :", error);
        setToastMessage("Erreur lors de la mise à jour de la conversation.");
        return;
      }
    } else {
      const { error } = await supabase.from("conversations").insert([
        {
          user_id: DEFAULT_USER_ID,
          type: conversationType,
          title: context.title,
          subtitle: context.subtitle,
          avatar_preview_image: context.avatar_preview_image,
          avatar_name: context.avatar_name,
          knowledge_id: context.knowledge_id,
          initial_message: initialMessage,
          messages: liveChatHistory,
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
    }, 2000);
  }

  // ============================================
  // HELPERS
  // ============================================
  const timerStr = `Durée : ${String(Math.floor(timerSec / 60)).padStart(2, "0")}:${String(timerSec % 60).padStart(2, "0")}`;
  const avatarPreviewImage = context.avatar_preview_image || "/avatars/anastasia_16_9_preview.webp";

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-5xl mx-auto px-4 mt-2 relative">
      {/* Zone avatar principale */}
      <div className="w-full max-w-2xl relative">
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-[var(--nc-blue)] shadow-lg">

          {/* Preview + overlay inactif ou terminé */}
          {(workflowState === "inactive" || workflowState === "terminated") && !isLoading && (
            <div className="absolute inset-0 z-10">
              <img
                src={avatarPreviewImage}
                alt="Avatar preview"
                className="absolute w-full h-full object-cover inset-0 z-0"
                style={{ pointerEvents: "none" }}
              />
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

          {/* Timer + Sauvegarde */}
          {(workflowState === "active" || workflowState === "terminated") && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium border shadow">
                {timerStr}
              </span>
              {isSaving && (
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium border shadow animate-pulse">
                  💾 Sauvegarde...
                </span>
              )}
            </div>
          )}

          {/* Indicateur dynamique */}
          {workflowState === "active" && (
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              {isTalking ? (
                <span className="bg-gray-500/90 text-white px-3 py-1 rounded-full text-xs font-medium inline-flex items-center">
                  🎧 L'avatar parle...
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

          {/* Boutons ACTIVE */}
          {workflowState === "active" && (
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center z-20">
              <div className="text-xs text-gray-700 mb-1 text-center">
                - Pour interrompre l'avatar, parlez simplement ou cliquez :
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
                  Interrompre l'avatar
                </button>
              </div>
            </div>
          )}

          {/* Boutons TERMINÉ */}
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
        {/* Header avec barre de progression */}
        <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Icône + Titre */}
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
              <span>💬</span>
              <span className="hidden sm:inline">Discussion</span>
            </div>
            
            {/* Barre de progression inline */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500"
                  style={{ width: `${progression.percentage}%` }}
                />
              </div>
              
              {/* Pourcentage + Compte */}
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                {progression.percentage}% <span className="text-gray-400">({progression.completed}/10)</span>
              </span>
            </div>
          </div>
        </div>
      
        {/* Conteneur messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
          {liveChatHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-6 text-xs">
              {workflowState === "inactive"
                ? "La conversation apparaîtra ici en temps réel."
                : workflowState === "terminated"
                ? "Discussion terminée. Historique préservé."
                : "La conversation apparaîtra ici en temps réel."}
            </p>
          ) : (
            <div className="space-y-2">
              {liveChatHistory.map((msg, idx) => (
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
            </div>
          )}
        </div>
      </div>
      
      {/* TOAST */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

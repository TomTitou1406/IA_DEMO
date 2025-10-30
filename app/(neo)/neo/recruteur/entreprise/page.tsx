"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InteractiveBlock, { ConversationContext } from "@/components/ui/InteractiveBlock";
import { getConversationContext } from "@/app/lib/services/conversationContextService";
import type { ChatMessage } from "@/app/(neo)/neo/hooks/useNeoAvatar";

export default function EntreprisePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversationId");

  // ============================================
  // ÉTATS
  // ============================================
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CHARGEMENT DU CONTEXTE DEPUIS LA BDD
  // ============================================
  useEffect(() => {
    async function loadContext() {
      try {
        setLoading(true);
        setError(null);

        // Charger le contexte "entreprise.presentation" depuis la BDD
        const contextData = await getConversationContext("entreprise.presentation");

        if (!contextData) {
          throw new Error("Contexte 'entreprise.presentation' introuvable en BDD");
        }

        setContext(contextData);

        // TODO: Si conversationId existe, charger l'historique depuis conversations.messages
        if (conversationId && conversationId !== "new") {
          // const { data } = await supabase
          //   .from('conversations')
          //   .select('messages')
          //   .eq('id', conversationId)
          //   .single();
          // if (data?.messages) setChatHistory(data.messages);
        }

      } catch (err) {
        console.error("Erreur chargement contexte entreprise:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, [conversationId]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleFinaliser = () => {
    console.log("✅ Entreprise finalisée");
    router.push("/neo/recruteur/entreprises");
  };

  const handleSauvegarder = () => {
    console.log("💾 Entreprise sauvegardée");
    // La sauvegarde est gérée dans InteractiveBlock
  };

  const handleAbandonner = () => {
    console.log("❌ Abandon");
    router.push("/neo/recruteur/entreprises");
  };

  const handleConversationUpdate = (messages: ChatMessage[]) => {
    // Optionnel : faire quelque chose quand les messages changent
    console.log("📝 Conversation mise à jour:", messages.length, "messages");
  };

  // ============================================
  // RENDER
  // ============================================

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-lg text-gray-600">Chargement du contexte...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !context) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-lg font-medium">Erreur</p>
          <p className="text-sm mt-2">{error || "Contexte introuvable"}</p>
          <button
            onClick={() => router.push("/neo/recruteur/entreprises")}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Success
  return (
    <InteractiveBlock
      conversationId={conversationId}
      conversationType="entreprise"
      context={context}
      chatHistory={chatHistory}
      onConversationUpdate={handleConversationUpdate}
      onFinaliser={handleFinaliser}
      onSauvegarder={handleSauvegarder}
      onAbandonner={handleAbandonner}
    />
  );
}

/**
 * @file page.tsx (Poste)
 * @version v0.03
 * @date 30 octobre 2025
 * @description Page de création/édition de poste avec avatar IA
 * @changelog 
 *   v0.03 - Ajout composant debug KB Pool pour test
 *   v0.02 - Ajout Suspense boundary pour Next.js 15
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InteractiveBlock from '@/components/ui/InteractiveBlock';
import type { ConversationContext } from '@/components/ui/InteractiveBlock';
import KBPoolDebug from "@/components/debug/KBPoolDebug"; // 🧪 v0.03
import type { ChatMessage } from "@/app/(neo)/neo/hooks/useNeoAvatar";
import KBCompilerDebug from "@/components/debug/KBCompilerDebug";

// ============================================
// COMPOSANT INTERNE (avec useSearchParams)
// ============================================
function PosteContent() {
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

        // Charger le contexte "poste.definition" depuis la BDD
        const contextData = await getConversationContext("poste.definition");

        if (!contextData) {
          throw new Error("Contexte 'poste.definition' introuvable en BDD");
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
        console.error("Erreur chargement contexte poste:", err);
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
    console.log("✅ Poste finalisé");
    router.push("/neo/recruteur/postes");
  };

  const handleSauvegarder = () => {
    console.log("💾 Poste sauvegardé");
    // La sauvegarde est gérée dans InteractiveBlock
  };

  const handleAbandonner = () => {
    console.log("❌ Abandon");
    router.push("/neo/recruteur/postes");
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
            onClick={() => router.push("/neo/recruteur/postes")}
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 🧪 v0.03 : Composant de debug temporaire */}
      <KBPoolDebug />
      {/* 🧪 v0.04 : Composant de debug Compilation KB */}
      <KBCompilerDebug />
      {/* Composant principal */}
      <InteractiveBlock
        conversationId={conversationId}
        conversationType="poste"
        context={context}
        chatHistory={chatHistory}
        onConversationUpdate={handleConversationUpdate}
        onFinaliser={handleFinaliser}
        onSauvegarder={handleSauvegarder}
        onAbandonner={handleAbandonner}
      />
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL (avec Suspense)
// ============================================
export default function PostePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <PosteContent />
    </Suspense>
  );
}

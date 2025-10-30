import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function Page() {
  const roles: {
      title: string;
      desc: string;
      color: string;
      image?: string;
      icon?: React.ReactNode;
      href: string;
    }[] = [ 
    {
      title: "Votre entreprise",
      desc: "Présentez ici le contexte de votre société et valorisez son attractivité. L’avatar IA vous guidera pas à pas pour rédiger la description parfaite et booster l’intérêt des candidats.",
      color: "var(--nc-blue)",           // ou "#1D5DFF", etc.
      image: "/cards/votre_entreprise_card.png",
      href: "/neo/recruteur/entreprise/",
    },
    {
      title: "Vos postes à pourvoir",
      desc: "Publiez, décrivez et gérez vos offres d’emploi : profils, critères, compétences attendues, tout est centralisé ici. L’avatar IA vous accompagne à chaque étape pour ne rien oublier.",
      color: "var(--nc-blue)",           // ou "#1D5DFF", etc.
      image: "/cards/votre_poste_card.png",
      href: "/neo/recruteur/poste/",
    },
    {
      title: "Conseils pour recruter",
      desc: "Accédez à des conseils intelligents pour réussir chaque phase du recrutement. L’avatar IA est toujours présent pour vous épauler et vous orienter, même en cas de doute.",
      color: "var(--nc-blue)",           // ou "#1D5DFF", etc.
      image: "/cards/conseils_recruteur_card.png",
      href: "/neo/recruteur/",
    },
  ];

  return (
    <main className="bg-[var(--nc-gray)] min-h-screen py-12 px-4">
      <h1 className="text-4xl font-extrabold text-[var(--nc-blue)] text-center mb-4">
        Espace Entreprises
      </h1>
       {/* Lien Retour centré */}
      <div className="text-center mb-4">
        <Link 
          href="/neo/" 
          className="text-[var(--nc-blue)] hover:text-[var(--nc-blue)] transition-colors duration-200 text-lg font-medium"
        >
          ← Retour
        </Link>
      </div>
      <p className="text-lg text-gray-700 mb-10 text-center">
        Gérez l'attractivité de votre entreprise et définissez vos besoins avec l'aide de l'IA.
      </p>
      <div className="flex flex-wrap gap-8 justify-center">
        {roles.map((r) =>
          <Link
            href={r.href}
            key={r.title}
            className="no-underline"
          >
            <Card
              image={r.image}
              color={r.color}
              className="relative overflow-hidden w-80 p-0 cursor-pointer hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200"
            >
              {/* Barre colorée en haut */}
              <div
                className={`${r.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200`}
                style={{ marginTop: "-2px" }}
              />
              {/* Si pas d'image, afficher l'icône dans une bulle grise */}
              {!r.image && r.icon &&
                <div className="mb-5 flex justify-center">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center bg-[var(--nc-gray)] rounded-full shadow-sm">
                    {r.icon}
                  </div>
                </div>
              }
              <CardHeader>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{r.title}</h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{r.desc}</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </main>
  );
}/**
 * @file page.tsx (Poste)
 * @version v0.02
 * @date 30 octobre 2025
 * @description Page de création/édition de poste avec avatar IA
 * @changelog v0.02 - Ajout Suspense boundary pour Next.js 15
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InteractiveBlock, { ConversationContext } from "@/components/ui/InteractiveBlock";
import { getConversationContext } from "@/app/lib/services/conversationContextService";
import type { ChatMessage } from "@/app/(neo)/neo/hooks/useNeoAvatar";

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

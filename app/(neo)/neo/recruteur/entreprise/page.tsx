"use client";

import React, { useState, useEffect } from "react";
import ConversationList from "@/components/ui/ConversationList";
import ArchivesBadgeCarousel from "@/components/ui/ArchivesBadgeCarousel";
import InteractiveBlock from "@/components/ui/InteractiveBlock";
import InteractiveChatBlock from "@/components/ui/InteractiveChatBlock";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { supabase } from "@/app/lib/supabaseClient";
import { DEFAULT_USER_ID } from "@/app/lib/constants";

export default function RecruteurEntreprise() {
  const [modeChoisi, setModeChoisi] = useState<"vocal" | "ecrit" | null>(null);
  // "new" = création, string = archive supabase, null = aucune sélection
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>("");

  // Chargement des archives pour badges
  const [archives, setArchives] = useState<any[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(true);

  // Nouveaux états pour l’historique chargé
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);

  useEffect(() => {
    setLoadingArchives(true);
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, title, type, updated_at")
        .eq("user_id", DEFAULT_USER_ID)
        .eq("type", "entreprise")
        .order("updated_at", { ascending: false });
      setArchives(data ?? []);
      setLoadingArchives(false);
    })();
  }, []);

  // Handler pour archive modifié en async
  const handleSelectConversation = async (id: string) => {
    setSelectedConversationId(id);
    setLoadingChatHistory(true);

    const { data, error } = await supabase
      .from("conversations")
      .select("messages")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erreur chargement discussion :", error);
      setChatHistory([]);
    } else {
      setChatHistory(data?.messages ?? []);
    }

    setLoadingChatHistory(false);
  };

  // Modes disponibles
  const modes: {
    key: "vocal" | "ecrit";
    title: string;
    desc: string;
    color: string;
    image?: string;
    icon?: React.ReactNode;
  }[] = [
    {
      key: "vocal",
      title: "Nouvelle conversation en mode vocal",
      desc: "Exprimez-vous à voix haute avec un micro. L'IA anime un avatar interactif.",
      color: "var(--nc-blue)",
      image: "/cards/mode_avatar_card.png",
    },
    {
      key: "ecrit",
      title: "Nouvelle conversation en mode texte",
      desc: "Dialoguez par texte sans prise de parole. L'IA vous répond par écrit dans le fil de discussion.",
      color: "var(--nc-blue)",
      image: "/cards/mode_chat_card.png",
    },
  ];

  // ------ ÉTAT 1 : Choix / badges / création ------
  if (!selectedConversationId) {
    if (!modeChoisi) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-4">
          <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-2 text-center">
            Poursuivre ou créer une nouvelle discussion assistée par l'IA
          </h1>
          <div className="text-center mb-2">
            <Link
              href="/neo/"
              className="text-[var(--nc-blue)] hover:text-[var(--nc-blue)] hover:underline transition-all duration-200 text-lg font-medium"
            >
              ← Retour
            </Link>
          </div>

          {/* Zone toujours présente pour éviter les décalages */}
          <div style={{ minHeight: 56, width: "100%" }} className="flex flex-col items-center justify-center mb-2">
            {loadingArchives ? (
              <span className="animate-spin text-2xl text-gray-400">⏳</span>
            ) : archives.length > 0 ? (
              <>
                <p className="text-lg text-gray-700 mb-4 text-center max-w-2xl">
                  Des conversations sont archivées, cliquez sur celle que vous souhaitez reprendre.
                </p>
                <ArchivesBadgeCarousel
                  archives={archives}
                  onSelect={handleSelectConversation}
                />
              </>
            ) : null}
          </div>

          <p className="text-lg text-gray-700 mb-4 text-center max-w-2xl">
            Poursuivre ou créer une nouvelle discussion assistée par l'IA
          </p>
          <div className="flex gap-8 flex-wrap justify-center">
            {modes.map((m) => (
              <div
                key={m.key}
                onClick={() => {
                  setModeChoisi(m.key);
                  setSelectedConversationId("new"); // nouvelle conversation
                }}
                className="cursor-pointer"
              >
                <Card
                  image={m.image}
                  color={m.color}
                  className="hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200"
                >
                  {!m.image && m.icon && (
                    <div className="mb-5 flex justify-center">
                      <div className="mx-auto w-20 h-20 flex items-center justify-center bg-[var(--nc-gray)] rounded-full shadow-sm">
                        {m.icon}
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <h3 className="text-xl font-bold text-gray-900">{m.title}</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{m.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Cas rare : mode choisi, pas encore d'ID (ex: après reset)
      return null;
    }
  }

  // ------ ÉTAT 2 : Nouvelle conversation ------
  if (selectedConversationId === "new") {
    if (modeChoisi === "ecrit") {
      return (
        <InteractiveChatBlock
          conversationId={selectedConversationId}
          title="Nouvelle présentation - Mode écrit"
          subtitle="Commencez à discuter avec l'IA."
          discussion={[]}
          etatDiscussion="init"
          setEtatDiscussion={() => {}}
          setDiscussion={() => {}}
          onSendMessage={() => {}}
          onAbandonner={() => {}}
          onConfirmerAbandon={() => {}}
          showConfirmation={false}
          onFinaliser={() => {}}
          onSauvegarder={() => {}}
          showSavedMessage={false}
        />
      );
    }
    return (
      <InteractiveBlock
        conversationId={selectedConversationId}
        title="Nouvelle présentation - Mode vocal"
        subtitle="L'IA vous assiste vocalement avec un avatar interactif."
        avatarPreviewImage="/avatars/anastasia_16_9_preview.webp"
        knowledgeId="19df36d7a9354a1aa664c34686256df1"
        avatarName="Anastasia_Chair_Sitting_public"
        voiceRate={1.2}
        onFinaliser={() => {}}
        onSauvegarder={() => {}}
        onAbandonner={() => {}}
      />
    );
  }

  // ------ ÉTAT 3 : Archive sélectionnée ------
  if (selectedConversationId && selectedConversationId !== "new") {
    if (modeChoisi === "ecrit") {
      return (
        <InteractiveChatBlock
          conversationId={selectedConversationId}
          title="Présenter votre entreprise - Mode écrit"
          subtitle="Discutez avec l'IA via un chat textuel."
          discussion={chatHistory}  // passe l'historique chargé ici
          loading={loadingChatHistory} // <-- passe le booléen loading
          etatDiscussion="init"
          setEtatDiscussion={() => {}}
          setDiscussion={setChatHistory}  // pour modification
          onSendMessage={() => {}}
          onAbandonner={() => {}}
          onConfirmerAbandon={() => {}}
          showConfirmation={false}
          onFinaliser={() => {}}
          onSauvegarder={() => {}}
          showSavedMessage={false}
        />
      );
    }
    // Mode vocal archive
    return (
      <InteractiveBlock
        conversationId={selectedConversationId}
        title="Présenter votre entreprise - Mode vocal"
        subtitle="L'IA vous assiste vocalement avec un avatar interactif."
        avatarPreviewImage="/avatars/anastasia_16_9_preview.webp"
        knowledgeId="19df36d7a9354a1aa664c34686256df1"
        avatarName="Anastasia_Chair_Sitting_public"
        voiceRate={1.2}
        onFinaliser={() => {}}
        onSauvegarder={() => {}}
        onAbandonner={() => {}}
      />
    );
  }

  // Sécurité : fallback 
  return null;
}

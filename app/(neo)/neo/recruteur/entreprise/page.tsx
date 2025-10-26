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
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Chargement des archives pour badges
  const [archives, setArchives] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, title, type, updated_at")
        .eq("user_id", DEFAULT_USER_ID)
        .eq("type", "entreprise")
        .order("updated_at", { ascending: false });
      setArchives(data ?? []);
    })();
  }, []);

  // Gestion du choix de conversation
  const handleSelectConversation = (id: string) => setSelectedConversationId(id);

  // Typage strict des modes pour éviter erreur TS
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
      title: "Nouvelle convresation en mode vocal",
      desc: "Exprimez-vous à voix haute avec un micro, dans un espace calme. L'IA anime un avatar interactif.",
      color: "var(--nc-blue)",
      image: "/cards/mode_avatar_card.png",
    },
    {
      key: "ecrit",
      title: "Nouvelle convresation en mode texte",
      desc: "Dialoguez par texte sans prise de parole. L'IA vous répond par écrit dans le fil de discussion.",
      color: "var(--nc-blue)",
      image: "/cards/mode_chat_card.png",
    },
  ];

  if (!selectedConversationId) {
    if (!modeChoisi) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-4">
          <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-2 text-center">
            Poursuivre ou créer une nouvelle discussion assistée par l'IA
          </h1>

          {/* Lien retour */}
          <div className="text-center mb-2">
            <Link
              href="/neo/"
              className="text-[var(--nc-blue)] hover:text-[var(--nc-blue)] hover:underline transition-all duration-200 text-lg font-medium"
            >
              ← Retour
            </Link>
          </div>

          {/* Affichage du carrousel de badges si archives */}
          {archives.length > 0 && (
            <>
              <p className="text-lg text-gray-700 mb-4 text-center max-w-2xl>
                Des conversations sont archivées, cliquez sur celle que vous souhaitez reprendre.
              </p>
              <ArchivesBadgeCarousel
                archives={archives}
                onSelect={handleSelectConversation}
              />
            </>
          )}

          <p className="text-lg text-gray-700 mb-4 text-center max-w-2xl">
            Poursuivre ou créer une nouvelle discussion assistée par l'IA
          </p>

          <div className="flex gap-8 flex-wrap justify-center">
            {modes.map((m) => (
              <div
                key={m.key}
                onClick={() => setModeChoisi(m.key)}
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
      // Mode choisi mais pas de conversation sélectionnée, on affiche la liste seulement
      return (
        <div className="mt-10 w-full max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Mes présentations archivées</h2>
          <ConversationList
            userId={DEFAULT_USER_ID}
            filterType="presentation"
            onSelect={handleSelectConversation}
          />
        </div>
      );
    }
  }

  // Si conversation sélectionnée, affichage du chat selon mode
  if (modeChoisi === "ecrit") {
    return (
      <InteractiveChatBlock
        conversationId={selectedConversationId ?? undefined}
        title="Présenter votre entreprise - Mode écrit"
        subtitle="Discutez avec l'IA via un chat textuel."
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

  // Sinon fallback vers mode vocal
  return (
    <InteractiveBlock
      conversationId={selectedConversationId ?? undefined}
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

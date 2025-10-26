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

  // Nouveau : archives chargées de Supabase, pour les badges
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

  const handleSelectConversation = (id: string) => setSelectedConversationId(id);

  // ... tes handlers et états pour la discussion ci-dessous ...

  if (!selectedConversationId) {
    if (!modeChoisi) {
      const modes = [
        {
          key: "vocal",
          title: "Mode vocal avec Avatar IA",
          desc:
            "Exprimez-vous à voix haute avec un micro, dans un espace calme. L'IA anime un avatar interactif pour échanger en temps réel.",
          color: "var(--nc-blue)",
          image: "/cards/mode_avatar_card.png",
        },
        {
          key: "ecrit",
          title: "Mode écrit conversationnel",
          desc:
            "Dialoguez par texte sans prise de parole. L'IA vous répond par écrit et le fil de discussion reste disponible à tout moment.",
          color: "var(--nc-blue)",
          image: "/cards/mode_chat_card.png",
        },
      ];

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
          <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4 text-center">
            Choisissez votre mode de travail avec l'IA
          </h1>
          {/* Lien Retour */}
          <div className="text-center mb-4">
            <Link
              href="/neo/"
              className="text-[var(--nc-blue)] hover:text-[var(--nc-blue)] hover:underline transition-all duration-200 text-lg font-medium"
            >
              ← Retour
            </Link>
          </div>
          {/* Archives carousel */}
          {archives.length > 0 && (
            <>
              <p className="text-center mb-4">
                Des conversations sont archivées, cliquez sur celle que vous souhaitez reprendre.
              </p>
              <ArchivesBadgeCarousel
                archives={archives}
                onSelect={handleSelectConversation}
              />
            </>
          )}
          <p className="text-lg text-gray-700 mb-10 text-center max-w-2xl">
            Quelle est la méthode la plus adaptée à votre environnement et à vos outils ?
          </p>
          <div className="flex gap-8 flex-wrap justify-center">
            {modes.map((m) => (
              <div key={m.key} onClick={() => setModeChoisi(m.key)} className="cursor-pointer">
                <Card
                  image={m.image}
                  color={m.color}
                  className="hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200"
                >
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
    }
    // ... conserve la logique "mode choisi mais pas de conversation sélectionnée"
    return (
      <div className="mt-10 w-full max-w-xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">Mes présentations archivées</h2>
        <ArchivesBadgeCarousel archives={archives} onSelect={handleSelectConversation} />
      </div>
    );
  }

  // ... conserve tout le reste pour modes écrit/vocal
  // ...
}

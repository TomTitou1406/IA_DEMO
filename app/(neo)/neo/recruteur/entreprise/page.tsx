"use client";

import React, { useState } from "react";
import ConversationList from "@/components/ui/ConversationList";
import InteractiveBlock from "@/components/ui/InteractiveBlock";
import InteractiveChatBlock from "@/components/ui/InteractiveChatBlock";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { DEFAULT_USER_ID } from "@/app/lib/constants";

export default function RecruteurEntreprise() {
  const [modeChoisi, setModeChoisi] = useState<"vocal" | "ecrit" | null>(null);

  // Nouvelle gestion sélection conversation à reprendre
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Handlers pour mode vocal (InteractiveBlock)
  const handleFinaliser = () => {
    console.log("✅ Discussion finalisée");
  };

  const handleSauvegarder = () => {
    console.log("💾 Discussion sauvegardée");
  };

  const handleAbandonner = () => {
    console.log("❌ Discussion abandonnée");
    window.history.back();
  };

  // Handlers pour mode écrit (InteractiveChatBlock)
  const [discussionChat, setDiscussionChat] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [etatDiscussionChat, setEtatDiscussionChat] = useState<
    "init" | "active" | "pause" | "stopped" | "finalized"
  >("init");
  const [showConfirmationChat, setShowConfirmationChat] = useState(false);
  const [showSavedMessageChat, setShowSavedMessageChat] = useState(false);

  const handleSendMessage = (msg: string) => {
    setDiscussionChat((d) => [
      ...d,
      { role: "user", content: msg },
      { role: "assistant", content: `Réponse IA à "${msg}"` },
    ]);
  };

  const onAbandonnerChat = () => setShowConfirmationChat(true);

  const onConfirmerAbandonChat = (confirmer: boolean) => {
    setShowConfirmationChat(false);
    if (confirmer) window.history.back();
  };

  const onFinaliserChat = () => {
    if (etatDiscussionChat === "stopped") {
      setDiscussionChat((prev) => [
        ...prev,
        { role: "assistant", content: "Présentation finalisée." },
      ]);
      setEtatDiscussionChat("finalized");
    }
  };

  const onSauvegarderChat = () => {
    setShowSavedMessageChat(true);
    setTimeout(() => {
      setShowSavedMessageChat(false);
      window.history.back();
    }, 3000);
  };

  // Fonction callback pour sélection conversation dans la liste
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  // --------------------------------------------------------------
  // RENDU : afficher la liste des conversations à reprendre si pas de conversation sélectionnée
  // --------------------------------------------------------------
  if (!selectedConversationId) {
    if (!modeChoisi) {
      // Choix mode (vocal ou écrit)
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
          title: "Mode vocal avec Avatar IA",
          desc: "Exprimez-vous à voix haute avec un micro, dans un espace calme. L'IA anime un avatar interactif pour échanger en temps réel.",
          color: "var(--nc-blue)",
          image: "/cards/mode_avatar_card.png",
        },
        {
          key: "ecrit",
          title: "Mode écrit conversationnel",
          desc: "Dialoguez par texte sans prise de parole. L'IA vous répond par écrit et le fil de discussion reste disponible à tout moment.",
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
          <p className="text-lg text-gray-700 mb-10 text-center max-w-2xl">
            Quelle est la méthode la plus adaptée à votre environnement et à vos
            outils ?
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
          {/* Ajout de la liste après choix du mode */}
          <div className="mt-10 w-full max-w-xl">
            <h2 className="text-lg font-semibold mb-4">Mes présentations archivées</h2>
            <ConversationList
              userId={DEFAULT_USER_ID}
              filterType="entreprise"
              onSelect={handleSelectConversation}
            />
          </div>
        </div>
      );
    } else {
      // Si mode choisi mais pas de conversation sélectionnée, on affiche la liste seulement
      return (
        <div className="mt-10 w-full max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Mes présentations archivées</h2>
          <ConversationList
            userId={DEFAULT_USER_ID}
            filterType="entreprise"
            onSelect={handleSelectConversation}
          />
        </div>
      );
    }
  }

  // --------------------------------------------------------------
  // RENDU : conversation sélectionnée, on affiche le chat (mode écrit ici)
  // (à adapter si besoin pour mode vocal)
  // --------------------------------------------------------------
  if (modeChoisi === "ecrit") {
    return (
      <InteractiveChatBlock
        conversationId={selectedConversationId ?? undefined}
        title="Présenter votre entreprise - Mode écrit"
        subtitle="Discutez avec l'IA via un chat textuel."
        discussion={discussionChat}
        etatDiscussion={etatDiscussionChat}
        setEtatDiscussion={setEtatDiscussionChat}
        setDiscussion={setDiscussionChat}
        onSendMessage={handleSendMessage}
        onAbandonner={onAbandonnerChat}
        onConfirmerAbandon={onConfirmerAbandonChat}
        showConfirmation={showConfirmationChat}
        onFinaliser={onFinaliserChat}
        onSauvegarder={onSauvegarderChat}
        showSavedMessage={showSavedMessageChat}
      />
    );
  }

  // Adaptation pour mode vocal si besoin (idem précédemment) ou fallback simple
  return (
    <InteractiveBlock
      conversationId={selectedConversationId ?? undefined}
      title="Présenter votre entreprise - Mode vocal"
      subtitle="L'IA vous assiste vocalement avec un avatar interactif."
      avatarPreviewImage="/avatars/anastasia_16_9_preview.webp"
      knowledgeId="19df36d7a9354a1aa664c34686256df1"
      avatarName="Anastasia_Chair_Sitting_public"
      voiceRate={1.2}
      onFinaliser={handleFinaliser}
      onSauvegarder={handleSauvegarder}
      onAbandonner={handleAbandonner}
    />
  );
}

"use client";

import React, { useState } from "react";
import InteractiveBlock from "@/components/ui/InteractiveBlock";
import InteractiveChatBlock from "@/components/ui/InteractiveChatBlock";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function RecruteurEntreprise() {
  const [modeChoisi, setModeChoisi] = useState<"vocal" | "ecrit" | null>(null);

  // États et callbacks partagés pour mode vocal
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [etatDiscussion, setEtatDiscussion] = useState<
    "init" | "active" | "pause" | "stopped" | "finalized"
  >("init");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const onAbandonner = () => setShowConfirmation(true);
  const onConfirmerAbandon = (confirmer: boolean) => {
    setShowConfirmation(false);
    if (confirmer) window.history.back();
  };
  const onFinaliser = () => {
    if (etatDiscussion === "stopped") {
      setDiscussion(prev => [...prev, "Présentation finalisée."]);
      setEtatDiscussion("finalized");
    }
  };
  const onSauvegarder = () => {
    setShowSavedMessage(true);
    setTimeout(() => {
      setShowSavedMessage(false);
      window.history.back();
    }, 3000);
  };

  // Pour mode chat écrit (NOUVEAU FORMAT)
  const [discussionChat, setDiscussionChat] = useState<{role:"user"|"assistant",content:string}[]>([]);
  
  const handleSendMessage = (msg: string) => {
    setDiscussionChat(d => [
      ...d,
      {role: "user", content: msg},
      {role: "assistant", content: `Réponse IA à "${msg}"`}
    ]);
  };

  if (!modeChoisi) {
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
        title: "Mode vocal avec avatar on",
        desc: "Exprimez-vous à voix haute avec un micro, dans un espace calme. L'IA anime un avatar interactif pour échanger en temps réel.",
        color: "var(--nc-blue)",
        image: "/cards/mode_avatar_card.png", 
      },
      {
        key: "ecrit",
        title: "Mode écrit conversationnel",
        desc: "Dialoguez par texte sans prise de parole. L'IA vous répond par écrit et le fil de discussion reste disponible à tout moment.",
        color: "var(--nc-cyan)",
        image: "/cards/mode_chat_card.png", 
      },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
        <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4 text-center">
          Choisissez votre mode de travail avec l'IA
        </h1>
        {/* Lien Retour centré */}
        <div className="text-center mb-4">
          <Link 
            href="/neo/" 
            className="text-[var(--nc-blue)] hover:text-[var(--nc-blue)] hover:underline transition-all duration-200 text-lg font-medium"
          >
            ← Retour
          </Link>
        </div>
        <p className="text-lg text-gray-700 mb-10 text-center max-w-2xl">
          Quelle est la méthode la plus adaptée à votre environnement et à vos outils ?
        </p>
        <div className="flex gap-8 flex-wrap justify-center">
          {modes.map(m => (
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
                {/* Si pas d'image, afficher l'icône */}
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
  }

  return modeChoisi === "vocal" ? (
    <InteractiveBlock
      title="Présenter votre entreprise - Mode vocal"
      subtitle="L'IA vous assiste vocalement avec un avatar interactif."
      avatar={
        <div className="mx-auto w-full max-w-xl aspect-video rounded-md bg-gray-200 overflow-hidden mb-1">
          <img
            src="/avatars/avatar_interactif_entreprise_16_9.png"
            alt="Avatar interactif simulation"
            className="object-cover w-full h-full"
            loading="lazy"
          />
        </div>
      }
      discussion={discussion}
      etatDiscussion={etatDiscussion}
      setEtatDiscussion={setEtatDiscussion}
      setDiscussion={setDiscussion}
      onAbandonner={onAbandonner}
      onConfirmerAbandon={onConfirmerAbandon}
      showConfirmation={showConfirmation}
      onFinaliser={onFinaliser}
      onSauvegarder={onSauvegarder}
      showSavedMessage={showSavedMessage}
    />
  ) : (
    <InteractiveChatBlock
      title="Présenter votre entreprise - Mode écrit"
      subtitle="Discutez avec l'IA via un chat textuel."
      discussion={discussionChat}
      etatDiscussion={etatDiscussion}
      setEtatDiscussion={setEtatDiscussion}
      setDiscussion={setDiscussionChat}
      onSendMessage={handleSendMessage}
      onAbandonner={onAbandonner}
      onConfirmerAbandon={onConfirmerAbandon}
      showConfirmation={showConfirmation}
      onFinaliser={onFinaliser}
      onSauvegarder={onSauvegarder}
      showSavedMessage={showSavedMessage}
    />
  );
}

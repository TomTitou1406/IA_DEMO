"use client";

import React, { useState } from "react";
import InteractiveBlock from "@/components/ui/InteractiveBlock";
import InteractiveChatBlock from "@/components/ui/InteractiveChatBlock"; // à créer comme vu précédemment
import { Card } from "@/components/ui/Card";

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

  // Pour mode chat écrit : gardons un fil distinct pour test
  const [discussionChat, setDiscussionChat] = useState<string[]>([]);

  const handleSendMessage = (msg: string) => {
    setDiscussionChat(d => [...d, `Vous : ${msg}`, `IA : réponse générée pour "${msg}"`]);
  };

  if (!modeChoisi) {
    return (
      <section className="max-w-4xl mx-auto p-4 grid grid-cols-2 gap-6">
        <Card className="cursor-pointer p-6" onClick={() => setModeChoisi("vocal")}>
          <h3 className="text-xl font-bold mb-2">Mode vocal avec avatar</h3>
          <p>Vous êtes dans un espace calme, un micro est disponible pour dialoguer à voix haute.</p>
          <div className="mt-4 text-center">
            <img src="/icons/microphone.svg" alt="Micro" className="mx-auto h-12" />
          </div>
        </Card>

        <Card className="cursor-pointer p-6" onClick={() => setModeChoisi("ecrit")}>
          <h3 className="text-xl font-bold mb-2">Mode écrit conversationnel</h3>
          <p>Aucun échange vocal, discutez via textes et réponses écrites.</p>
          <div className="mt-4 text-center">
            <img src="/icons/chat.svg" alt="Chat" className="mx-auto h-12" />
          </div>
        </Card>
      </section>
    );
  }

  return modeChoisi === "vocal" ? (
    <InteractiveBlock
      title="Présenter votre entreprise - Mode vocal"
      subtitle="L’ IA vous assiste vocale avec un avatar interactif."
      avatar={
        <div className="mx-auto w-full max-w-xl aspect-video rounded-md bg-gray-200 overflow-hidden mb-1">
          <img
            src="/avatar_interactif_entreprise_16_9.png"
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
      onSendMessage={handleSendMessage}
    />
  );
}

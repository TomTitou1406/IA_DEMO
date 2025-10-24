"use client";

import React, { useState } from "react";
import InteractiveBlock from "@/components/ui/InteractiveBlock";

export default function RecruteurEntreprise() {
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

  return (
    <InteractiveBlock
      title="Présenter votre entreprise"
      subtitle="L’ IA vous assiste pour présenter votre entreprise afin d'attirer les talents."
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
  );
}

"use client";

import React, { useState } from "react";
import InteractiveBlock from "@/components/ui/InteractiveBlock";
import InteractiveChatBlock from "@/components/ui/InteractiveChatBlock";

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
    const modes = [
      {
        key: "vocal",
        title: "Mode vocal avec avatar",
        desc: "Exprimez-vous à voix haute avec un micro, dans un espace calme. L’IA anime un avatar interactif pour échanger en temps réel.",
        color: "bg-[var(--nc-blue)]",
        icon: (
          <span className="text-5xl" role="img" aria-label="Microphone">
            🎤
          </span>
        ),
      },
      {
        key: "ecrit",
        title: "Mode écrit conversationnel",
        desc: "Dialoguez par texte sans prise de parole. L’IA vous répond par écrit et le fil de discussion reste disponible à tout moment.",
        color: "bg-[var(--nc-cyan)]",
        icon: (
          <span className="text-5xl" role="img" aria-label="Bulle de chat">
            💬
          </span>
        ),
      },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
        <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4 text-center">
          Choisissez votre mode de présentation
        </h1>
        <p className="text-lg text-gray-700 mb-10 text-center max-w-2xl">
          Sélectionnez la méthode la plus adaptée à votre environnement et vos outils. <br />
          Vous pourrez ensuite dialoguer avec l’IA soit à l’oral avec un avatar animé, soit par écrit.
        </p>
        <div className="flex gap-8 flex-wrap justify-center">
          {modes.map(m => (
            <div
              key={m.key}
              className="relative overflow-hidden bg-[var(--nc-white)] rounded-xl border border-[var(--nc-gray)] shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 w-80 p-8 pt-12 flex flex-col items-center text-center cursor-pointer group"
              style={{ willChange: "transform, box-shadow" }}
              onClick={() => setModeChoisi(m.key as "vocal" | "ecrit")}
              tabIndex={0}
              role="button"
            >
              <div className={`${m.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200`} style={{ marginTop: "-2px" }} />
              <div className="mb-5">
                <div className="mx-auto w-24 h-24 flex items-center justify-center bg-[var(--nc-gray)] rounded-full shadow-sm">
                  {m.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{m.title}</h3>
              <p className="text-gray-700">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return modeChoisi === "vocal" ? (
    <InteractiveBlock
      title="Présenter votre entreprise - Mode vocal"
      subtitle="L’IA vous assiste vocalement avec un avatar interactif."
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

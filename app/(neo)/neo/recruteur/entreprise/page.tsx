"use client";

import React, { useState } from "react";

export default function RecruteurEntreprise() {
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);

  const demarrerDiscussion = () => {
    setDiscussion(["Discussion démarrée... L’avatar IA vous écoute."]);
    setIsActive(true);
  };

  const finaliserPresentation = () => {
    if (isActive) {
      setDiscussion((prev) => [
        ...prev,
        "Synthèse créée par l’IA. Présentation finalisée.",
      ]);
      setIsActive(false);
    }
  };

  const abandonnerDiscussion = () => {
    setIsActive(false);
  };

  return (
    <section className="w-full max-w-3xl mx-auto p-2 flex flex-col gap-2 text-gray-800">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mb-1 mt-2">
        Présenter votre entreprise
      </h1>
      <p className="text-base text-gray-700 text-center mb-1 mt-0">
        Présentez votre entreprise afin d'attirer les talents – L’IA vous assiste dans cette tâche.
      </p>

      <div className="w-full aspect-[16/6] rounded-md bg-gray-200 overflow-hidden mx-auto mb-1">
        <img
          src="/avatar-placeholder-16x9.png"
          alt="Avatar interactif simulation"
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>

      <div className="flex justify-center gap-2 my-1">
        <button
          onClick={demarrerDiscussion}
          disabled={isActive}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-400"
        >
          Démarrer la discussion
        </button>
        <button
          onClick={finaliserPresentation}
          disabled={!isActive}
          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-400"
        >
          Finaliser la présentation
        </button>
        <button
          onClick={abandonnerDiscussion}
          disabled={!isActive}
          className="bg-red-600 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-400"
        >
          Abandonner la discussion
        </button>
      </div>

      <div className="h-40 overflow-y-scroll border rounded p-3 bg-white shadow-inner scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        {discussion.length === 0 ? (
          <p className="text-gray-500 italic text-center">
            Le fil de discussion apparaîtra ici.
          </p>
        ) : (
          discussion.map((msg, idx) => (
            <p key={idx} className="mb-1">
              {msg}
            </p>
          ))
        )}
      </div>
    </section>
  );
}

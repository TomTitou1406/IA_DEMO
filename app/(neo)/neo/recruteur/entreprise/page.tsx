"use client";

import React, { useState } from "react";

export default function RecruteurEntreprise() {
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);

  const demarrerDiscussion = () => {
    setDiscussion(["[translate:Discussion démarrée]... L’avatar IA vous écoute."]);
    setIsActive(true);
  };

  const finaliserPresentation = () => {
    if (isActive) {
      // Simulation synthèse IA
      setDiscussion((prev) => [
        ...prev,
        "[translate:Synthèse créée par l’IA. Présentation finalisée.]",
      ]);
      setIsActive(false);
    }
  };

  const abandonnerDiscussion = () => {
    setIsActive(false);
  };

  return (
    <section className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-8 text-gray-800">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4">
        [translate:Présenter votre entreprise]
      </h1>

      <p className="text-lg text-gray-700 mb-10 text-center">
        [translate:Présentez votre entrepirse afin d'attirer les talents - L’IA vous assiste dans cette tâche]
      </p>

      <div className="w-full aspect-video rounded-md bg-gray-200 overflow-hidden">
        <img
          src="/avatar-placeholder-16x9.png"
          alt="[translate:Avatar interactif simulation]"
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={demarrerDiscussion}
          disabled={isActive}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          [translate:Démarrer la discussion]
        </button>
        <button
          onClick={finaliserPresentation}
          disabled={!isActive}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          [translate:Finaliser la présentation]
        </button>
        <button
          onClick={abandonnerDiscussion}
          disabled={!isActive}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          [translate:Abandonner la discussion]
        </button>
      </div>

      <div className="h-60 overflow-y-auto border rounded p-4 bg-white shadow-inner">
        {discussion.length === 0 ? (
          <p className="text-gray-500 italic text-center">
            [translate:Le fil de discussion apparaîtra ici.]
          </p>
        ) : (
          discussion.map((msg, idx) => (
            <p key={idx} className="mb-2">
              {msg}
            </p>
          ))
        )}
      </div>
    </section>
  );
}

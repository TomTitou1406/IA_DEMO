"use client";

import React, { useState } from "react";

export default function RecruteurEntreprise() {
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [wasAbandoned, setWasAbandoned] = useState(false);

  const demarrerDiscussion = () => {
    setDiscussion(["Discussion démarrée... L’avatar IA vous écoute."]);
    setIsActive(true);
    setWasAbandoned(false);
  };

  const finaliserPresentation = () => {
    // Seul cas possible : pas active et déjà en pause
    if (!isActive && wasAbandoned) {
      setDiscussion((prev) => [
        ...prev,
        "Synthèse créée par l’IA. Présentation finalisée.",
      ]);
      setWasAbandoned(false);
    }
  };

  const abandonnerDiscussion = () => {
    if (isActive) {
      setIsActive(false);
      setWasAbandoned(true);
      setDiscussion((prev) => [
        ...prev,
        "La discussion est maintenant en pause.",
      ]);
    }
  };

  const reprendreDiscussion = () => {
    if (!isActive && wasAbandoned) {
      setIsActive(true);
      setWasAbandoned(false);
      setDiscussion((prev) => [
        ...prev,
        "Discussion reprise… L’avatar IA continue l’accompagnement.",
      ]);
    }
  };

  // Le bouton "Finaliser" ne s'active que discussion inactive mais mise en pause
  const canFinalize = !isActive && wasAbandoned;

  return (
    <section className="w-full max-w-3xl mx-auto p-2 flex flex-col gap-2 text-gray-800 mt-0">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mb-1 mt-2">
        Présenter votre entreprise
      </h1>
      <p className="text-base text-gray-700 text-center mb-1 mt-0">
        L’avatar IA vous assiste pour présentez votre entreprise afin d'attirer les talents.
      </p>

      {/* Avatar centré et grandi */}
      <div className="mx-auto w-full max-w-xl aspect-video rounded-md bg-gray-200 overflow-hidden mb-1">
        <img
          src="/avatar-placeholder-16x9.png"
          alt="Avatar interactif simulation"
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>

      {/* Boutons d’action */}
      <div className="flex justify-center gap-2 my-1 flex-wrap">
        <button
          onClick={demarrerDiscussion}
          disabled={isActive}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-400"
        >
          Discuter
        </button>
        <button
          onClick={abandonnerDiscussion}
          disabled={!isActive}
          className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-400"
        >
          Faire pause
        </button>
        <button
          onClick={reprendreDiscussion}
          disabled={isActive || !wasAbandoned}
          className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-400"
        >
          Reprendre
        </button>
        <button
          disabled // Toujours grisé et inactif
          className="bg-cyan-700 text-white px-3 py-1.5 rounded text-sm opacity-50 cursor-not-allowed"
        >
          Ajouter PDF
        </button>
        <button
          onClick={finaliserPresentation}
          disabled={!canFinalize}
          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-400"
        >
          Finaliser
        </button>
      </div>

      {/* Fil de discussion */}
      <div className="h-72 overflow-y-scroll border rounded p-3 bg-white shadow-inner scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
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

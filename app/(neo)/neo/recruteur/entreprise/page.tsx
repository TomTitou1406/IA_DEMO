"use client";

import React, { useState } from "react";

export default function RecruteurEntreprise() {
  const [discussion, setDiscussion] = useState<string[]>([]);
  const [etatDiscussion, setEtatDiscussion] = useState<
    "init" | "active" | "pause" | "stopped" | "finalized"
  >("init");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  // Actions

  const demarrerDiscussion = () => {
    setDiscussion(["Discussion démarrée... L’avatar IA vous écoute."]);
    setEtatDiscussion("active");
  };

  const fairePause = () => {
    if (etatDiscussion === "active") {
      setDiscussion((prev) => [...prev, "Discussion en pause."]);
      setEtatDiscussion("pause");
    }
  };

  const reprendreDiscussion = () => {
    if (etatDiscussion === "pause") {
      setDiscussion((prev) => [...prev, "Discussion reprise."]);
      setEtatDiscussion("active");
    }
  };

  const stopperDiscussion = () => {
    if (etatDiscussion === "pause") {
      setDiscussion((prev) => [...prev, "Discussion arrêtée."]);
      setEtatDiscussion("stopped");
    }
  };

  const abandonner = () => {
    setShowConfirmation(true);
  };

  const confirmerAbandon = (confirmer: boolean) => {
    setShowConfirmation(false);
    if (confirmer) {
      window.history.back();
    }
  };

  const finaliserPresentation = () => {
    if (etatDiscussion === "stopped") {
      setDiscussion((prev) => [...prev, "Présentation finalisée."]);
      setEtatDiscussion("finalized");
    }
  };

  const sauvegarder = () => {
    setShowSavedMessage(true);
    setTimeout(() => {
      setShowSavedMessage(false);
      window.history.back();
    }, 3000);
  };

  const canFinalize = etatDiscussion === "stopped";

  return (
    <section className="w-full max-w-3xl mx-auto p-2 flex flex-col gap-2 text-gray-800 mt-0">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mb-1 mt-2">
        Présenter votre entreprise
      </h1>
      <p className="text-base text-gray-700 text-center mb-1 mt-0">
        L’avatar IA vous assiste pour présenter votre entreprise afin d'attirer les talents.
      </p>

      <div className="mx-auto w-full max-w-xl aspect-video rounded-md bg-gray-200 overflow-hidden mb-1">
        <img
          src="/avatar-placeholder-16x9.png"
          alt="Avatar interactif simulation"
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 w-full max-w-xl mx-auto mb-2">
        {/* Col 1: Discuter, Faire pause, Reprendre */}
        <div className="flex justify-center items-center">
          {etatDiscussion === "init" && (
            <button
              onClick={demarrerDiscussion}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Discuter
            </button>
          )}
          {etatDiscussion === "active" && (
            <button
              onClick={fairePause}
              className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Faire pause
            </button>
          )}
          {etatDiscussion === "pause" && (
            <button
              onClick={reprendreDiscussion}
              className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm"
            >
              Reprendre
            </button>
          )}
        </div>

        {/* Col 2: Stopper, Abandonner */}
        <div className="flex justify-center items-center">
          {etatDiscussion === "pause" && (
            <button
              onClick={stopperDiscussion}
              className="bg-red-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Stopper
            </button>
          )}
          {etatDiscussion === "stopped" && (
            <button
              onClick={abandonner}
              className="bg-red-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Abandonner
            </button>
          )}
          {etatDiscussion === "finalized" && (
            <button
              onClick={sauvegarder}
              className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Sauvegarder
            </button>
          )}
        </div>

        {/* Col 3: Finaliser */}
        <div className="flex justify-center items-center">
          {etatDiscussion !== "finalized" && etatDiscussion !== "init" && (
            <button
              onClick={finaliserPresentation}
              disabled={!canFinalize}
              className={`px-3 py-1.5 rounded text-sm text-white ${
                canFinalize ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Finaliser
            </button>
          )}
        </div>

        {/* Col 4: Quitter ou Ajouter PDF */}
        <div className="flex justify-center items-center">
          {etatDiscussion === "init" ? (
            <button
              onClick={() => window.history.back()}
              className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap"
            >
              Quitter
            </button>
          ) : etatDiscussion === "stopped" ? (
            <button
              disabled
              className="bg-cyan-700 text-white px-3 py-1.5 rounded text-sm opacity-50 cursor-not-allowed whitespace-nowrap"
              title="Ajout futur de documents"
            >
              Ajouter PDF
            </button>
          ) : null}
        </div>
      </div>

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

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 max-w-sm text-center shadow-lg">
            <p className="mb-4 text-lg font-semibold">
              Vous êtes sur le point d'abandonner cette tâche, confirmez-vous votre souhait (Oui/non) ?
            </p>
            <div className="flex justify-around gap-4">
              <button
                onClick={() => confirmerAbandon(true)}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Oui
              </button>
              <button
                onClick={() => confirmerAbandon(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Non
              </button>
            </div>
          </div>
        </div>
      )}

      {showSavedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-green-600 text-white rounded p-4 px-8 text-lg font-semibold shadow-lg">
            Sauvegarde de votre tâche effectuée
          </div>
        </div>
      )}
    </section>
  );
}

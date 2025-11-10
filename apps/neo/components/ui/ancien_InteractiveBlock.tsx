// components/ui/InteractiveBlock.tsx
import React from "react";

type EtatDiscussion = "init" | "active" | "pause" | "stopped" | "finalized";

type Props = {
  title: string;
  subtitle?: string;
  avatar: React.ReactNode;
  discussion: string[];
  etatDiscussion: EtatDiscussion;
  setEtatDiscussion: React.Dispatch<React.SetStateAction<EtatDiscussion>>;
  setDiscussion: React.Dispatch<React.SetStateAction<string[]>>;
  onAbandonner: () => void;
  onConfirmerAbandon: (confirmer: boolean) => void;
  showConfirmation: boolean;
  onFinaliser: () => void;
  onSauvegarder: () => void;
  showSavedMessage: boolean;
};

export default function InteractiveBlock({
  title,
  subtitle,
  avatar,
  discussion,
  etatDiscussion,
  setEtatDiscussion,
  setDiscussion,
  onAbandonner,
  onConfirmerAbandon,
  showConfirmation,
  onFinaliser,
  onSauvegarder,
  showSavedMessage,
}: Props) {
  // Handlers pour boutons internes
  const demarrerDiscussion = () => {
    setDiscussion(["Discussion démarrée... L’avatar IA vous écoute."]);
    setEtatDiscussion("active");
  };
  const fairePause = () => {
    if (etatDiscussion === "active") {
      setDiscussion(prev => [...prev, "Discussion en pause."]);
      setEtatDiscussion("pause");
    }
  };
  const reprendreDiscussion = () => {
    if (etatDiscussion === "pause") {
      setDiscussion(prev => [...prev, "Discussion reprise."]);
      setEtatDiscussion("active");
    }
  };
  const stopperDiscussion = () => {
    if (etatDiscussion === "pause") {
      setDiscussion(prev => [...prev, "Discussion arrêtée."]);
      setEtatDiscussion("stopped");
    }
  };

  const canFinalize = etatDiscussion === "stopped";

  return (
    <section className="w-full max-w-3xl mx-auto p-2 flex flex-col gap-2 text-gray-800 mt-0">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mb-1 mt-2">{title}</h1>
      {subtitle && <p className="text-base text-gray-700 text-center mb-1 mt-0">{subtitle}</p>}

      {avatar}

      <div className="grid grid-cols-4 gap-2 w-full max-w-xl mx-auto mb-2">
        {/* Colonne 1: Discuter, Faire pause, Reprendre */}
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

        {/* Colonne 2: Stopper / Abandonner */}
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
              onClick={onAbandonner}
              className="bg-red-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Abandonner
            </button>
          )}
        </div>

        {/* Colonne 3: Ajouter PDF (finalized) */}
        <div className="flex justify-center items-center">
          {etatDiscussion === "finalized" && (
            <button
              disabled
              className="bg-cyan-700 text-white px-3 py-1.5 rounded text-sm opacity-50 cursor-not-allowed whitespace-nowrap"
              title="Ajout futur de documents"
            >
              Ajouter PDF
            </button>
          )}
        </div>

        {/* Colonne 4: Quitter / Finaliser / Sauvegarder */}
        <div className="flex justify-center items-center space-x-2">
          {etatDiscussion === "init" && (
            <button
              onClick={() => window.history.back()}
              className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap"
            >
              Quitter
            </button>
          )}
          {etatDiscussion === "stopped" && (
            <button
              onClick={onFinaliser}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Finaliser
            </button>
          )}
          {etatDiscussion === "finalized" && (
            <button
              onClick={onSauvegarder}
              className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Sauvegarder
            </button>
          )}
        </div>
      </div>

      <div className="h-72 overflow-y-scroll border rounded p-3 bg-white shadow-inner scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        {discussion.length === 0 ? (
          <p className="text-gray-500 italic text-center">Le fil de discussion apparaîtra ici.</p>
        ) : (
          discussion.map((msg, idx) => (
            <p key={idx} className="mb-1">{msg}</p>
          ))
        )}
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 max-w-sm text-center shadow-lg">
            <p className="mb-4 text-lg font-semibold">
              Vous êtes sur le point d'abandonner cette tâche, confirmez-vous votre souhait (Oui/Non) ?
            </p>
            <div className="flex justify-around gap-4">
              <button
                onClick={() => onConfirmerAbandon(true)}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Oui
              </button>
              <button
                onClick={() => onConfirmerAbandon(false)}
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

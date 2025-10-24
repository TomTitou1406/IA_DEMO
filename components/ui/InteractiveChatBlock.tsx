// components/ui/InteractiveChatBlock.tsx
import React from "react";

type EtatDiscussion = "init" | "active" | "pause" | "stopped" | "finalized";

type Props = {
  title: string;
  subtitle?: string;
  discussion: { role: "user" | "assistant"; content: string }[];
  etatDiscussion: EtatDiscussion;
  setEtatDiscussion: React.Dispatch<React.SetStateAction<EtatDiscussion>>;
  setDiscussion: React.Dispatch<React.SetStateAction<{ role: "user" | "assistant"; content: string }[]>>;
  onSendMessage: (msg: string) => void;
  onAbandonner: () => void;
  onConfirmerAbandon: (confirmer: boolean) => void;
  showConfirmation: boolean;
  onFinaliser: () => void;
  onSauvegarder: () => void;
  showSavedMessage: boolean;
  inputPlaceholder?: string;
};

export default function InteractiveChatBlock({
  title,
  subtitle,
  discussion,
  etatDiscussion,
  setEtatDiscussion,
  setDiscussion,
  onSendMessage,
  onAbandonner,
  onConfirmerAbandon,
  showConfirmation,
  onFinaliser,
  onSauvegarder,
  showSavedMessage,
  inputPlaceholder = "Tapez votre message...",
}: Props) {
  const [input, setInput] = React.useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
    if (etatDiscussion === "init") {
      setEtatDiscussion("active");
    }
  };

  const canFinalize = etatDiscussion === "stopped";

  return (
    <section className="w-full max-w-3xl mx-auto p-2 flex flex-col gap-2 text-gray-800 mt-0">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mb-1 mt-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-gray-700 text-center mb-1 mt-0">{subtitle}</p>
      )}

      {/* Fil de discussion stylisé */}
      <div className="h-72 overflow-y-scroll border rounded p-3 bg-white shadow-inner mb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 flex flex-col gap-2">
        {discussion.length === 0 ? (
          <p className="text-gray-500 italic text-center">Aucun message encore.</p>
        ) : (
          discussion.map((msg, idx) => (
            <div
              className={`flex flex-col items-${msg.role === "user" ? "end" : "start"} w-full`}
              key={idx}
            >
              <span className={`text-xs mb-1 font-semibold ${msg.role === "user" ? "text-[var(--nc-cyan)]" : "text-[var(--nc-blue)]"}`}>
                {msg.role === "user" ? "Vous" : "Assistant"}
              </span>
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl break-words shadow transition-all
                ${msg.role === "user"
                  ? "bg-[var(--nc-gray)] text-gray-900 rounded-br-none"
                  : "bg-[var(--nc-cyan)] text-gray-900 rounded-bl-none"
                }`}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Zone de saisie */}
      <div>
        <span className="block text-xs mb-1 text-gray-500 ml-1">Votre message</span>
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            placeholder={inputPlaceholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 border rounded px-3 py-2 resize-none"
            disabled={etatDiscussion === "stopped" || etatDiscussion === "finalized"}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || etatDiscussion === "stopped" || etatDiscussion === "finalized"}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            Envoyer
          </button>
        </div>
      </div>

      {/* Boutons d’actions */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-xl mx-auto mt-4">
        <div className="flex justify-center items-center">
          {etatDiscussion === "init" && (
            <button
              onClick={() => window.history.back()}
              className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm whitespace-nowrap"
            >
              Quitter
            </button>
          )}
        </div>
        <div className="flex justify-center items-center space-x-2">
          {etatDiscussion === "active" && (
            <button
              onClick={() => setEtatDiscussion("pause")}
              className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm"
            >
              Faire pause
            </button>
          )}
          {etatDiscussion === "pause" && (
            <>
              <button
                onClick={() => setEtatDiscussion("active")}
                className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm"
              >
                Reprendre
              </button>
              <button
                onClick={() => setEtatDiscussion("stopped")}
                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm"
              >
                Stopper
              </button>
            </>
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
        <div className="flex justify-center items-center space-x-2">
          {etatDiscussion === "stopped" && (
            <button
              onClick={onFinaliser}
              disabled={!canFinalize}
              className={`px-3 py-1.5 rounded text-sm text-white ${
                canFinalize ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"
              }`}
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

      {/* Modale Abandon */}
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

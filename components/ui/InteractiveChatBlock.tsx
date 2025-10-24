import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  discussion: string[];
  onSendMessage: (msg: string) => void;
  inputPlaceholder?: string;
  actions?: React.ReactNode;
};

export default function InteractiveChatBlock({
  title,
  subtitle,
  discussion,
  onSendMessage,
  inputPlaceholder = "Écrivez ici...",
  actions,
}: Props) {
  const [input, setInput] = React.useState("");

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <section className="w-full max-w-3xl mx-auto p-2 flex flex-col gap-2 text-gray-800 mt-0">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mb-1 mt-2">{title}</h1>
      {subtitle && (
        <p className="text-base text-gray-700 text-center mb-1 mt-0">{subtitle}</p>
      )}

      {/* Fil de discussion, toujours en haut */}
      <div className="h-72 overflow-y-scroll border rounded p-3 bg-white shadow-inner mb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
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

      {/* Zone de saisie */}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={input}
          placeholder={inputPlaceholder}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 border rounded px-3 py-2 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Envoyer
        </button>
      </div>

      {/* Actions/barre de boutons additionnelle */}
      {actions && <div className="mt-3">{actions}</div>}
    </section>
  );
}

// components/ui/InteractiveBlock.tsx
import React from "react";

type InteractiveBlockProps = {
  title: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  discussion: string[];
  renderActions: (state: {
    etatDiscussion: string;
    setEtatDiscussion: (val: string) => void;
    setDiscussion: (fn: (prev: string[]) => string[]) => void;
  }) => React.ReactNode;
  modal?: React.ReactNode;
  savedMessage?: React.ReactNode;
};

export default function InteractiveBlock({
  title,
  subtitle,
  avatar,
  discussion,
  renderActions,
  modal,
  savedMessage,
}: InteractiveBlockProps) {
  const [etatDiscussion, setEtatDiscussion] = React.useState<
    "init" | "active" | "pause" | "stopped" | "finalized"
  >("init");
  const [discussionState, setDiscussion] = React.useState(discussion);

  React.useEffect(() => {
    setDiscussion(discussion);
  }, [discussion]);

  return (
    <section className="w-full max-w-3xl mx-auto p-2 flex flex-col gap-2 text-gray-800 mt-0">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mb-1 mt-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-gray-700 text-center mb-1 mt-0">
          {subtitle}
        </p>
      )}
      {avatar}
      <div className="w-full">
        {renderActions({
          etatDiscussion,
          setEtatDiscussion,
          setDiscussion,
        })}
      </div>
      <div className="h-72 overflow-y-scroll border rounded p-3 bg-white shadow-inner scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        {discussionState.length === 0 ? (
          <p className="text-gray-500 italic text-center">
            Le fil de discussion apparaîtra ici.
          </p>
        ) : (
          discussionState.map((msg, idx) => (
            <p key={idx} className="mb-1">
              {msg}
            </p>
          ))
        )}
      </div>
      {modal}
      {savedMessage}
    </section>
  );
}

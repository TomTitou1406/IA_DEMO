import React, { useRef } from "react";

type Archive = {
  id: string;
  title: string;
  type: string;
  updated_at: string;
};

export default function ArchivesBadgeCarousel({
  archives,
  onSelect,
}: {
  archives: Archive[];
  onSelect: (conversationId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (archives.length === 0) return null;

  return (
    <div className="flex items-center space-x-2 my-6">
      {archives.length > 3 && (
        <button
          onClick={() => scroll("left")}
          className="rounded-full p-2 border hover:bg-gray-200"
          aria-label="Précédent"
        >
          &#8592;
        </button>
      )}
      <div
        className="flex overflow-x-auto no-scrollbar space-x-4"
        ref={scrollRef}
        style={{ maxWidth: "700px" }}
      >
        {archives.map((archive) => (
          <button
            key={archive.id}
            className="min-w-[200px] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg px-4 py-2 text-left shadow transition cursor-pointer"
            onClick={() => onSelect(archive.id)}
            title="Reprendre cette conversation"
          >
            <span className="block font-semibold text-blue-700 mb-1">
              {archive.title || "Sans titre"}
            </span>
            <span className="block text-xs text-gray-500 mb-1">
              Modifiée le {new Date(archive.updated_at).toLocaleDateString()}
            </span>
            <span className="inline-block bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded">
              {archive.type}
            </span>
          </button>
        ))}
      </div>
      {archives.length > 3 && (
        <button
          onClick={() => scroll("right")}
          className="rounded-full p-2 border hover:bg-gray-200"
          aria-label="Suivant"
        >
          &#8594;
        </button>
      )}
    </div>
  );
}

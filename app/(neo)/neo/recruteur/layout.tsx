// Copier-coller dans /app/(neo)/neo/recruteur/layout.tsx et /app/(neo)/neo/entretien/layout.tsx

import type { ReactNode } from "react";

export default function SpaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar dédiée à cet espace */}
      <aside className="w-64 bg-white border-r flex flex-col p-6">
        <div className="mb-10 text-2xl font-bold text-[var(--nc-blue)]">NeoRecrut</div>
        <nav className="flex flex-col gap-3">
          <a href="/neo" className="text-gray-600 hover:text-[var(--nc-blue)]">Accueil</a>
          <a href="/neo/recruteur" className="font-semibold text-[var(--nc-blue)]">Espace Entreprises</a>
          <a href="/neo/entretien" className="font-semibold text-[var(--nc-cyan)]">Espace Talents</a>
        </nav>
      </aside>
      {/* Contenu principal */}
      <main className="flex-1 bg-[var(--nc-gray)] p-10">
        {children}
      </main>
    </div>
  );
}

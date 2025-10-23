// /app/layout.tsx
import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "NeoRecrut - logo - v0.0",
  description: "La nouvelle ère du recrutement",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="w-full bg-white border-b py-4 px-8 flex items-center justify-between">
          <span className="text-2xl font-extrabold text-[var(--nc-blue)]">
            NeoRecrut
          </span>
          <a
            href="/neo"
            className="text-[var(--nc-blue)] text-sm font-semibold hover:underline"
            aria-label="Retour à l’accueil NeoRecrut"
          >
            ← Accueil
          </a>
        </header>
        <main>{children}</main>
        <footer className="w-full bg-[#f3f4f6] text-xs py-4 text-center text-gray-500 mt-8">
          © {new Date().getFullYear()} NeoRecrut - Tous droits réservés
        </footer>
      </body>
    </html>
  );
}

// /app/layout.tsx
import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "NeoRecrut",
  description: "La nouvelle ère du recrutement",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Variable temporaire pour l'état de connexion (à remplacer par vrai état)
  const isLoggedIn = false;

  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <header className="w-full bg-white border-b py-4 px-4 sm:px-8 flex items-center justify-between max-w-[1024px] mx-auto">
          <span className="text-2xl font-extrabold text-[var(--nc-blue)] tracking-wide">
            NeoRecrut
          </span>
          <nav className="flex items-center gap-6">
            <a
              href="/neo"
              className="text-[var(--nc-blue)] text-sm font-semibold hover:underline whitespace-nowrap"
              aria-label="Retour à l’accueil NeoRecrut"
            >
              ← Accueil
            </a>
            {/* Lien connexion/déconnexion (logique à implémenter) */}
            {isLoggedIn ? (
              <a
                href="/logout"
                className="text-gray-700 text-sm font-medium hover:underline whitespace-nowrap"
              >
                Se déconnecter
              </a>
            ) : (
              <a
                href="/login"
                className="text-gray-700 text-sm font-medium hover:underline whitespace-nowrap"
              >
                Se connecter
              </a>
            )}
          </nav>
        </header>
        <main className="flex-grow max-w-[1024px] w-full mx-auto px-4 sm:px-8 py-6">
          {children}
        </main>
        <footer className="w-full bg-[#f3f4f6] text-xs py-4 text-center text-gray-500 mt-auto">
          © {new Date().getFullYear()} NeoRecrut - Tous droits réservés
        </footer>
      </body>
    </html>
  );
}

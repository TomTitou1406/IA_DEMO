// /app/layout.tsx
import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "NeoRecrut",
  description: "La nouvelle ère du recrutement",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isLoggedIn = false; // à gérer plus tard

  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <header className="w-full bg-white border-b">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between py-4">
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
          </div>
        </header>

        <main className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6">
          {children}
        </main>

        <footer className="w-full bg-[#f3f4f6] text-xs py-4 text-center text-gray-500 mt-auto">
          © {new Date().getFullYear()} NeoRecrut - Tous droits réservés
        </footer>
      </body>
    </html>
  );
}

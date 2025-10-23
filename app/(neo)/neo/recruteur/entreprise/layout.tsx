import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col bg-[var(--nc-gray)]">
        <header className="w-full bg-white border-b py-4 px-4 flex items-center justify-between">
          <span className="text-2xl font-extrabold text-[var(--nc-blue)]">NeoRecrut</span>
          {/* ...menu/nav utile... */}
        </header>
        <main className="flex-1 flex flex-col items-center px-2 sm:px-6 py-6 w-full">
          {children}
        </main>
        <footer className="w-full bg-[#f3f4f6] text-xs py-4 text-center text-gray-500">
          © {new Date().getFullYear()} NeoRecrut
        </footer>
      </body>
    </html>
  );
}

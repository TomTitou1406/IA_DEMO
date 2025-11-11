import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'NeoRecrut DIY',
  description: 'Interface DIY pour NeoRecrut',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col relative bg-[var(--nc-gray)]">
        {/* Image de fond subtile */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'url("/background-texture-5.webp")',
            backgroundPosition: 'top center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            opacity: 0.08,
            filter: 'grayscale(100%) brightness(1.5)',
          }}
        />
        
        <header className="fixed top-0 left-0 w-full bg-white/50 backdrop-blur-md border-b z-50 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between py-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 tracking-wide">
                NeoRecrut DIY
              </span>
            </div>
            <nav className="flex items-center gap-6">
              <a href="/" className="text-blue-600 text-sm font-semibold hover:underline">
                Accueil
              </a>
            </nav>
          </div>
        </header>
        
        {/* Contenu principal */}
        <main className="relative z-10 flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 pt-20">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="w-full bg-[#f3f4f6] text-xs py-4 text-center text-gray-500 mt-auto">
          © {new Date().getFullYear()} NeoRecrut DIY - Tous droits réservés
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "../styles/globals.css";
import FloatingAssistant from './components/FloatingAssistant';

export const metadata: Metadata = {
  title: "PapiBricole - Ton coach IA bricolage",
  description: "Assistant IA pour tous tes projets bricolage. Guidage pas à pas, conseils d'expert, suivi de chantier.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <span className="logo-icon">PB</span>
              <span className="logo-title">
                PapiBricole <span className="color-orange"></span>
              </span>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <FloatingAssistant />
      </body>
    </html>
  );
}

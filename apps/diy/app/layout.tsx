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
              <div className="logo-icon">
                <img src="/images/papibricole_logo_tete.png" alt="PapiBricole" />
              </div>
              <div className="logo-text">
                <span className="logo-title">PapiBricole</span>
                <span className="logo-baseline">Je t'aide pas à pas et à chaque étape !</span>
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <FloatingAssistant />
      </body>
    </html>
  );
}

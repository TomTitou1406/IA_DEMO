import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Papibricole - Ton coach IA bricolage",
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
                Papibricole <span className="color-orange">DIY</span>
              </span>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

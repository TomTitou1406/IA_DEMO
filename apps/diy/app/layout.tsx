import type { Metadata } from "next";
import "../styles/globals.css";
import FloatingAssistant from './components/FloatingAssistant';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';

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
        <ToastProvider>
          <Navbar />
          <main>{children}</main>
          <FloatingAssistant />
        </ToastProvider>
      </body>
    </html>
  );
}

/**
 * Layout Entreprise - Workflow dédié
 * @version 0.01
 * @date 2025-10-31
 * 
 * Layout minimaliste pour le workflow de création d'entreprise
 * Conserve les couleurs et le style du projet, sans NavBar
 */

export default function EntrepriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  );
}

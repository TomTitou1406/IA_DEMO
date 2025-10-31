/**
 * Layout Entreprise - Workflow dédié
 * @version 0.02
 * @date 2025-10-31
 * 
 * Layout minimaliste pour le workflow de création d'entreprise
 * Design NeoRecrut : fond gris clair, texte sombre
 */

export default function EntrepriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {children}
    </div>
  );
}

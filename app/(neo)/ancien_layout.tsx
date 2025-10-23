export default function NeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="bg-brand.white border-r">
        <div className="px-5 py-5 text-2xl font-bold text-brand.blue">NeoRecrut</div>
        <nav className="flex flex-col gap-1 px-2">
          <a className="px-3 py-2 rounded-lg hover:bg-brand.gray/60" href="/neo">Accueil</a>
          <a className="px-3 py-2 rounded-lg hover:bg-brand.gray/60" href="/neo/recruteur">Dashboard</a>
          <a className="px-3 py-2 rounded-lg hover:bg-brand.gray/60" href="/neo/entretien">Entretien IA</a>
        </nav>
      </aside>

      {/* Contenu */}
      <div className="bg-brand.gray">
        <header className="sticky top-0 z-40 bg-brand.gray/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <h1 className="text-3xl font-bold text-brand.blue">Dashboard Recruteur</h1>
            <p className="text-sm text-gray-600">Gérez vos offres et suivez vos recrutements</p>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

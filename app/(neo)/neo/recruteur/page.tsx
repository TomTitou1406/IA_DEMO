import React from "react";
import Link from "next/link";

export default function Recruteur() {
  const cards = [
    {
      title: "Votre entreprise",
      desc: "Présentez ici le contexte de votre société et valorisez son attractivité. L’avatar IA vous guidera pas à pas pour rédiger la description parfaite et booster l’intérêt des candidats.",
      color: "bg-[var(--nc-blue)]",
      icon: (
        <span className="text-5xl" role="img" aria-label="Bâtiment">
          🏢
        </span>
      ),
    },
    {
      title: "Vos postes à pourvoir",
      desc: "Publiez, décrivez et gérez vos offres d’emploi : profils, critères, compétences attendues, tout est centralisé ici. L’avatar IA vous accompagne à chaque étape pour ne rien oublier.",
      color: "bg-[var(--nc-cyan)]",
      icon: (
        <span className="text-5xl" role="img" aria-label="Document">
          📄
        </span>
      ),
    },
    {
      title: "Conseils pour le recruteur",
      desc: "Accédez à des conseils intelligents pour réussir chaque phase du recrutement. L’avatar IA est toujours présent pour vous épauler et vous orienter, même en cas de doute.",
      color: "bg-[var(--nc-green)]",
      icon: (
        <span className="text-5xl" role="img" aria-label="Ampoule">
          💡
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--nc-gray)]">
      {/* Barre latérale */}
      <aside className="w-64 bg-white border-r flex flex-col py-8 px-6">
        <Link href="/" className="mb-12 text-2xl font-extrabold text-[var(--nc-blue)]">
          NeoRecrut
        </Link>
        <nav className="flex flex-col gap-5">
          <Link href="/neo/recruteur/" className="text-[var(--nc-blue)] font-semibold">
            Tableau de bord
          </Link>
          <Link href="/neo/" className="text-gray-600 hover:text-[var(--nc-blue)] transition">
            Retour accueil
          </Link>
        </nav>
        <div className="flex-1"></div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-12">
        <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4">
          Espace Entreprises
        </h1>
        <p className="text-lg text-gray-700 mb-10">
          Gérez votre entreprise, vos offres d'emploi et recevez un accompagnement IA personnalisé.
        </p>
        <div className="flex gap-8 flex-wrap">
          {cards.map((c) => (
            <div
              key={c.title}
              className="relative overflow-hidden bg-[var(--nc-white)] rounded-xl border border-[var(--nc-gray)]
              shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2
              transition-all duration-200 w-80 p-8 pt-12 flex flex-col items-center text-center cursor-pointer group"
              style={{willChange: "transform, box-shadow"}}
            >
              {/* Barre colorée en haut */}
              <div
                className={`${c.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200`}
                style={{marginTop: "-2px"}}
              />
              {/* Icône surdimensionnée */}
              <div className="mb-5">
                <div className="mx-auto w-24 h-24 flex items-center justify-center bg-[var(--nc-gray)] rounded-full shadow-sm">
                  {c.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{c.title}</h3>
              <p className="text-gray-700">{c.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

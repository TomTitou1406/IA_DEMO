import React from "react";
import Link from "next/link"; // Ajoute ceci si tu utilises Next.js

export default function Page() {
  const roles = [
    {
      title: "Espace Entreprises",
      desc: "Gérez vos recrutements avec des outils IA avancés. Créez des postes, suivez les candidatures et optimisez votre processus de sélection.",
      color: "bg-[var(--nc-blue)]",
      icon: (
        <span role="img" aria-label="Entreprise">
          🏢
        </span>
      ),
      href: "/neo/recruteur/",
    },
    {
      title: "Espace Talents",
      desc: "Découvrez et postulez à des offres, participez aux entretiens virtuels IA et recevez des conseils personnalisés.",
      color: "bg-[var(--nc-cyan)]",
      icon: (
        <span role="img" aria-label="Talents">
          👥
        </span>
      ),
      href: "/neo/entretien/",
    },
    {
      title: "Accès administrateur",
      desc: "Supervisez la plateforme, gérez les utilisateurs et analysez les performances avec des tableaux de bord complets.",
      color: "bg-[var(--nc-green)]",
      icon: (
        <span role="img" aria-label="Admin">
          ⚙️
        </span>
      ),
      href: "/neo/", // Ou une future route admin dédiée
    },
  ];

  return (
    <main className="bg-[var(--nc-gray)] min-h-screen py-12 px-4">
      <h1 className="text-4xl font-extrabold text-[var(--nc-blue)] text-center mb-12">
        La nouvelle ère du recrutement, fluide et intelligente
      </h1>
       <p className="text-lg text-gray-700 mb-10 text-center">
        Pour un recrutement plus simple, plus rapide, assisté par l'IA mais sans perdre l'humain !
      </p>
      <div className="flex flex-wrap gap-8 justify-center">
        {roles.map((r) => (
          <Link
            href={r.href}
            key={r.title}
            className="
              group relative overflow-hidden bg-[var(--nc-white)] rounded-xl border border-[var(--nc-gray)] shadow-[0_6px_18px_rgba(0,0,0,0.06)]
              hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200
              w-80 p-8 pt-12 flex flex-col items-center text-center cursor-pointer
              focus:outline focus:outline-2 focus:outline-[var(--nc-blue)]
            "
            style={{willChange: "transform, box-shadow"}}
          >
            {/* Barre colorée en haut */}
            <div
              className={`
                ${r.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200
              `}
              style={{marginTop: "-2px"}}
            />
            {/* Icône/avatar */}
            <div className="mb-5">
              <div className="mx-auto w-20 h-20 flex items-center justify-center bg-[var(--nc-gray)] rounded-full shadow-sm">
                <span className="text-4xl">{r.icon}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{r.title}</h3>
            <p className="text-gray-700">{r.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

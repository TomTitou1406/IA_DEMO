import React from "react";

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
    },
    {
      title: "Espace Talents",
      desc: "Trouvez l'emploi de vos rêves grâce à notre matching IA. Passez des entretiens virtuels et recevez des conseils personnalisés.",
      color: "bg-[var(--nc-cyan)]",
      icon: (
        <span role="img" aria-label="Candidat">
          👤
        </span>
      ),
    },
    {
      title: "Accès Administrateur",
      desc: "Supervisez la plateforme, gérez les utilisateurs et analysez les performances avec des tableaux de bord complets.",
      color: "bg-[var(--nc-green)]",
      icon: (
        <span role="img" aria-label="Administrateur">
          ⚙️
        </span>
      ),
    },
  ];

  return (
    <main className="bg-[var(--nc-gray)] min-h-screen py-12 px-4">
      <h1 className="text-4xl font-extrabold text-[var(--nc-blue)] text-center mb-12">
        NeoRecrut - La nouvelle ère du recrutement
      </h1>
      <div className="flex flex-wrap gap-8 justify-center">
        {roles.map((r) => (
          <div
            key={r.title}
            className={`
              relative bg-[var(--nc-white)] rounded-xl border border-[var(--nc-gray)] shadow-[0_6px_18px_rgba(0,0,0,0.06)]
              hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200
              w-80 p-8 pt-12 flex flex-col items-center text-center cursor-pointer
              group
            `}
            style={{willChange: "transform, box-shadow"}}
          >
            {/* Barre colorée en haut, fine et élégante */}
            <div
              className={`
                ${r.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200
                group-hover:scale-x-105
              `}
              style={{marginTop: "-2px"}} // Décalage fin pour bien coller le coin arrondi
            />
            {/* Icône/avatar */}
            <div className="mb-5">
              <div className="mx-auto w-14 h-14 flex items-center justify-center bg-[var(--nc-gray)] rounded-full shadow-sm">
                {r.icon}
              </div>
            </div>
            {/* Titre */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{r.title}</h3>
            {/* Description */}
            <p className="text-gray-700">{r.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

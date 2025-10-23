import React from "react";

export default function Recruteur() {
  const cards = [
    // ... (même données qu'avant)
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-10">
      <a href="/neo" className="mb-6 text-sm text-[var(--nc-blue)] underline hover:opacity-80">← Accueil</a>
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4 text-center">
        Espace Entreprises
      </h1>
      <p className="text-lg text-gray-700 mb-10 text-center">
        Gérez votre entreprise, vos offres d'emploi et recevez un accompagnement IA personnalisé.
      </p>
      <div className="flex gap-8 flex-wrap justify-center">
        {cards.map((c) => (
          <div
            key={c.title}
            className="relative overflow-hidden bg-[var(--nc-white)] rounded-xl border border-[var(--nc-gray)] shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 w-80 p-8 pt-12 flex flex-col items-center text-center cursor-pointer group"
            style={{ willChange: "transform, box-shadow" }}
          >
            <div className={`${c.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200`} style={{ marginTop: "-2px" }} />
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
    </div>
  );
}

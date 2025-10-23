import React from "react";

export default function Entretien() {
  const cards = [
    {
      title: "Information sur le poste et critères de présélection",
      desc: "Retrouvez ici tous les détails du poste ciblé : missions, compétences requises, et critères de présélection. L’IA vous guide pour bien comprendre les attentes et vérifier les prérequis avant l’entretien.",
      color: "bg-[var(--nc-blue)]",
      icon: (
        <span className="text-5xl" role="img" aria-label="Info">
          ℹ️
        </span>
      ),
    },
    {
      title: "Entretien de validation des compétences",
      desc: "Passez un entretien interactif où l’IA évalue vos compétences techniques et comportementales. Recevez un feedback précis et des conseils de progression en temps réel, dans un cadre bienveillant.",
      color: "bg-[var(--nc-cyan)]",
      icon: (
        <span className="text-5xl" role="img" aria-label="Dialogue">
          🎤
        </span>
      ),
    },
    {
      title: "Conseils et préparation",
      desc: "Profitez des conseils personnalisés de l’avatar IA : méthodologie, astuces de présentation, préparation mentale et réponses types. Vous ne serez jamais seul face aux entretiens !",
      color: "bg-[var(--nc-green)]",
      icon: (
        <span className="text-5xl" role="img" aria-label="Conseil">
          🧠
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-10">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4 text-center">
        Espace Talents : préparation à l’entretien
      </h1>
      <p className="text-lg text-gray-700 mb-10 text-center">
        Préparez-vous efficacement grâce à l’IA, étape par étape.
      </p>
      <div className="flex gap-8 flex-wrap justify-center">
        {cards.map((c) => (
          <div
            key={c.title}
            className="relative overflow-hidden bg-[var(--nc-white)] rounded-xl border border-[var(--nc-gray)] shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 w-80 p-8 pt-12 flex flex-col items-center text-center cursor-pointer group"
            style={{ willChange: "transform, box-shadow" }}
          >
            <div
              className={`${c.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200`}
              style={{ marginTop: "-2px" }}
            />
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

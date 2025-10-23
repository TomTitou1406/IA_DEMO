import React from "react";
import Link from "next/link";

export default function RecruteurEntreprise() {
  return (
    <section className="w-full max-w-3xl mx-auto flex flex-col gap-8 p-4">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] mb-4">
        Présenter votre entreprise
      </h1>
       <p className="text-lg text-gray-700 mb-10 text-center">
        Présentez votre entrepirse afin d'attirer les talents - L'IA vous assiste dans cette tâche
      </p>
      {/* Contenu additionnel statique ou futur contenu métier */}
    </section>
  );
}

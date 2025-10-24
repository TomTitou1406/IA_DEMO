import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function Page() {
  const roles = [
    {
      title: "Espace Entreprises",
      desc: "Gérez vos recrutements avec des outils IA avancés. Créez des postes, suivez les candidatures et optimisez votre processus de sélection.",
      color: "bg-[var(--nc-blue)]",
      image: "/cards/espace_entreprises_card.png",
      href: "/neo/recruteur/",
    },
    {
      title: "Espace Talents",
      desc: "Découvrez et postulez à des offres, participez aux entretiens virtuels IA et recevez des conseils personnalisés.",
      color: "bg-[var(--nc-cyan)]",
      image: "/cards/espace_candidats_card.png",
      href: "/neo/entretien/",
    },
    {
      title: "Accès administrateur",
      desc: "Supervisez la plateforme, gérez les utilisateurs et analysez les performances avec des tableaux de bord complets.",
      color: "bg-[var(--nc-green)]",
      image: "/cards/espace_admins_card.png",
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
        {roles.map((r) =>
          <Link
            href={r.href}
            key={r.title}
            className="no-underline"
          >
            <Card
              image={r.image}
              className="relative overflow-hidden w-80 p-0 cursor-pointer hover:border-[var(--nc-blue)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-200"
            >
              {/* Barre colorée en haut */}
              <div
                className={`${r.color} absolute top-0 left-0 h-1 w-full rounded-t-xl transition-all duration-200`}
                style={{ marginTop: "-2px" }}
              />
              {/* Si pas d'image, afficher l'icône dans une bulle grise */}
              {!r.image && r.icon &&
                <div className="mb-5 flex justify-center">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center bg-[var(--nc-gray)] rounded-full shadow-sm">
                    {r.icon}
                  </div>
                </div>
              }
              <CardHeader>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{r.title}</h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{r.desc}</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </main>
  );
}

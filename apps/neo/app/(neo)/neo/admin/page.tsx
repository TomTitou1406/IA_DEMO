import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function Page() {
  const roles: {
      title: string;
      desc: string;
      color: string;
      image?: string;
      icon?: React.ReactNode;
      href: string;
    }[] = [ 
    {
      title: "Gestion des utilisateurs et profils - Logs",
      desc: "Gestion des utilisateurs identifiés et droits d'accès - Suivi des logs et traçabilité.",
      color: "var(--nc-green)",           // ou "#1D5DFF", etc.
      image: "/cards/user_logs_card.png",
      href: "/neo/admin/", 
    },
    {
      title: "Gestion des prompts systems et avatars",
      desc: "Gestion des prompts de tous les scénarios IA et comportements des avatars + paramètres.",
      color: "var(--nc-green)",           // ou "#1D5DFF", etc.
      image: "/cards/admin_prompt_card.png",
      href: "/neo/admin/", 
    },
    {
      title: "Gestion Bases de données et connaissances",
      desc: "Gestion des tables et fichiers de connaissances partagées.",
      color: "var(--nc-green)",           // ou "#1D5DFF", etc.
      image: "/cards/bdd_connaissances_card.png",
      href: "/neo/admin/", 
    },
     {
      title: "Autres paramétrages spécifiques",
      desc: "Autres fonctionnalités utiles à la gestion de l'applicatif.",
      color: "var(--nc-green)",           // ou "#1D5DFF", etc.
      image: "/cards/autres_parametres_card.png",
      href: "/neo/", // Ou une future route admin dédiée
    },
  ];

  return (
    <main className="bg-[var(--nc-gray)] min-h-screen py-12 px-4">
      <h1 className="text-4xl font-extrabold text-[var(--nc-green)] text-center mb-4">
        Espace Administrateurs
      </h1>
       {/* Lien Retour centré */}
      <div className="text-center mb-4">
        <Link 
          href="/neo/" 
          className="text-[var(--nc-green)] hover:text-[var(--nc-green)] transition-colors duration-200 text-lg font-medium"
        >
          ← Retour
        </Link>
      </div>
      <p className="text-lg text-gray-700 mb-10 text-center">
        Gestion de l'ensemble des paramètres globaux de l'applicatif.
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
              color={r.color}
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


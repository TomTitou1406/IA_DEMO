etieimport React from "react";
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
      title: "Informations et critères de présélection",
      desc: "Tous les détails sur l'entreprise et le poste à pourvoir. Validez l'étape de présélection.",
      color: "var(--nc-cyan)",           // ou "#1D5DFF", etc.
      image: "/cards/info_preselection_card.png",
      href: "/neo/entretien/", 
    },
    {
      title: "Entretien de mise en avant de vos compétences",
      desc: "Passez un entretien interactif où l’IA évalue vos compétences et recevez un feedback précis et immédiat sur votre candidature.",
      color: "var(--nc-cyan)",           // ou "#1D5DFF", etc.
      image: "/cards/validation_competences_card.png",
      href: "/neo/entretien/", 
    },
    {
      title: "Conseils et préparation pour l'entretien",
      desc: "Profitez des conseils personnalisés de l’avatar IA : méthodologie, astuces de présentation, préparation mentale pour une expérience réussie !",
      color: "var(--nc-cyan)",           // ou "#1D5DFF", etc.
      image: "/cards/conseils_candidat_card.png",
      href: "/neo/entretien/", 
    },
  ];

  return (
    <main className="bg-[var(--nc-gray)] min-h-screen py-12 px-4">
      <h1 className="text-4xl font-extrabold text-[var(--nc-cyan)] text-center mb-4">
        Espace Candidats
      </h1>
      {/* Lien Retour centré */}
      <div className="text-center mb-4">
        <Link 
          href="/neo/" 
          className="text-[var(--nc-cyan)] hover:text-[var(--nc-cyan)] transition-colors duration-200 text-lg font-medium"
        >
          ← Retour
        </Link>
      </div>
      <p className="text-lg text-gray-700 mb-10 text-center">
        Infos entreprises et postes à pourvoir - Préselection et validation des compétences assistés par avatars IA.
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


import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function Page() {
  const roles = [
    { title: "Entreprise", desc: "Gérez vos recrutements, suivez les candidatures et optimisez votre process." },
    { title: "Candidat", desc: "Trouvez l'emploi idéal grâce au matching IA et aux entretiens virtuels." },
    { title: "Administrateur", desc: "Supervisez la plateforme et analysez les performances globales." },
  ];

  return (
    <section className="py-10">
      <h1 className="text-3xl font-extrabold text-[var(--nc-blue)] text-center mt-12 mb-10">
        NeoRecrut — La nouvelle ère du recrutement
      </h1>
      <div className="flex gap-8 flex-wrap justify-center mt-10">
        {roles.map((r) => (
          <div
            key={r.title}
            className="bg-[var(--nc-white)] rounded-xl shadow-[0_6px_18px_rgba(0,0,0,0.06)] border border-[var(--nc-gray)] 
                       hover:shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-200
                       p-6 w-80 cursor-pointer flex flex-col gap-2"
          >
            <h3 className="text-xl font-bold text-[var(--nc-blue)] mb-1">{r.title}</h3>
            <p className="text-gray-800">{r.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

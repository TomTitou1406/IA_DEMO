import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function Page() {
  const roles = [
    { title: "Entreprise", desc: "Gérez vos recrutements, suivez les candidatures et optimisez votre process." },
    { title: "Candidat", desc: "Trouvez l'emploi idéal grâce au matching IA et aux entretiens virtuels." },
    { title: "Administrateur", desc: "Supervisez la plateforme et analysez les performances globales." },
  ];

  return (
    <section className="py-10">
      <h2 className="text-5xl font-extrabold text-brand.blue text-center mb-10">
        NeoRecrut — La nouvelle ère du recrutement
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {roles.map((r) => (
          <Card key={r.title} className="border-t-4 shadow-card hover:shadow-lg transition" style={{ borderTopColor: "var(--nc-blue)" }}>
            <CardHeader>
              <h3 className="text-xl font-semibold text-gray-800">{r.title}</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

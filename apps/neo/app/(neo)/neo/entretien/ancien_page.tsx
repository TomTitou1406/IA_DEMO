import { Card, CardContent } from "@/components/ui/Card";

const DEMO_AVATARS = [
  { id: "a1", name: "Alice", langs: "FR, EN" },
  { id: "b2", name: "Bruno", langs: "FR" },
  { id: "c3", name: "Céline", langs: "FR, EN, ES" },
  { id: "d4", name: "David", langs: "EN" },
  { id: "e5", name: "Emma", langs: "FR, EN" },
  { id: "f6", name: "Farid", langs: "FR, AR" },
];

export default function Entretien() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-10">
      <a href="/neo" className="mb-6 text-sm text-[var(--nc-blue)] underline hover:opacity-80">
        ← Accueil
      </a>
      <h2 className="text-3xl font-bold text-center text-[var(--nc-blue)] mb-2">
        Choisissez votre avatar IA
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Sélectionnez l’avatar qui vous accompagnera lors de l’entretien
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
        {DEMO_AVATARS.map((a) => (
          <Card key={a.id} className="hover:shadow-lg transition">
            <CardContent className="flex flex-col items-center py-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[var(--nc-blue)] to-[var(--nc-cyan)] text-white grid place-items-center text-2xl font-bold">
                {a.name[0]}
              </div>
              <p className="mt-3 font-semibold">{a.name}</p>
              <p className="text-xs text-gray-500">Langues: {a.langs}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href="/interactive"
          className="bg-[var(--nc-blue)] text-white px-5 py-3 rounded-xl hover:opacity-90 transition"
        >
          Démarrer l’entretien
        </a>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const columns = [
  { title: "Besoin" },
  { title: "Diffusion" },
  { title: "Présélection" },
  { title: "Sélection" },
  { title: "Finalisation" },
];

export default function Recruteur() {
  return (
    <div className="grid lg:grid-cols-5 gap-5">
      {columns.map((c) => (
        <Card key={c.title} className="border-t-4" style={{ borderTopColor: "var(--nc-blue)" }}>
          <CardHeader>
            <h3 className="font-semibold">{c.title}</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-gray-100 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800">Développeur Full-Stack Senior</p>
                <Badge>12</Badge>
              </div>
              <p className="text-xs text-gray-500">TechCorp • 2025-10-15</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

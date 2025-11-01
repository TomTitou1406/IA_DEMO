export async function POST(request: Request) {
  const { entreprise_id, raw_conversation } = await request.json();

  // Appeler Claude/GPT pour extraire
  const prompt = `
Analyse cette conversation et extrait les informations structurées :

${JSON.stringify(raw_conversation)}

Retourne un JSON avec :
{
  "histoire": "...",
  "mission": "...",
  "vision": "...",
  "produits_services": [...],
  "marche_cible": "...",
  "culture_valeurs": "...",
  "effectif": ...,
  "localisation": "...",
  "perspectives": "..."
}
`;

  const extracted = await callLLM(prompt);

  // Sauvegarder dans BDD
  const { error } = await supabase
    .from('entreprises')
    .update(extracted)
    .eq('id', entreprise_id);

  return Response.json({ success: !error });
}

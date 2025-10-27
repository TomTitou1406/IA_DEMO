import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { session_id, token } = await request.json();

    // Ici : ajoute ta logique de sauvegarde en base
    // Exemple fictif : await saveSessionToDatabase(session_id, token);

    console.log("Sauvegarde session:", session_id, token);

    return NextResponse.json({ message: "Session sauvegardée avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur sauvegarde session :", error);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }
}

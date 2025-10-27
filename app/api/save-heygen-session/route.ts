import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialiser Supabase côté serveur avec la clé service role
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: NextRequest) {
  try {
    const {
      session_id,
      token,
      conversationId,
      title,
      subtitle,
      avatar_preview_image,
      avatar_name,
      knowledge_id,
      initial_message,
      messages,
    } = await request.json();

    if (!session_id || !token) {
      return NextResponse.json(
        { error: "session_id et token sont obligatoires" },
        { status: 400 }
      );
    }

    let res;
    if (conversationId) {
      // Mise à jour existante
      res = await supabase
        .from("conversations")
        .update({
          title,
          subtitle,
          avatar_preview_image,
          avatar_name,
          knowledge_id,
          initial_message,
          messages,
          session_id,
          token,
          updated_at: new Date(),
        })
        .eq("id", conversationId);
    } else {
      // Insertion nouvelle convo
      res = await supabase.from("conversations").insert([
        {
          user_id: process.env.DEFAULT_USER_ID || "", // Adapter si nécessaire
          type: "entreprise",
          title,
          subtitle,
          avatar_preview_image,
          avatar_name,
          knowledge_id,
          initial_message,
          messages,
          session_id,
          token,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }

    if (res.error) {
      console.error("Erreur Supabase :", res.error);
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Conversation sauvegardée avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

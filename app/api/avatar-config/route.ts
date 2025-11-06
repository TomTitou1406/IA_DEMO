// ============================================================================
// route.ts – API Route pour la configuration avatar
// Version: 1.0
// Gestion CRUD des paramètres de configuration HeyGen
// Endpoints:
//   GET    /api/avatar-config       - Récupérer tous les paramètres
//   GET    /api/avatar-config?key=X - Récupérer un paramètre spécifique
//   PUT    /api/avatar-config       - Mettre à jour les paramètres
//   PATCH  /api/avatar-config       - Mettre à jour un paramètre unique
//   POST   /api/avatar-config/reset - Réinitialiser aux valeurs par défaut
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StartAvatarRequest } from "@heygen/streaming-avatar";

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPES
// ============================================================================
interface AvatarConfigParameter {
  id: string;
  category: string;
  parameter_name: string;
  parameter_key: string;
  parameter_type: string;
  default_value: string | null;
  current_value: string | null;
  min_value: number | null;
  max_value: number | null;
  allowed_values: string[] | null;
  description: string;
  is_user_editable: boolean;
  requires_restart: boolean;
}

// ============================================================================
// GET - Récupérer les paramètres
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    let query = supabase
      .from("avatar_configuration")
      .select("*")
      .order("category", { ascending: true })
      .order("parameter_name", { ascending: true });

    // Si une clé spécifique est demandée
    if (key) {
      query = query.eq("parameter_key", key).single();
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Erreur récupération config:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de la configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("❌ Erreur GET /api/avatar-config:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Mettre à jour plusieurs paramètres (bulk update)
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config: Partial<StartAvatarRequest> = body;

    console.log("📝 Mise à jour configuration:", config);

    // Convertir la config HeyGen en updates BDD
    const updates: Array<{ key: string; value: string }> = [];

    // Mapper les paramètres
    if (config.quality) {
      updates.push({ key: "quality", value: config.quality.toLowerCase() });
    }
    if (config.avatarName) {
      updates.push({ key: "avatarName", value: config.avatarName });
    }
    if (config.language) {
      updates.push({ key: "language", value: config.language });
    }
    if (config.knowledgeId) {
      updates.push({ key: "knowledgeId", value: config.knowledgeId });
    }
    if (config.activityIdleTimeout !== undefined) {
      updates.push({ 
        key: "activityIdleTimeout", 
        value: config.activityIdleTimeout.toString() 
      });
    }

    // Voice settings
    if (config.voice) {
      if (config.voice.voiceId) {
        updates.push({ key: "voice.voiceId", value: config.voice.voiceId });
      }
      if (config.voice.rate !== undefined) {
        updates.push({ key: "voice.rate", value: config.voice.rate.toString() });
      }
      if (config.voice.emotion) {
        updates.push({ key: "voice.emotion", value: config.voice.emotion });
      }
    }

    // STT settings
    if (config.sttSettings) {
      if (config.sttSettings.provider) {
        updates.push({ 
          key: "sttSettings.provider", 
          value: config.sttSettings.provider 
        });
      }
      if (config.sttSettings.confidence !== undefined) {
        updates.push({ 
          key: "sttSettings.confidence", 
          value: config.sttSettings.confidence.toString() 
        });
      }
    }

    // Effectuer les mises à jour
    const promises = updates.map(({ key, value }) =>
      supabase
        .from("avatar_configuration")
        .update({ 
          current_value: value,
          updated_at: new Date().toISOString()
        })
        .eq("parameter_key", key)
    );

    const results = await Promise.all(promises);

    // Vérifier les erreurs
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("❌ Erreurs lors de la mise à jour:", errors);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de certains paramètres" },
        { status: 500 }
      );
    }

    console.log(`✅ ${updates.length} paramètres mis à jour`);

    return NextResponse.json({ 
      success: true, 
      updated: updates.length 
    });

  } catch (err) {
    console.error("❌ Erreur PUT /api/avatar-config:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Mettre à jour un seul paramètre
// ============================================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, value } = body;

    if (!id || value === undefined) {
      return NextResponse.json(
        { error: "ID et valeur requis" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("avatar_configuration")
      .update({ 
        current_value: value,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur mise à jour paramètre:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du paramètre" },
        { status: 500 }
      );
    }

    console.log(`✅ Paramètre ${data.parameter_key} mis à jour: ${value}`);

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error("❌ Erreur PATCH /api/avatar-config:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Réinitialiser aux valeurs par défaut
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "reset") {
      // Réinitialiser tous les paramètres
      const { error } = await supabase.rpc("reset_avatar_config_to_defaults");

      if (error) {
        console.error("❌ Erreur reset config:", error);
        return NextResponse.json(
          { error: "Erreur lors de la réinitialisation" },
          { status: 500 }
        );
      }

      console.log("✅ Configuration réinitialisée");

      return NextResponse.json({ 
        success: true, 
        message: "Configuration réinitialisée aux valeurs par défaut" 
      });
    }

    return NextResponse.json(
      { error: "Action non reconnue" },
      { status: 400 }
    );

  } catch (err) {
    console.error("❌ Erreur POST /api/avatar-config:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

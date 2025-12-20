/**
 * /api/chantiers/qualify-type/route.ts
 * 
 * Qualifie le type d'un chantier en analysant ses données
 * Retourne un code existant OU génère un nouveau type
 * 
 * @version 1.0
 * @date 20 décembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/app/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { chantierId } = await request.json();

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId requis' }, { status: 400 });
    }

    // 1. Charger les données du chantier
    const { data: chantier, error: chantierError } = await supabase
      .from('chantiers')
      .select('*')
      .eq('id', chantierId)
      .single();

    if (chantierError || !chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 });
    }

    // 2. Charger les types existants
    const { data: typesExistants } = await supabase
      .from('chantier_types_config')
      .select('code, nom, icone')
      .eq('est_actif', true)
      .order('nb_utilisations', { ascending: false });

    const listeTypes = typesExistants?.map(t => `- ${t.code}: ${t.icone} ${t.nom}`).join('\n') || '';

    // 3. Construire le contexte du chantier
    const contextChantier = `
TITRE: ${chantier.titre}
DESCRIPTION: ${chantier.description || 'Non renseignée'}
METADATA: ${JSON.stringify(chantier.metadata || {}, null, 2)}
    `.trim();

    // 4. Appel IA pour qualification
    const prompt = `Tu es un expert en classification de projets de bricolage.

TYPES DE CHANTIERS DISPONIBLES :
${listeTypes}

CHANTIER À QUALIFIER :
${contextChantier}

MISSION :
Analyse ce chantier et détermine le type le plus approprié.

RÈGLES :
1. Si un type existant correspond bien (>70% de pertinence), utilise son CODE exact
2. Si aucun type ne correspond, propose un nouveau type

RÉPONDS UNIQUEMENT EN JSON :

Si type existant :
{
  "match": true,
  "code": "code_existant"
}

Si nouveau type nécessaire :
{
  "match": false,
  "nouveau_type": {
    "code": "nouveau_code_en_snake_case",
    "nom": "Nom affiché",
    "icone": "emoji",
    "champs_critiques_phasage": ["champ1", "champ2", "champ3"],
    "questions_specifiques": ["Question 1 ?", "Question 2 ?"],
    "risques_courants": ["Risque 1", "Risque 2"],
    "points_attention": ["Point 1", "Point 2"]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content || '';
    
    // Extraire le JSON
    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Pas de JSON trouvé');
      }
    } catch (e) {
      console.error('Erreur parsing réponse IA:', responseText);
      return NextResponse.json({ error: 'Erreur parsing réponse IA' }, { status: 500 });
    }

    // 5. Traiter le résultat
    let finalCode: string;

    if (result.match && result.code) {
      // Type existant trouvé
      finalCode = result.code;
      console.log(`✅ Type existant trouvé: ${finalCode}`);

      // Incrémenter le compteur d'utilisation
      const currentCount = typesExistants?.find(t => t.code === finalCode)?.nb_utilisations || 0;
      await supabase
        .from('chantier_types_config')
        .update({ nb_utilisations: currentCount + 1 })
        .eq('code', finalCode);

    } else if (result.nouveau_type) {
      // Créer le nouveau type
      const nouveauType = result.nouveau_type;
      finalCode = nouveauType.code;

      const { error: insertError } = await supabase
        .from('chantier_types_config')
        .insert({
          code: nouveauType.code,
          nom: nouveauType.nom,
          icone: nouveauType.icone,
          champs_critiques_phasage: nouveauType.champs_critiques_phasage || [],
          questions_specifiques: nouveauType.questions_specifiques || [],
          risques_courants: nouveauType.risques_courants || [],
          points_attention: nouveauType.points_attention || [],
          est_actif: true,
          est_genere: true,
          genere_depuis_chantier_id: chantierId,
          nb_utilisations: 1
        });

      if (insertError) {
        console.error('Erreur création type:', insertError);
        return NextResponse.json({ error: 'Erreur création type' }, { status: 500 });
      }

      console.log(`🆕 Nouveau type créé: ${finalCode}`);
    } else {
      return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 });
    }

    // 6. Mettre à jour le chantier avec le bon code
    const updatedMetadata = {
      ...chantier.metadata,
      type_piece: finalCode
    };

    const { error: updateError } = await supabase
      .from('chantiers')
      .update({ metadata: updatedMetadata })
      .eq('id', chantierId);

    if (updateError) {
      console.error('Erreur mise à jour chantier:', updateError);
    }

    // 7. Charger la config du type (existant ou nouveau)
    const { data: typeConfig } = await supabase
      .from('chantier_types_config')
      .select('*')
      .eq('code', finalCode)
      .single();

    return NextResponse.json({
      success: true,
      code: finalCode,
      isNew: !result.match,
      typeConfig
    });

  } catch (error) {
    console.error('Erreur qualify-type:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

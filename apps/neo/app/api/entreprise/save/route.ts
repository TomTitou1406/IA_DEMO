/**
 * API Route - Sauvegarde entreprise
 * @version 1.1
 * @date 2025-10-31
 * 
 * Sauvegarde progressive des données entreprise pendant la conversation
 */

import { supabase } from "@/app/lib/supabaseClient";
import { DEFAULT_USER_ID } from "@/app/lib/constants";
import { NextResponse } from 'next/server';

console.log('🔍 API route chargée, DEFAULT_USER_ID:', DEFAULT_USER_ID);

export async function POST(request: Request) {
  try {
    // Auth temporaire - utiliser DEFAULT_USER_ID
    const tempUserId = DEFAULT_USER_ID;
    
    const body = await request.json();
    const { entreprise_id, data: entrepriseData } = body;

    console.log('📥 API entreprise/save:', {
      entreprise_id,
      hasData: !!entrepriseData
    });

    // Si pas d'ID, créer nouvelle entreprise
    if (!entreprise_id) {
      const insertData = {
        recruiter_id: tempUserId,
        status: 'in_progress',
        completion_percentage: 0,
        ...mapDataToColumns(entrepriseData),
      };

      console.log('➕ Création entreprise avec:', insertData);

      const { data: newEntreprise, error: createError } = await supabase
        .from('entreprises')
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création entreprise:', createError);
        return NextResponse.json(
          { 
            error: 'Erreur création entreprise',
            details: createError.message,
            code: createError.code
          },
          { status: 500 }
        );
      }

      console.log('✅ Entreprise créée:', newEntreprise.id);

      return NextResponse.json({
        success: true,
        entreprise_id: newEntreprise.id,
        message: 'Entreprise créée',
      });
    }

    // Sinon, mettre à jour entreprise existante
    const updateData = {
      ...mapDataToColumns(entrepriseData),
      completion_percentage: calculateCompletion(entrepriseData),
      updated_at: new Date().toISOString(),
    };

    console.log('🔄 Mise à jour entreprise:', entreprise_id);

    const { data: updatedEntreprise, error: updateError } = await supabase
      .from('entreprises')
      .update(updateData)
      .eq('id', entreprise_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur MAJ entreprise:', updateError);
      return NextResponse.json(
        { 
          error: 'Erreur mise à jour entreprise',
          details: updateError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Entreprise mise à jour');

    return NextResponse.json({
      success: true,
      entreprise_id: updatedEntreprise.id,
      completion_percentage: updatedEntreprise.completion_percentage,
      message: 'Entreprise sauvegardée',
    });

  } catch (error) {
    console.error('❌ Exception API save:', error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Mapper les données collectées vers les colonnes BDD
 */
function mapDataToColumns(data: any) {
  return {
    // Champs texte simples
    nom: data.nom || data.entreprise_nom || 'Entreprise sans nom',
    description: data.description || null,
    histoire: data.histoire?.texte || data.histoire || null,
    mission: data.mission?.texte || data.mission || null,
    vision: data.mission?.vision || data.vision || null,
    culture: data.culture?.description || data.culture || null,
    
    // Arrays
    valeurs: data.culture?.valeurs || data.valeurs || [],
    avantages: data.avantages?.liste || data.avantages || [],
    
    // Champs simples équipe/localisation
    nb_employes: data.equipe?.taille || data.nb_employes || null,
    taille: data.equipe?.taille_categorie || data.taille || null,
    secteur_activite: data.marche?.secteur || data.secteur_activite || null,
    ville: data.localisation?.ville || data.ville || null,
    pays: data.localisation?.pays || data.pays || 'France',
    adresse: data.localisation?.adresse || data.adresse || null,
    
    // JSONB (données structurées)
    produits_services: data.produits || null,
    marche_cible: data.marche || null,
    equipe_structure: data.equipe || null,
    localisation_details: data.localisation || null,
    perspectives: data.perspectives || null,
    
    // Conversation brute
    raw_conversation: data.raw_conversation || null,
  };
}

/**
 * Calculer le pourcentage de complétion
 * Basé sur les 9 thèmes collectés
 */
function calculateCompletion(data: any): number {
  const themes = [
    'histoire',
    'mission',
    'produits',
    'marche',
    'culture',
    'equipe',
    'avantages',
    'localisation',
    'perspectives',
  ];

  const completed = themes.filter((theme) => {
    return data[theme] && Object.keys(data[theme]).length > 0;
  }).length;

  return Math.round((completed / themes.length) * 100);
}

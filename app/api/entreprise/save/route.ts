/**
 * API Route - Sauvegarde entreprise
 * @version 1.0
 * @date 2025-10-31
 * 
 * Sauvegarde progressive des données entreprise pendant la conversation
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { entreprise_id, data: entrepriseData } = body;

    // Si pas d'ID, créer nouvelle entreprise
    if (!entreprise_id) {
      const { data: newEntreprise, error: createError } = await supabase
        .from('entreprises')
        .insert({
          recruiter_id: user.id,
          nom: entrepriseData.nom || 'Entreprise sans nom',
          status: 'in_progress',
          completion_percentage: 0,
          ...mapDataToColumns(entrepriseData),
        })
        .select()
        .single();

      if (createError) {
        console.error('Erreur création entreprise:', createError);
        return NextResponse.json(
          { error: 'Erreur création entreprise' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        entreprise_id: newEntreprise.id,
        message: 'Entreprise créée',
      });
    }

    // Sinon, mettre à jour entreprise existante
    const { data: updatedEntreprise, error: updateError } = await supabase
      .from('entreprises')
      .update({
        ...mapDataToColumns(entrepriseData),
        completion_percentage: calculateCompletion(entrepriseData),
        updated_at: new Date().toISOString(),
      })
      .eq('id', entreprise_id)
      .eq('recruiter_id', user.id) // Sécurité: only owner
      .select()
      .single();

    if (updateError) {
      console.error('Erreur MAJ entreprise:', updateError);
      return NextResponse.json(
        { error: 'Erreur mise à jour entreprise' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      entreprise_id: updatedEntreprise.id,
      completion_percentage: updatedEntreprise.completion_percentage,
      message: 'Entreprise sauvegardée',
    });

  } catch (error) {
    console.error('Erreur API save:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
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
    nom: data.nom || data.entreprise_nom,
    description: data.description,
    histoire: data.histoire?.texte || data.histoire,
    mission: data.mission?.texte || data.mission,
    vision: data.mission?.vision || data.vision,
    culture: data.culture?.description || data.culture,
    
    // Arrays
    valeurs: data.culture?.valeurs || data.valeurs || [],
    avantages: data.avantages?.liste || data.avantages || [],
    
    // Champs simples équipe/localisation
    nb_employes: data.equipe?.taille || data.nb_employes,
    taille: data.equipe?.taille_categorie || data.taille,
    secteur_activite: data.marche?.secteur || data.secteur_activite,
    ville: data.localisation?.ville || data.ville,
    pays: data.localisation?.pays || data.pays || 'France',
    adresse: data.localisation?.adresse || data.adresse,
    
    // JSONB (données structurées)
    produits_services: data.produits || null,
    marche_cible: data.marche || null,
    equipe_structure: data.equipe || null,
    localisation_details: data.localisation || null,
    perspectives: data.perspectives || null,
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

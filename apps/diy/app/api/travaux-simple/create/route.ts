/**
 * API Route : /api/travaux-simple/create
 * 
 * Crée un travail simple en BDD :
 * - 1 chantier (type_projet = 'simple')
 * - N étapes directement rattachées (pas de lots)
 * 
 * @version 1.0
 * @date 05 décembre 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function POST(request: NextRequest) {
  try {
    const travailData = await request.json();

    if (!travailData.titre) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    console.log('🔧 Création travail simple:', travailData.titre);

    // 1. Créer le chantier (type_projet = 'simple')
    const { data: chantier, error: chantierError } = await supabase
      .from('chantiers')
      .insert({
        user_id: DEFAULT_USER_ID,
        titre: travailData.titre,
        description: travailData.description || '',
        type_projet: 'simple',
        statut: 'en_cours',
        duree_estimee_heures: Math.ceil((travailData.duree_estimee_minutes || 60) / 60),
        metadata: {
          difficulte: travailData.difficulte,
          outils_necessaires: travailData.outils_necessaires || [],
          materiaux_necessaires: travailData.materiaux_necessaires || [],
          securite: travailData.securite || [],
          conseils_pro: travailData.conseils_pro || ''
        }
      })
      .select('id')
      .single();

    if (chantierError || !chantier) {
      console.error('Erreur création chantier:', chantierError);
      return NextResponse.json({ error: 'Erreur création chantier' }, { status: 500 });
    }

    console.log('✅ Chantier créé:', chantier.id);

    // 2. Créer un "lot" fictif pour rattacher les étapes
    // (On garde la structure existante mais avec un seul lot transparent)
    const { data: travail, error: travailError } = await supabase
      .from('travaux')
      .insert({
        chantier_id: chantier.id,
        titre: travailData.titre,
        description: travailData.description || '',
        ordre: 1,
        statut: 'en_cours',
        code_expertise: 'generaliste',
        niveau_requis: travailData.difficulte === 'facile' ? 'debutant' : 'intermediaire',
        duree_estimee_heures: Math.ceil((travailData.duree_estimee_minutes || 60) / 60),
        cout_estime: 0
      })
      .select('id')
      .single();

    if (travailError || !travail) {
      console.error('Erreur création travail:', travailError);
      // Rollback : supprimer le chantier
      await supabase.from('chantiers').delete().eq('id', chantier.id);
      return NextResponse.json({ error: 'Erreur création travail' }, { status: 500 });
    }

    console.log('✅ Travail créé:', travail.id);

    // 3. Créer les étapes
    if (travailData.etapes && travailData.etapes.length > 0) {
      const etapesInsert = travailData.etapes.map((etape: any) => ({
        travail_id: travail.id,
        numero: etape.ordre,
        titre: etape.titre,
        description: etape.description || '',
        duree_estimee_minutes: etape.duree_minutes || 10,
        statut: 'a_faire',
        points_attention: etape.points_attention || null
      }));

      console.log('📋 Étapes à insérer:', JSON.stringify(etapesInsert, null, 2));
      const { data: etapesData, error: etapesError } = await supabase
        .from('etapes')
        .insert(etapesInsert)
        .select();
      
      if (etapesError) {
        console.error('❌ Erreur création étapes:', etapesError);
        console.error('❌ Détails:', etapesError.message, etapesError.details);
      } else {
        console.log(`✅ ${etapesData?.length || 0} étapes créées`);
      }
    }

    return NextResponse.json({
      success: true,
      chantierId: chantier.id,
      travailId: travail.id
    });

  } catch (error) {
    console.error('Erreur API create travaux-simple:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

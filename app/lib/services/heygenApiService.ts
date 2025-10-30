/**
 * HeyGen API Service v0.01
 * 
 * Service d'appel à l'API HeyGen pour la gestion des Knowledge Bases
 * 
 * @author NeoRecrut Team
 * @date 2025-10-30
 * @version 0.01 - Création fonction updateKnowledgeBase
 */

// Types
interface UpdateKBResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Met à jour le contenu d'une Knowledge Base HeyGen
 * 
 * @param kbId - ID de la KB HeyGen à mettre à jour
 * @param content - Contenu texte à injecter dans la KB
 * @returns Résultat de la mise à jour
 * 
 * @example
 * const result = await updateHeyGenKnowledgeBase('782b26f0...', 'Contenu formaté...');
 */
export async function updateHeyGenKnowledgeBase(
  kbId: string,
  content: string
): Promise<UpdateKBResponse> {
  console.log(`📤 [HeyGen API] Mise à jour KB: ${kbId} (${content.length} caractères)`);

  try {
    // Récupérer l'API Key depuis les variables d'environnement
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!apiKey) {
      throw new Error('HEYGEN_API_KEY non configurée');
    }

    // Appel API HeyGen
    const response = await fetch('https://api.heygen.com/v1/knowledge_base.update', {
      method: 'PUT',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        knowledge_base_id: kbId,
        content: content,
      }),
    });

    // Vérifier le statut de la réponse
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [HeyGen API] Erreur HTTP:', response.status, errorData);
      throw new Error(`Erreur API HeyGen: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    // Parser la réponse
    const data = await response.json();

    console.log(`✅ [HeyGen API] KB mise à jour avec succès: ${kbId}`);

    return {
      success: true,
      message: 'KB mise à jour avec succès',
    };

  } catch (error) {
    console.error('❌ [HeyGen API] Erreur mise à jour KB:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Met à jour les 3 KB d'un poste avec leur contenu respectif
 * 
 * @param kbIds - IDs des 3 KB HeyGen
 * @param contents - Contenus formatés pour chaque KB
 * @returns Résultat global de la mise à jour
 */
export async function updatePosteKnowledgeBases(
  kbIds: {
    decouverte: string;
    preselection: string;
    selection: string;
  },
  contents: {
    decouverte: string;
    preselection: string;
    selection: string;
  }
): Promise<UpdateKBResponse> {
  console.log('📤 [HeyGen API] Mise à jour des 3 KB du poste...');

  try {
    // Mise à jour KB Découverte
    const resultDecouverte = await updateHeyGenKnowledgeBase(
      kbIds.decouverte,
      contents.decouverte
    );
    if (!resultDecouverte.success) {
      throw new Error(`Erreur KB Découverte: ${resultDecouverte.error}`);
    }

    // Mise à jour KB Présélection
    const resultPreselection = await updateHeyGenKnowledgeBase(
      kbIds.preselection,
      contents.preselection
    );
    if (!resultPreselection.success) {
      throw new Error(`Erreur KB Présélection: ${resultPreselection.error}`);
    }

    // Mise à jour KB Sélection
    const resultSelection = await updateHeyGenKnowledgeBase(
      kbIds.selection,
      contents.selection
    );
    if (!resultSelection.success) {
      throw new Error(`Erreur KB Sélection: ${resultSelection.error}`);
    }

    console.log('✅ [HeyGen API] Les 3 KB ont été mises à jour avec succès');

    return {
      success: true,
      message: 'Les 3 KB ont été mises à jour avec succès',
    };

  } catch (error) {
    console.error('❌ [HeyGen API] Erreur mise à jour des KB:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

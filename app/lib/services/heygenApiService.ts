/**
 * HeyGen API Service v0.05
 * 
 * Service d'appel à l'API HeyGen pour la gestion des Knowledge Bases
 * 
 * @author NeoRecrut Team
 * @date 2025-10-30
 * @version 0.05 - Correction nom paramètre: knowledgeId au lieu de knowledge_base_id
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
    // Construire l'URL complète pour l'API route
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const apiUrl = `${baseUrl}/api/update-kb`;
    
    console.log(`📤 [HeyGen API] Appel API route: ${apiUrl}`);
    
    // Appel à l'API route côté serveur (sécurisé)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        knowledgeId: kbId,  // Paramètre attendu par l'API route
        content: content,
      }),
    });

    // Vérifier le statut de la réponse
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [HeyGen API] Erreur HTTP:', response.status, errorData);
      throw new Error(`Erreur API: ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
    }

    // Parser la réponse
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erreur inconnue');
    }

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

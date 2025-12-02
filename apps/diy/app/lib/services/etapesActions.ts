/**
 * etapesActions.ts
 * 
 * Gestion des actions IA sur les étapes
 * Permet à l'assistant de modifier les étapes en temps réel
 * 
 * @version 1.0
 * @date 02 décembre 2025
 */

// ==================== TYPES ====================

export type EtapesActionType = 
  | 'modifier_etape'
  | 'ajouter_etape'
  | 'supprimer_etape'
  | 'deplacer_etape'
  | 'fusionner_etapes';

export interface EtapesAction {
  action: EtapesActionType;
  params: Record<string, any>;
  message: string;  // Explication pour le bricoleur
}

export interface EtapeGeneree {
  numero: number;
  titre: string;
  description: string;
  instructions?: string;
  duree_estimee_minutes: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  outils_necessaires: string[];
  materiaux_necessaires: { nom: string; quantite: string; unite: string }[];
  precautions?: string;
  conseils_pro?: string;
}

// ==================== EXTRACTION ====================

/**
 * Extrait une action étapes d'une réponse IA
 * Cherche un bloc JSON avec "etapes_action"
 */
export function extractEtapesAction(content: string): {
  hasAction: boolean;
  action: EtapesAction | null;
  cleanContent: string;
} {
  try {
    // Pattern 1: ```json { "etapes_action": ... } ```
    let jsonMatch = content.match(/```json\s*(\{[\s\S]*?"etapes_action"[\s\S]*?\})\s*```/);
    
    // Pattern 2: JSON brut avec etapes_action (sans backticks)
    if (!jsonMatch) {
      jsonMatch = content.match(/(\{[\s\S]*?"etapes_action"\s*:\s*\{[\s\S]*?\}\s*\})/);
    }
    
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      
      if (parsed.etapes_action) {
        // Retirer le JSON du message affiché
        let cleanContent = content
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*?"etapes_action"[\s\S]*?\}/g, '')
          .trim();
        
        // Nettoyer les phrases d'introduction du JSON
        cleanContent = cleanContent
          .replace(/Voici la modification[^:]*:/gi, '')
          .replace(/J'effectue la modification[^:]*:/gi, '')
          .replace(/Modification effectuée[^:]*:/gi, '')
          .trim();
        
        // Si le contenu est vide, utiliser le message de l'action
        if (!cleanContent || cleanContent.length < 5) {
          cleanContent = parsed.etapes_action.message || "Modification effectuée !";
        }
        
        console.log('✅ Action étapes détectée:', parsed.etapes_action);
        
        return {
          hasAction: true,
          action: parsed.etapes_action as EtapesAction,
          cleanContent
        };
      }
    }
    
    return { hasAction: false, action: null, cleanContent: content };
  } catch (error) {
    console.error('Erreur parsing action étapes:', error);
    return { hasAction: false, action: null, cleanContent: content };
  }
}

// ==================== EXTRACTION MULTI-ACTIONS ====================

/**
 * Extrait TOUTES les actions étapes d'une réponse IA
 * Utilisé quand l'IA génère plusieurs JSON
 */
export function extractEtapesActions(content: string): {
  hasActions: boolean;
  actions: EtapesAction[];
  cleanContent: string;
} {
  const actions: EtapesAction[] = [];
  let cleanContent = content;
  
  try {
    // Pattern pour trouver TOUS les blocs JSON avec etapes_action
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?"etapes_action"[\s\S]*?\})\s*```/g;
    let match;
    
    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.etapes_action) {
          actions.push(parsed.etapes_action as EtapesAction);
          console.log('✅ Action étapes détectée:', parsed.etapes_action);
        }
      } catch (e) {
        console.error('Erreur parsing JSON action:', e);
      }
    }
    
    // Si aucun bloc avec backticks, chercher JSON brut
    if (actions.length === 0) {
      const rawJsonRegex = /(\{[\s\S]*?"etapes_action"\s*:\s*\{[\s\S]*?\}\s*\})/g;
      while ((match = rawJsonRegex.exec(content)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.etapes_action) {
            actions.push(parsed.etapes_action as EtapesAction);
            console.log('✅ Action étapes détectée (raw):', parsed.etapes_action);
          }
        } catch (e) {
          console.error('Erreur parsing JSON brut:', e);
        }
      }
    }
    
    // Nettoyer le contenu (retirer tous les blocs JSON)
    cleanContent = content
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*?"etapes_action"[\s\S]*?\}/g, '')
      .trim();
    
    // Nettoyer les phrases d'introduction du JSON
    cleanContent = cleanContent
      .replace(/Voici (le|la|les) (JSON|modification|mise à jour)[^:]*:?/gi, '')
      .replace(/J'effectue la modification[^:]*:/gi, '')
      .replace(/Modification effectuée[^:]*:/gi, '')
      .trim();
    
    // Si le contenu est vide, utiliser le message de la dernière action
    if ((!cleanContent || cleanContent.length < 5) && actions.length > 0) {
      cleanContent = actions[actions.length - 1].message || "Modifications effectuées !";
    }
    
    if (actions.length > 1) {
      console.log(`📦 ${actions.length} actions étapes détectées`);
    }
    
    return {
      hasActions: actions.length > 0,
      actions,
      cleanContent
    };
    
  } catch (error) {
    console.error('Erreur extraction actions étapes:', error);
    return { hasActions: false, actions: [], cleanContent: content };
  }
}

// ==================== APPLICATION ====================

/**
 * Applique une action sur les étapes
 * Retourne le nouveau tableau d'étapes
 */
export function applyEtapesAction(
  etapes: EtapeGeneree[],
  action: EtapesAction
): EtapeGeneree[] {
  const newEtapes = [...etapes];
  
  switch (action.action) {
    
    // ========== MODIFIER UNE ÉTAPE ==========
    case 'modifier_etape': {
      const { etape_numero, modifications } = action.params;
      const index = newEtapes.findIndex(e => e.numero === etape_numero);
      if (index !== -1) {
        newEtapes[index] = { ...newEtapes[index], ...modifications };
      }
      break;
    }
    
    // ========== AJOUTER UNE ÉTAPE ==========
    case 'ajouter_etape': {
      const { position, ...etapeData } = action.params;
      const newEtape: EtapeGeneree = {
        numero: position,
        titre: etapeData.titre,
        description: etapeData.description || '',
        instructions: etapeData.instructions,
        duree_estimee_minutes: etapeData.duree_estimee_minutes || 30,
        difficulte: etapeData.difficulte || 'moyen',
        outils_necessaires: etapeData.outils_necessaires || [],
        materiaux_necessaires: etapeData.materiaux_necessaires || [],
        precautions: etapeData.precautions,
        conseils_pro: etapeData.conseils_pro
      };
      
      // Insérer à la bonne position et réordonner
      newEtapes.splice(position - 1, 0, newEtape);
      newEtapes.forEach((etape, idx) => etape.numero = idx + 1);
      break;
    }
    
    // ========== SUPPRIMER UNE ÉTAPE ==========
    case 'supprimer_etape': {
      const { etape_numero } = action.params;
      const filtered = newEtapes.filter(e => e.numero !== etape_numero);
      filtered.forEach((etape, idx) => etape.numero = idx + 1);
      return filtered;
    }
    
    // ========== DÉPLACER UNE ÉTAPE ==========
    case 'deplacer_etape': {
      const { etape_numero, nouvelle_position } = action.params;
      const index = newEtapes.findIndex(e => e.numero === etape_numero);
      if (index !== -1) {
        const [etape] = newEtapes.splice(index, 1);
        newEtapes.splice(nouvelle_position - 1, 0, etape);
        newEtapes.forEach((e, idx) => e.numero = idx + 1);
      }
      break;
    }
    
    // ========== FUSIONNER DES ÉTAPES ==========
    case 'fusionner_etapes': {
      const { etapes_numeros, nouveau_titre, duree_estimee_minutes } = action.params;
      const firstIndex = newEtapes.findIndex(e => e.numero === etapes_numeros[0]);
      const firstEtape = newEtapes[firstIndex];
      
      if (!firstEtape) break;
      
      // Fusionner les outils et matériaux
      const allOutils = new Set<string>();
      const allMateriaux: { nom: string; quantite: string; unite: string }[] = [];
      
      etapes_numeros.forEach((num: number) => {
        const etape = newEtapes.find(e => e.numero === num);
        if (etape) {
          etape.outils_necessaires?.forEach(o => allOutils.add(o));
          etape.materiaux_necessaires?.forEach(m => {
            if (!allMateriaux.find(am => am.nom === m.nom)) {
              allMateriaux.push(m);
            }
          });
        }
      });
      
      // Supprimer les étapes à fusionner
      const filtered = newEtapes.filter(e => !etapes_numeros.includes(e.numero));
      
      // Créer l'étape fusionnée
      const fusionEtape: EtapeGeneree = {
        ...firstEtape,
        titre: nouveau_titre,
        duree_estimee_minutes: duree_estimee_minutes,
        outils_necessaires: Array.from(allOutils),
        materiaux_necessaires: allMateriaux
      };
      
      filtered.splice(firstIndex, 0, fusionEtape);
      filtered.forEach((etape, idx) => etape.numero = idx + 1);
      return filtered;
    }
  }
  
  return newEtapes;
}

// ==================== EVENT HELPERS ====================

/**
 * Déclenche un événement d'action étapes
 * Utilisé par ChatInterface pour communiquer avec la page mise-en-oeuvre
 */
export function dispatchEtapesAction(action: EtapesAction): void {
  window.dispatchEvent(new CustomEvent('etapesAction', { detail: action }));
  console.log('📤 Event etapesAction dispatché:', action);
}

/**
 * Type pour le listener d'événement
 */
export type EtapesActionHandler = (action: EtapesAction) => void;

/**
 * tachesActions.ts
 * 
 * Service de gestion des actions IA sur les tâches
 * Pattern identique à etapesActions.ts
 * 
 * Extrait les actions JSON des réponses IA et les applique aux tâches
 * 
 * @version 1.0
 * @date 04 décembre 2025
 */

// ==================== TYPES ====================

export type TachesActionType = 
  | 'ajouter_tache'
  | 'supprimer_tache'
  | 'modifier_tache'
  | 'deplacer_tache'
  | 'cocher_tache'
  | 'decocher_tache';

export interface TachesAction {
  action: TachesActionType;
  params: Record<string, any>;
  message: string;
}

export interface TacheGeneree {
  numero: number;
  titre: string;
  description?: string;
  duree_estimee_minutes: number;
  est_critique: boolean;
  outils_necessaires?: string[];
  conseils_pro?: string;
  statut?: string;
}

// ==================== EXTRACTION ====================

/**
 * Extrait UNE action tâches d'une réponse IA
 * Cherche le pattern {"taches_action": {...}}
 */
export function extractTachesAction(content: string): TachesAction | null {
  try {
    // Pattern 1: Chercher dans un bloc ```json
    const jsonBlockMatch = content.match(/```json\s*(\{[\s\S]*?"taches_action"[\s\S]*?\})\s*```/);
    if (jsonBlockMatch) {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (parsed.taches_action) {
        return parsed.taches_action as TachesAction;
      }
    }

    // Pattern 2: Chercher directement {"taches_action": ...}
    const directMatch = content.match(/\{"taches_action"\s*:\s*\{[^}]+\}\}/);
    if (directMatch) {
      const parsed = JSON.parse(directMatch[0]);
      if (parsed.taches_action) {
        return parsed.taches_action as TachesAction;
      }
    }

    // Pattern 3: Chercher un JSON qui contient taches_action n'importe où
    const anyJsonMatch = content.match(/\{[\s\S]*?"taches_action"[\s\S]*?\}(?=\s*(?:```|$|\n\n))/);
    if (anyJsonMatch) {
      try {
        const parsed = JSON.parse(anyJsonMatch[0]);
        if (parsed.taches_action) {
          return parsed.taches_action as TachesAction;
        }
      } catch {
        // Continuer si parsing échoue
      }
    }

    return null;
  } catch (error) {
    console.error('Erreur extraction action tâches:', error);
    return null;
  }
}

/**
 * Extrait TOUTES les actions tâches d'une réponse IA (peut y en avoir plusieurs)
 * Retourne aussi le contenu nettoyé (sans les JSON)
 */
export function extractTachesActions(content: string): {
  hasActions: boolean;
  actions: TachesAction[];
  cleanContent: string;
} {
  const actions: TachesAction[] = [];
  let cleanContent = content;

  try {
    // Pattern: Chercher tous les blocs ```json contenant taches_action
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?"taches_action"[\s\S]*?\})\s*```/g;
    let match;
    
    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.taches_action) {
          actions.push(parsed.taches_action as TachesAction);
          // Retirer ce bloc du contenu
          cleanContent = cleanContent.replace(match[0], '');
        }
      } catch {
        // Continuer si parsing échoue
      }
    }

    // Pattern 2: Chercher les JSON directs (sans ```)
    const directRegex = /\{"taches_action"\s*:\s*\{[^}]+\}\}/g;
    while ((match = directRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.taches_action && !actions.some(a => 
          a.action === parsed.taches_action.action && 
          JSON.stringify(a.params) === JSON.stringify(parsed.taches_action.params)
        )) {
          actions.push(parsed.taches_action as TachesAction);
          cleanContent = cleanContent.replace(match[0], '');
        }
      } catch {
        // Continuer
      }
    }

    // Nettoyer le contenu
    cleanContent = cleanContent
      .replace(/\n{3,}/g, '\n\n')  // Réduire les sauts de ligne multiples
      .trim();

  } catch (error) {
    console.error('Erreur extraction actions tâches:', error);
  }

  return {
    hasActions: actions.length > 0,
    actions,
    cleanContent
  };
}

// ==================== APPLICATION DES ACTIONS ====================

/**
 * Applique une action sur un tableau de tâches
 * Retourne le nouveau tableau modifié
 */
export function applyTachesAction(
  taches: TacheGeneree[],
  action: TachesAction
): TacheGeneree[] {
  console.log('🔧 Application action tâches:', action.action, action.params);
  
  switch (action.action) {
    case 'ajouter_tache':
      return ajouterTache(taches, action.params);
    
    case 'supprimer_tache':
      return supprimerTache(taches, action.params);
    
    case 'modifier_tache':
      return modifierTache(taches, action.params);
    
    case 'deplacer_tache':
      return deplacerTache(taches, action.params);
    
    case 'cocher_tache':
      return cocherTache(taches, action.params, true);
    
    case 'decocher_tache':
      return cocherTache(taches, action.params, false);
    
    default:
      console.warn('Action tâches inconnue:', action.action);
      return taches;
  }
}

// ==================== ACTIONS INDIVIDUELLES ====================

/**
 * Ajoute une nouvelle tâche à la position spécifiée
 */
function ajouterTache(
  taches: TacheGeneree[],
  params: Record<string, any>
): TacheGeneree[] {
  const nouvelleTache: TacheGeneree = {
    numero: params.position || taches.length + 1,
    titre: params.titre || 'Nouvelle tâche',
    description: params.description || '',
    duree_estimee_minutes: params.duree_estimee_minutes || 10,
    est_critique: params.est_critique === true,
    outils_necessaires: params.outils_necessaires || [],
    conseils_pro: params.conseils_pro || '',
    statut: 'à_faire'
  };

  const position = (params.position || taches.length + 1) - 1;
  const result = [...taches];
  
  // Insérer à la position
  result.splice(position, 0, nouvelleTache);
  
  // Renuméroter
  result.forEach((t, i) => { t.numero = i + 1; });
  
  console.log(`✅ Tâche ajoutée: "${nouvelleTache.titre}" en position ${position + 1}`);
  return result;
}

/**
 * Supprime une tâche par son numéro
 */
function supprimerTache(
  taches: TacheGeneree[],
  params: Record<string, any>
): TacheGeneree[] {
  const numero = params.tache_numero || params.numero;
  
  if (!numero) {
    console.warn('Numéro de tâche manquant pour suppression');
    return taches;
  }
  
  const result = taches.filter(t => t.numero !== numero);
  
  // Renuméroter
  result.forEach((t, i) => { t.numero = i + 1; });
  
  console.log(`🗑️ Tâche ${numero} supprimée`);
  return result;
}

/**
 * Modifie une tâche existante
 */
function modifierTache(
  taches: TacheGeneree[],
  params: Record<string, any>
): TacheGeneree[] {
  const numero = params.tache_numero || params.numero;
  const modifications = params.modifications || params;
  
  if (!numero) {
    console.warn('Numéro de tâche manquant pour modification');
    return taches;
  }
  
  return taches.map(t => {
    if (t.numero === numero) {
      const updated = { ...t };
      
      // Appliquer les modifications (sauf le numéro)
      Object.keys(modifications).forEach(key => {
        if (key !== 'tache_numero' && key !== 'numero' && key !== 'modifications') {
          (updated as any)[key] = modifications[key];
        }
      });
      
      console.log(`✏️ Tâche ${numero} modifiée:`, modifications);
      return updated;
    }
    return t;
  });
}

/**
 * Déplace une tâche vers une nouvelle position
 */
function deplacerTache(
  taches: TacheGeneree[],
  params: Record<string, any>
): TacheGeneree[] {
  const numero = params.tache_numero || params.numero;
  const nouvellePosition = params.nouvelle_position || params.position;
  
  if (!numero || !nouvellePosition) {
    console.warn('Paramètres manquants pour déplacement tâche');
    return taches;
  }
  
  const currentIndex = taches.findIndex(t => t.numero === numero);
  if (currentIndex === -1) {
    console.warn(`Tâche ${numero} non trouvée`);
    return taches;
  }
  
  const result = [...taches];
  const [tache] = result.splice(currentIndex, 1);
  
  // Insérer à la nouvelle position (ajuster l'index)
  const newIndex = Math.max(0, Math.min(nouvellePosition - 1, result.length));
  result.splice(newIndex, 0, tache);
  
  // Renuméroter
  result.forEach((t, i) => { t.numero = i + 1; });
  
  console.log(`↕️ Tâche ${numero} déplacée en position ${nouvellePosition}`);
  return result;
}

/**
 * Coche ou décoche une tâche (change son statut)
 */
function cocherTache(
  taches: TacheGeneree[],
  params: Record<string, any>,
  cocher: boolean
): TacheGeneree[] {
  const numero = params.tache_numero || params.numero;
  
  if (!numero) {
    console.warn('Numéro de tâche manquant pour cochage');
    return taches;
  }
  
  return taches.map(t => {
    if (t.numero === numero) {
      const nouveauStatut = cocher ? 'terminée' : 'à_faire';
      console.log(`${cocher ? '✅' : '⬜'} Tâche ${numero} ${cocher ? 'cochée' : 'décochée'}`);
      return { ...t, statut: nouveauStatut };
    }
    return t;
  });
}

// ==================== DISPATCH EVENT ====================

/**
 * Déclenche un événement d'action tâches
 * Utilisé par ChatInterface pour communiquer avec la page tâches
 */
export function dispatchTachesAction(action: TachesAction): void {
  window.dispatchEvent(new CustomEvent('tachesAction', { detail: action }));
  console.log('📤 Event tachesAction dispatché:', action);
}

// ==================== HELPERS ====================

/**
 * Calcule les totaux des tâches
 */
export function calculerTotauxTaches(taches: TacheGeneree[]): {
  nombre_taches: number;
  duree_totale_minutes: number;
  taches_critiques: number;
  taches_terminees: number;
} {
  return {
    nombre_taches: taches.length,
    duree_totale_minutes: taches.reduce((sum, t) => sum + (t.duree_estimee_minutes || 0), 0),
    taches_critiques: taches.filter(t => t.est_critique).length,
    taches_terminees: taches.filter(t => t.statut === 'terminée').length
  };
}

/**
 * Agrège tous les outils des tâches (dédupliqués)
 */
export function aggregerOutilsTaches(taches: TacheGeneree[]): string[] {
  const outilsSet = new Set<string>();
  
  taches.forEach(t => {
    if (t.outils_necessaires) {
      t.outils_necessaires.forEach(outil => outilsSet.add(outil));
    }
  });
  
  return Array.from(outilsSet).sort();
}

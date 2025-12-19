/**
 * phasageActions.ts
 * 
 * Gestion des actions IA sur le phasage
 * Permet à l'assistant de modifier les lots en temps réel
 * 
 * @version 1.0
 * @date 30 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export type PhasageActionType = 
  | 'modifier_lot'
  | 'ajouter_lot'
  | 'supprimer_lot'
  | 'deplacer_lot'
  | 'fusionner_lots'
  | 'decouper_lot'
  | 'ajuster_budget_global';

export type NiveauRisque = 'conseil' | 'technique' | 'securite';

export type TypeForcage = 
  | 'ordre_modifie'
  | 'suppression_lot'
  | 'ajout_non_recommande'
  | 'budget_risque'
  | 'autre';

export interface Forcage {
  type: TypeForcage;
  niveau_risque: NiveauRisque;
  action_demandee: string;
  avertissement_affiche: string;
  regle_concernee: string | null;
}

export interface ForcageEnregistre extends Forcage {
  date: string;  // ISO 8601
  confirme_par_utilisateur: boolean;
}

export interface PhasageAction {
  action: PhasageActionType;
  params: Record<string, any>;
  message: string;
  forcage?: Forcage;  // ✅ NOUVEAU : forçage optionnel
}

export interface LotGenere {
  ordre: number;
  titre: string;
  description: string;
  code_expertise: string;
  niveau_requis: 'debutant' | 'intermediaire' | 'confirme';
  duree_estimee_heures: number;
  cout_estime: number;
  prerequis_stricts: number[];
  points_attention?: string;
  dependances_type: 'sequentiel' | 'parallele';
}

// ==================== EXTRACTION ====================

/**
 * Valide et normalise un forçage extrait du JSON
 */
function validateForcage(forcage: any): Forcage | null {
  if (!forcage || typeof forcage !== 'object') {
    return null;
  }

  // Vérifier les champs obligatoires
  if (!forcage.type || !forcage.niveau_risque || !forcage.action_demandee) {
    console.warn('⚠️ Forçage incomplet, champs manquants:', forcage);
    return null;
  }

  // Valider niveau_risque
  const niveauxValides: NiveauRisque[] = ['conseil', 'technique', 'securite'];
  if (!niveauxValides.includes(forcage.niveau_risque)) {
    console.warn('⚠️ niveau_risque invalide:', forcage.niveau_risque);
    forcage.niveau_risque = 'technique'; // Fallback
  }

  // Valider type
  const typesValides: TypeForcage[] = ['ordre_modifie', 'suppression_lot', 'ajout_non_recommande', 'budget_risque', 'autre'];
  if (!typesValides.includes(forcage.type)) {
    console.warn('⚠️ type de forçage invalide:', forcage.type);
    forcage.type = 'autre'; // Fallback
  }

  return {
    type: forcage.type,
    niveau_risque: forcage.niveau_risque,
    action_demandee: forcage.action_demandee,
    avertissement_affiche: forcage.avertissement_affiche || '',
    regle_concernee: forcage.regle_concernee || null
  };
}

/**
 * Extrait une action phasage d'une réponse IA
 * Cherche un bloc JSON avec "phasage_action"
 */
export function extractPhasageAction(content: string): {
  hasAction: boolean;
  action: PhasageAction | null;
  hasForcage: boolean;
  cleanContent: string;
} {
  try {
    // Pattern 1: ```json { "phasage_action": ... } ```
    let jsonMatch = content.match(/```json\s*(\{[\s\S]*?"phasage_action"[\s\S]*?\})\s*```/);
    
    // Pattern 2: JSON brut avec phasage_action (sans backticks)
    if (!jsonMatch) {
      jsonMatch = content.match(/(\{[\s\S]*?"phasage_action"\s*:\s*\{[\s\S]*?\}\s*\})/);
    }
    
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      
      if (parsed.phasage_action) {
        // Retirer le JSON du message affiché
        let cleanContent = content
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*?"phasage_action"[\s\S]*?\}/g, '')
          .trim();
        
        // Nettoyer les phrases d'introduction du JSON
        cleanContent = cleanContent
          .replace(/Voici la modification[^:]*:/gi, '')
          .replace(/J'effectue la modification[^:]*:/gi, '')
          .replace(/Modification effectuée[^:]*:/gi, '')
          .trim();
        
        // Si le contenu est vide, utiliser le message de l'action
        if (!cleanContent || cleanContent.length < 5) {
          cleanContent = parsed.phasage_action.message || "Modification effectuée !";
        }
        
        // Extraire et valider le forçage si présent
        const action = parsed.phasage_action as PhasageAction;
        let hasForcage = false;
        
        if (action.forcage) {
          const forcageValide = validateForcage(action.forcage);
          if (forcageValide) {
            action.forcage = forcageValide;
            hasForcage = true;
            console.log('⚠️ FORÇAGE détecté:', forcageValide.type, '-', forcageValide.niveau_risque);
          } else {
            delete action.forcage; // Supprimer si invalide
          }
        }
        
        console.log('✅ Action phasage détectée:', action.action, hasForcage ? '(avec forçage)' : '');
        
        return {
          hasAction: true,
          action,
          hasForcage,
          cleanContent
        };
      }
    }
    
    return { hasAction: false, action: null, hasForcage: false, cleanContent: content };
  } catch (error) {
    console.error('Erreur parsing action phasage:', error);
    return { hasAction: false, action: null, hasForcage: false, cleanContent: content };
  }
}

// ==================== EXTRACTION MULTI-ACTIONS ====================

/**
 * Extrait TOUTES les actions phasage d'une réponse IA
 * Utilisé quand l'IA génère plusieurs JSON (ex: réordonnancement)
 */
export function extractPhasageActions(content: string): {
  hasActions: boolean;
  actions: PhasageAction[];
  hasForcages: boolean;
  forcagesCount: number;
  cleanContent: string;
} {
  const actions: PhasageAction[] = [];
  let cleanContent = content;
  let forcagesCount = 0;
  
  try {
    // Pattern pour trouver TOUS les blocs JSON avec phasage_action
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?"phasage_action"[\s\S]*?\})\s*```/g;
    let match;
    
    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.phasage_action) {
          const action = parsed.phasage_action as PhasageAction;
          
          // Valider le forçage si présent
          if (action.forcage) {
            const forcageValide = validateForcage(action.forcage);
            if (forcageValide) {
              action.forcage = forcageValide;
              forcagesCount++;
              console.log('⚠️ FORÇAGE détecté:', forcageValide.type, '-', forcageValide.niveau_risque);
            } else {
              delete action.forcage;
            }
          }
          
          actions.push(action);
          console.log('✅ Action phasage détectée:', action.action, action.forcage ? '(avec forçage)' : '');
        }
      } catch (e) {
        console.error('Erreur parsing JSON action:', e);
      }
    }
    
    // Si aucun bloc avec backticks, chercher JSON brut
    if (actions.length === 0) {
      const rawJsonRegex = /(\{[\s\S]*?"phasage_action"\s*:\s*\{[\s\S]*?\}\s*\})/g;
      while ((match = rawJsonRegex.exec(content)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.phasage_action) {
            const action = parsed.phasage_action as PhasageAction;
            
            // Valider le forçage si présent
            if (action.forcage) {
              const forcageValide = validateForcage(action.forcage);
              if (forcageValide) {
                action.forcage = forcageValide;
                forcagesCount++;
                console.log('⚠️ FORÇAGE détecté (raw):', forcageValide.type, '-', forcageValide.niveau_risque);
              } else {
                delete action.forcage;
              }
            }
            
            actions.push(action);
            console.log('✅ Action phasage détectée (raw):', action.action, action.forcage ? '(avec forçage)' : '');
          }
        } catch (e) {
          console.error('Erreur parsing JSON brut:', e);
        }
      }
    }
    
    // Nettoyer le contenu (retirer tous les blocs JSON)
    cleanContent = content
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*?"phasage_action"[\s\S]*?\}/g, '')
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
      console.log(`📦 ${actions.length} actions phasage détectées${forcagesCount > 0 ? ` (${forcagesCount} forçages)` : ''}`);
    }
    
    return {
      hasActions: actions.length > 0,
      actions,
      hasForcages: forcagesCount > 0,
      forcagesCount,
      cleanContent
    };
    
  } catch (error) {
    console.error('Erreur extraction actions phasage:', error);
    return { hasActions: false, actions: [], hasForcages: false, forcagesCount: 0, cleanContent: content };
  }
}

// ==================== APPLICATION ====================

/**
 * Applique une action sur les lots
 * Retourne le nouveau tableau de lots
 */
export function applyPhasageAction(
  lots: LotGenere[],
  action: PhasageAction
): LotGenere[] {
  const newLots = [...lots];
  
  switch (action.action) {
    
    // ========== MODIFIER UN LOT ==========
    case 'modifier_lot': {
      const { lot_ordre, modifications } = action.params;
      const index = newLots.findIndex(l => l.ordre === lot_ordre);
      if (index !== -1) {
        newLots[index] = { ...newLots[index], ...modifications };
      }
      break;
    }
    
    // ========== AJOUTER UN LOT ==========
    case 'ajouter_lot': {
      const { position, ...lotData } = action.params;
      const newLot: LotGenere = {
        ordre: position + 1,
        titre: lotData.titre,
        description: lotData.description || '',
        code_expertise: lotData.code_expertise || 'generaliste',
        niveau_requis: lotData.niveau_requis || 'intermediaire',
        duree_estimee_heures: lotData.duree_estimee_heures || 0,
        cout_estime: lotData.cout_estime || 0,
        prerequis_stricts: [],
        points_attention: lotData.points_attention,
        dependances_type: 'sequentiel'
      };
      
      // Insérer à la bonne position et réordonner
      newLots.splice(position, 0, newLot);
      newLots.forEach((lot, idx) => lot.ordre = idx + 1);
      break;
    }
    
    // ========== SUPPRIMER UN LOT ==========
    case 'supprimer_lot': {
      const { lot_ordre } = action.params;
      const filtered = newLots.filter(l => l.ordre !== lot_ordre);
      filtered.forEach((lot, idx) => lot.ordre = idx + 1);
      return filtered;
    }
    
    // ========== DÉPLACER UN LOT ==========
    case 'deplacer_lot': {
      const { lot_ordre, nouvelle_position } = action.params;
      const index = newLots.findIndex(l => l.ordre === lot_ordre);
      if (index !== -1) {
        const [lot] = newLots.splice(index, 1);
        newLots.splice(nouvelle_position - 1, 0, lot);
        newLots.forEach((l, idx) => l.ordre = idx + 1);
      }
      break;
    }
    
    // ========== FUSIONNER DES LOTS ==========
    case 'fusionner_lots': {
      const { lots_ordres, nouveau_titre, nouvelle_description, cout_estime, duree_estimee_heures } = action.params;
      const firstIndex = newLots.findIndex(l => l.ordre === lots_ordres[0]);
      const firstLot = newLots[firstIndex];
      
      if (!firstLot) break;
      
      // Supprimer les lots à fusionner
      const filtered = newLots.filter(l => !lots_ordres.includes(l.ordre));
      
      // Créer le lot fusionné
      const fusionLot: LotGenere = {
        ...firstLot,
        titre: nouveau_titre,
        description: nouvelle_description || '',
        cout_estime: cout_estime,
        duree_estimee_heures: duree_estimee_heures
      };
      
      filtered.splice(firstIndex, 0, fusionLot);
      filtered.forEach((lot, idx) => lot.ordre = idx + 1);
      return filtered;
    }
    
    // ========== DÉCOUPER UN LOT ==========
    case 'decouper_lot': {
      const { lot_ordre, nouveaux_lots } = action.params;
      const index = newLots.findIndex(l => l.ordre === lot_ordre);
      
      if (index === -1) break;
      
      // Supprimer l'ancien lot
      newLots.splice(index, 1);
      
      // Insérer les nouveaux
      const newSubLots: LotGenere[] = nouveaux_lots.map((nl: any) => ({
        ordre: 0,
        titre: nl.titre,
        description: nl.description || '',
        code_expertise: nl.code_expertise || 'generaliste',
        niveau_requis: nl.niveau_requis || 'intermediaire',
        duree_estimee_heures: nl.duree_estimee_heures || 0,
        cout_estime: nl.cout_estime || 0,
        prerequis_stricts: [],
        points_attention: nl.points_attention,
        dependances_type: 'sequentiel'
      }));
      
      newLots.splice(index, 0, ...newSubLots);
      newLots.forEach((lot, idx) => lot.ordre = idx + 1);
      break;
    }
    
    // ========== AJUSTER LE BUDGET GLOBAL ==========
    case 'ajuster_budget_global': {
      const { budget_cible } = action.params;
      const budgetActuel = newLots.reduce((sum, l) => sum + (l.cout_estime || 0), 0);
      
      if (budgetActuel > 0) {
        const ratio = budget_cible / budgetActuel;
        newLots.forEach(lot => {
          lot.cout_estime = Math.round((lot.cout_estime || 0) * ratio);
        });
      }
      break;
    }
  }
  
  return newLots;
}

// ==================== SAUVEGARDE FORÇAGES ====================

/**
 * Sauvegarde un forçage dans le champ JSONB du lot concerné
 * @param chantierId - ID du chantier
 * @param lotOrdre - Numéro d'ordre du lot
 * @param forcage - Données du forçage
 */
export async function saveForcage(
  chantierId: string,
  lotOrdre: number,
  forcage: Forcage
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Récupérer le lot concerné
    const { data: lot, error: fetchError } = await supabase
      .from('travaux')
      .select('id, forcages')
      .eq('chantier_id', chantierId)
      .eq('ordre', lotOrdre)
      .eq('niveau', 'lot')
      .single();

    if (fetchError || !lot) {
      console.error('Lot non trouvé pour forçage:', lotOrdre);
      return { success: false, error: 'Lot non trouvé' };
    }

    // 2. Préparer le forçage enrichi
    const forcageEnregistre: ForcageEnregistre = {
      ...forcage,
      date: new Date().toISOString(),
      confirme_par_utilisateur: true
    };

    // 3. Récupérer les forçages existants ou initialiser
    const forcagesExistants = lot.forcages?.forcages || [];
    
    // 4. Ajouter le nouveau forçage
    const nouveauxForcages = {
      forcages: [...forcagesExistants, forcageEnregistre]
    };

    // 5. Mettre à jour le lot
    const { error: updateError } = await supabase
      .from('travaux')
      .update({ 
        forcages: nouveauxForcages,
        updated_at: new Date().toISOString()
      })
      .eq('id', lot.id);

    if (updateError) {
      console.error('Erreur sauvegarde forçage:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ Forçage enregistré pour lot', lotOrdre, ':', forcage.type);
    return { success: true };

  } catch (err) {
    console.error('Erreur saveForcage:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

/**
 * Sauvegarde un forçage en extrayant le lot_ordre depuis les params de l'action
 * Fonction helper pour appel direct après application d'une action
 */
export async function saveForcageFromAction(
  chantierId: string,
  action: PhasageAction
): Promise<{ success: boolean; error?: string }> {
  if (!action.forcage) {
    return { success: true }; // Pas de forçage à sauvegarder
  }

  // Extraire le lot_ordre selon le type d'action
  let lotOrdre: number | null = null;

  switch (action.action) {
    case 'modifier_lot':
    case 'supprimer_lot':
    case 'deplacer_lot':
    case 'decouper_lot':
      lotOrdre = action.params.lot_ordre;
      break;
    case 'ajouter_lot':
      lotOrdre = action.params.position;
      break;
    case 'fusionner_lots':
      lotOrdre = action.params.lots_ordres?.[0];
      break;
  }

  if (!lotOrdre) {
    console.warn('Impossible de déterminer le lot_ordre pour le forçage');
    return { success: false, error: 'lot_ordre non déterminé' };
  }

  return saveForcage(chantierId, lotOrdre, action.forcage);
}

// ==================== EVENT HELPERS ====================

/**
 * Déclenche un événement d'action phasage
 * Utilisé par ChatInterface pour communiquer avec la page phasage
 */
export function dispatchPhasageAction(action: PhasageAction): void {
  window.dispatchEvent(new CustomEvent('phasageAction', { detail: action }));
  console.log('📤 Event phasageAction dispatché:', action);
}

/**
 * Type pour le listener d'événement
 */
export type PhasageActionHandler = (action: PhasageAction) => void;

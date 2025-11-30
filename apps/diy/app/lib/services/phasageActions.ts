/**
 * phasageActions.ts
 * 
 * Gestion des actions IA sur le phasage
 * Permet à l'assistant de modifier les lots en temps réel
 * 
 * @version 1.0
 * @date 30 novembre 2025
 */

// ==================== TYPES ====================

export type PhasageActionType = 
  | 'modifier_lot'
  | 'ajouter_lot'
  | 'supprimer_lot'
  | 'deplacer_lot'
  | 'fusionner_lots'
  | 'decouper_lot'
  | 'ajuster_budget_global';

export interface PhasageAction {
  action: PhasageActionType;
  params: Record<string, any>;
  message: string;  // Explication pour le bricoleur
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
 * Extrait une action phasage d'une réponse IA
 * Cherche un bloc JSON avec "phasage_action"
 */
export function extractPhasageAction(content: string): {
  hasAction: boolean;
  action: PhasageAction | null;
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
        
        console.log('✅ Action phasage détectée:', parsed.phasage_action);
        
        return {
          hasAction: true,
          action: parsed.phasage_action as PhasageAction,
          cleanContent
        };
      }
    }
    
    return { hasAction: false, action: null, cleanContent: content };
  } catch (error) {
    console.error('Erreur parsing action phasage:', error);
    return { hasAction: false, action: null, cleanContent: content };
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

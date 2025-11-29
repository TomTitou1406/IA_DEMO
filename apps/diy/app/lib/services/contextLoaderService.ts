/**
 * contextLoaderService.ts
 * 
 * Service de chargement du contexte hiérarchique pour l'assistant IA
 * Stratégie "Zoom progressif" : compact pour les parents, détaillé pour le niveau courant
 * Inclut le journal de chantier (décisions, problèmes, points attention)
 * 
 * @version 1.4
 * @date 27 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';
import { getUserId, getConversationByChantier, type Journal } from './conversationService';

// ==================== TYPES ====================

export type NavigationLevel = 'home' | 'chantiers' | 'chantier_edit' | 'lots' | 'etapes' | 'taches';

export interface NavigationIds {
  chantierId?: string;
  travailId?: string;
  etapeId?: string;
}

export interface HeaderInfo {
  /** Ligne 1 : Titre du niveau actuel (gras) */
  title: string;
  
  /** Ligne 2 : Arborescence (ex: "Chantier/Lot >> 5 étapes") */
  breadcrumb: string;
  
  /** Ligne 3 : Expertise avec icône */
  expertiseLine: string;
}

export interface ContextData {
  level: NavigationLevel;
  
  // Header info (3 lignes)
  header: HeaderInfo;
  
  // Expertise
  expertiseCode: string;
  expertiseNom: string;
  expertiseIcon: string;
  
  // Counts
  itemCount: number;
  
  // IDs pour la conversation
  chantierId?: string;
  travailId?: string;
  etapeId?: string;
  
  // Contexte formaté pour l'IA
  contextForAI: string;
  
  // Journal de chantier (si disponible)
  journal?: Journal;
  
  // Données brutes (si besoin)
  raw?: {
    chantier?: any;
    lots?: any[];
    lotCourant?: any;
    etapes?: any[];
    etapeCourante?: any;
    taches?: any[];
  };
}

// ==================== HELPERS ====================

const EXPERTISE_ICONS: Record<string, string> = {
  generaliste: '🏠',
  chef_chantier: '📋',
  electricien: '⚡',
  plombier: '💧',
  plaquiste: '🧱',
  peintre: '🎨',
  menuisier: '🪚',
  carreleur: '🔲',
  macon: '🧱',
  couvreur: '🏠',
  chauffagiste: '🔥',
  climaticien: '❄️',
  serrurier: '🔑',
  vitrier: '🪟',
  isolation: '🧤',
  formateur: '🎓',
  economiste: '📊',
  demolition: '🔨'
};

function getExpertiseIcon(code: string): string {
  return EXPERTISE_ICONS[code?.toLowerCase()] || '🔧';
}

function getStatutEmoji(statut: string): string {
  switch (statut?.toLowerCase()) {
    case 'termine':
    case 'terminé':
    case 'terminee':
    case 'terminée':
      return '✅';
    case 'en_cours':
    case 'en cours':
      return '🔄';
    case 'bloque':
    case 'bloqué':
      return '🚫';
    default:
      return '⏳';
  }
}

function formatDuree(minutes?: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

/**
 * Formate le journal pour l'inclure dans le contexte IA
 */
function formatJournalForAI(journal?: Journal): string {
  if (!journal) return '';
  
  const sections: string[] = [];
  
  // Décisions prises
  if (journal.decisions && journal.decisions.length > 0) {
    const decisionsText = journal.decisions
      .slice(-5) // 5 dernières décisions
      .map(d => `• ${d.description}${d.type ? ` (${d.type})` : ''}`)
      .join('\n   ');
    sections.push(`📝 DÉCISIONS PRISES :\n   ${decisionsText}`);
  }
  
  // Problèmes résolus
  if (journal.problemes_resolus && journal.problemes_resolus.length > 0) {
    const problemesText = journal.problemes_resolus
      .slice(-3) // 3 derniers problèmes
      .map(p => `• ${p.probleme} → ${p.solution}`)
      .join('\n   ');
    sections.push(`🔧 PROBLÈMES RÉSOLUS :\n   ${problemesText}`);
  }
  
  // Points d'attention
  if (journal.points_attention && journal.points_attention.length > 0) {
    const pointsText = journal.points_attention
      .slice(-5) // 5 derniers points
      .map(p => `• ${p}`)
      .join('\n   ');
    sections.push(`⚠️ POINTS D'ATTENTION :\n   ${pointsText}`);
  }
  
  // Préférences bricoleur
  const prefs = journal.preferences_bricoleur;
  if (prefs && Object.keys(prefs).length > 0) {
    const prefsLines: string[] = [];
    if (prefs.niveau) prefsLines.push(`Niveau : ${prefs.niveau}`);
    if (prefs.disponibilites) prefsLines.push(`Disponibilités : ${prefs.disponibilites}`);
    if (prefs.outillage?.length) prefsLines.push(`Outillage : ${prefs.outillage.join(', ')}`);
    if (prefs.notes) prefsLines.push(`Notes : ${prefs.notes}`);
    
    if (prefsLines.length > 0) {
      sections.push(`👤 PROFIL BRICOLEUR :\n   ${prefsLines.join('\n   ')}`);
    }
  }
  
  // Résumé de conversation
  if (journal.resume_conversation) {
    sections.push(`📋 RÉSUMÉ DISCUSSION PRÉCÉDENTE :\n   ${journal.resume_conversation}`);
  }
  
  return sections.length > 0 ? '\n\n' + sections.join('\n\n') : '';
}

/**
 * Charge le journal depuis la conversation du chantier
 */
async function loadJournalForChantier(chantierId: string): Promise<Journal | undefined> {
  try {
    const userId = getUserId();
    const conversation = await getConversationByChantier(userId, chantierId);
    return conversation?.journal;
  } catch (error) {
    console.error('Erreur chargement journal:', error);
    return undefined;
  }
}

// ==================== LOADERS ====================

/**
 * Charge le contexte pour la page Liste Chantiers
 */
async function loadChantiersContext(): Promise<ContextData> {
  return {
    level: 'chantiers',
    header: {
      title: 'Mes projets',
      breadcrumb: '',
      expertiseLine: '📋 Chef de chantier'
    },
    expertiseCode: 'chef_chantier',
    expertiseNom: 'Chef de chantier',
    expertiseIcon: '📋',
    itemCount: 0,
    contextForAI: `Tu es le Chef de chantier de l'utilisateur. Tu l'aides à gérer ses projets de bricolage : création de chantiers, organisation, priorisation. Tu as une vision globale de tous ses projets.`
  };
}

/**
 * Charge le contexte pour la page Lots d'un chantier
 */
async function loadLotsContext(chantierId: string): Promise<ContextData> {
  try {
    // Charger le chantier
    const { data: chantier, error: chantierError } = await supabase
      .from('chantiers')
      .select('id, titre, description, statut, progression')
      .eq('id', chantierId)
      .single();

    if (chantierError) throw chantierError;

    // Charger les lots (travaux) - utilise "ordre"
    const { data: lots, error: lotsError } = await supabase
      .from('travaux')
      .select(`
        id, titre, description, ordre, statut, progression,
        expertise:expertises(code, nom)
      `)
      .eq('chantier_id', chantierId)
      .order('ordre', { ascending: true });

    if (lotsError) throw lotsError;

    // Charger le journal
    const journal = await loadJournalForChantier(chantierId);

    const nbLots = lots?.length || 0;

    // Formater le contexte compact
    const lotsFormatted = (lots || []).map((lot: any, idx: number) => {
      const statut = getStatutEmoji(lot.statut);
      const expertise = lot.expertise?.[0]?.nom || 'Général';
      const progression = lot.progression || 0;
      return `${idx + 1}. ${statut} ${lot.titre} (${expertise}) - ${progression}%`;
    }).join('\n   ');

    const journalText = formatJournalForAI(journal);

    const contextForAI = `
🏗️ CHANTIER : ${chantier.titre}
   ${chantier.description || 'Pas de description'}
   Avancement : ${chantier.progression || 0}%

📦 LOTS À RÉALISER (${nbLots}) :
   ${lotsFormatted || 'Aucun lot défini'}
${journalText}
TON RÔLE : Tu es le Chef de chantier. Tu aides à organiser les lots, définir les priorités, identifier les dépendances entre lots. Tu as la vision globale du projet. Tu te souviens des décisions prises et des problèmes rencontrés.
`.trim();

    return {
      level: 'lots',
      header: {
        title: chantier.titre,
        breadcrumb: `Chantier >> ${nbLots} lots`,
        expertiseLine: '📋 Chef de chantier'
      },
      expertiseCode: 'chef_chantier',
      expertiseNom: 'Chef de chantier',
      expertiseIcon: '📋',
      itemCount: nbLots,
      chantierId,
      contextForAI,
      journal,
      raw: { chantier, lots: lots || undefined }
    };

  } catch (error) {
    console.error('Erreur chargement contexte lots:', error);
    return loadChantiersContext(); // Fallback
  }
}

/**
 * Charge le contexte DONNÉES pour la page Création/Édition d'un chantier
 * Retourne uniquement les données formatées, pas les instructions comportementales
 */
async function loadChantierEditContext(chantierId?: string): Promise<ContextData> {
  const isCreation = !chantierId || chantierId === 'nouveau';
  
  if (isCreation) {
    // ==================== MODE CRÉATION ====================
    return {
      level: 'chantier_edit',
      header: {
        title: 'Nouveau chantier',
        breadcrumb: 'Création assistée par IA',
        expertiseLine: '📋 Chef de chantier & Économiste'
      },
      expertiseCode: 'chef_chantier',
      expertiseNom: 'Chef de chantier',
      expertiseIcon: '📋',
      itemCount: 0,
      contextForAI: `## DONNÉES DU CHANTIER

Mode : CRÉATION (nouveau chantier)
Aucune donnée existante.`
    };
  }
  
  // ==================== MODE ÉDITION / VISUALISATION ====================
  try {
    const { data: chantier, error } = await supabase
      .from('chantiers')
      .select('id, titre, description, statut, progression, budget_initial, duree_estimee_heures, metadata')
      .eq('id', chantierId)
      .single();

    if (error) throw error;

    // Charger les lots existants
    const { data: lots } = await supabase
      .from('travaux')
      .select('id, titre, ordre, statut, code_expertise')
      .eq('chantier_id', chantierId)
      .order('ordre', { ascending: true });

    // Charger les notes épinglées du chantier
    const { data: notes } = await supabase
      .from('notes')
      .select('contenu, source, created_at')
      .eq('level', 'chantier')
      .eq('level_id', chantierId)
      .order('created_at', { ascending: false })
      .limit(10);

    const nbLots = lots?.length || 0;
    const lotsFormatted = (lots || []).map((lot: any, idx: number) => 
      `${idx + 1}. ${getStatutEmoji(lot.statut)} ${lot.titre}`
    ).join('\n   ');

    // Charger le journal si existant
    const journal = await loadJournalForChantier(chantierId);
    const journalText = formatJournalForAI(journal);

    // Extraire TOUS les metadata
    const meta = chantier.metadata || {};
    
    // ==================== CONSTRUIRE LE CONTEXTE DONNÉES ====================
    let contextForAI = `## DONNÉES ACTUELLES DU CHANTIER\n\n`;
    
    // Infos générales
    contextForAI += `**Titre :** ${chantier.titre || 'Non défini'}\n`;
    contextForAI += `**Description :** ${chantier.description || 'Non définie'}\n`;
    contextForAI += `**Statut :** ${chantier.statut || 'nouveau'}\n`;
    contextForAI += `**Progression :** ${chantier.progression || 0}%\n\n`;
    
    // Caractéristiques
    if (meta.surface_m2) contextForAI += `**Surface :** ${meta.surface_m2} m²\n`;
    if (meta.style_souhaite) contextForAI += `**Style :** ${meta.style_souhaite}\n`;
    
    // Budget & Planning
    const budget = chantier.budget_initial || meta.budget_max;
    if (budget) {
      contextForAI += `**Budget :** ${budget}€ ${meta.budget_inclut_materiaux ? '(matériaux inclus)' : '(hors matériaux)'}\n`;
    }
    if (meta.disponibilite_heures_semaine) {
      contextForAI += `**Disponibilité :** ${meta.disponibilite_heures_semaine}h/semaine\n`;
    }
    if (meta.deadline_semaines) {
      contextForAI += `**Objectif :** ${meta.deadline_semaines} semaines\n`;
    }
    
    // État existant
    if (meta.etat_existant) {
      contextForAI += `**État existant :** ${meta.etat_existant}\n`;
    }
    
    // Équipements & Éléments
    if (meta.equipements_souhaites && meta.equipements_souhaites.length > 0) {
      contextForAI += `**Équipements à installer :** ${meta.equipements_souhaites.join(', ')}\n`;
    }
    if (meta.elements_a_deposer && meta.elements_a_deposer.length > 0) {
      contextForAI += `**Éléments à déposer :** ${meta.elements_a_deposer.join(', ')}\n`;
    }
    if (meta.elements_a_conserver && meta.elements_a_conserver.length > 0) {
      contextForAI += `**Éléments à conserver :** ${meta.elements_a_conserver.join(', ')}\n`;
    }
    
    // Réseaux
    if (meta.reseaux) {
      const reseauxList = [];
      reseauxList.push(meta.reseaux.electricite_a_refaire ? 'Électricité à refaire' : 'Électricité OK');
      reseauxList.push(meta.reseaux.plomberie_a_refaire ? 'Plomberie à refaire' : 'Plomberie OK');
      reseauxList.push(meta.reseaux.ventilation_a_prevoir ? 'Ventilation à prévoir' : 'Ventilation OK');
      contextForAI += `**Réseaux :** ${reseauxList.join(' | ')}\n`;
    }
    
    // Compétences
    if (meta.competences_ok && meta.competences_ok.length > 0) {
      contextForAI += `**Compétences maîtrisées :** ${meta.competences_ok.join(', ')}\n`;
    }
    if (meta.competences_faibles && meta.competences_faibles.length > 0) {
      contextForAI += `**Compétences faibles :** ${meta.competences_faibles.join(', ')}\n`;
    }
    if (meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0) {
      contextForAI += `**Travaux pro suggérés :** ${meta.travaux_pro_suggeres.join(', ')}\n`;
    }
    
    // Contraintes
    if (meta.contraintes) {
      contextForAI += `**Contraintes :** ${meta.contraintes}\n`;
    }
    
    // Lots
    contextForAI += `\n## LOTS DÉFINIS (${nbLots})\n\n`;
    if (nbLots > 0) {
      contextForAI += `   ${lotsFormatted}\n`;
    } else {
      contextForAI += `   Aucun lot - phasage non encore effectué\n`;
    }
    
    // Notes épinglées
    if (notes && notes.length > 0) {
      contextForAI += `\n## NOTES ÉPINGLÉES\n\n`;
      notes.forEach((n: any) => {
        contextForAI += `   📌 ${n.contenu}\n`;
      });
    }
    
    // Journal
    if (journalText) {
      contextForAI += `\n## JOURNAL\n${journalText}`;
    }

    return {
      level: 'chantier_edit',
      header: {
        title: chantier.titre || 'Mon chantier',
        breadcrumb: nbLots > 0 ? `${nbLots} lot(s) défini(s)` : 'Phasage à lancer',
        expertiseLine: '📋 Chef de chantier'
      },
      expertiseCode: 'chef_chantier',
      expertiseNom: 'Chef de chantier',
      expertiseIcon: '📋',
      itemCount: nbLots,
      chantierId,
      contextForAI,
      journal,
      raw: { chantier, lots: lots || [] }
    };

  } catch (error) {
    console.error('Erreur chargement chantier pour édition:', error);
    return loadChantierEditContext(undefined);
  }
}

/**
 * Charge le contexte pour la page Étapes d'un lot
 */
async function loadEtapesContext(chantierId: string, travailId: string): Promise<ContextData> {
  try {
    // Charger le chantier (compact)
    const { data: chantier } = await supabase
      .from('chantiers')
      .select('id, titre, progression')
      .eq('id', chantierId)
      .single();

    // Charger tous les lots (compact) - utilise "ordre"
    const { data: lots } = await supabase
      .from('travaux')
      .select(`id, titre, ordre, statut, expertise:expertises(code, nom)`)
      .eq('chantier_id', chantierId)
      .order('ordre', { ascending: true });

    // Charger le lot courant (détaillé)
   const { data: lotCourant } = await supabase
      .from('travaux')
      .select(`id, titre, description, progression, statut, expertise:expertises(code, nom)`)
      .eq('id', travailId)
      .single();

    // Charger les étapes du lot - utilise "numero"
    const { data: etapes } = await supabase
      .from('etapes')
      .select('id, titre, description, numero, statut, progression, duree_estimee_minutes, difficulte')
      .eq('travail_id', travailId)
      .order('numero', { ascending: true });
    // DEBUG : voir ce que Supabase retourne
    console.log('📊 ÉTAPES BRUTES SUPABASE:', JSON.stringify(etapes?.map(e => ({ 
      titre: e.titre, 
      statut: e.statut,
      progression: e.progression 
    }))));

    // Charger le journal
    const journal = await loadJournalForChantier(chantierId);

    const nbEtapes = etapes?.length || 0;

    // Formater lots compact (une ligne)
    const lotsCompact = (lots || []).map((lot: any) => {
      const isCurrent = lot.id === travailId;
      const emoji = getStatutEmoji(lot.statut);
      return isCurrent ? `[${emoji} ${lot.titre}]` : `${emoji} ${lot.titre}`;
    }).join(' → ');

    // Formater étapes (détaillées)
   const etapesFormatted = (etapes || []).map((etape: any) => {
      const statut = getStatutEmoji(etape.statut);
      const duree = formatDuree(etape.duree_estimee_minutes);
      const difficulte = etape.difficulte ? `[${etape.difficulte}]` : '';
      const progression = etape.progression || 0;
      let line = `${etape.numero}. ${statut} ${etape.titre} ${difficulte} (${duree}) - ${progression}%`;
      // PAS de description ici pour réduire la taille
      return line;
    }).join('\n   ');

    const expertiseCode = lotCourant?.expertise?.[0]?.code || 'generaliste';
    const expertiseNom = lotCourant?.expertise?.[0]?.nom || 'Généraliste';
    const expertiseIcon = getExpertiseIcon(expertiseCode);

    const journalText = formatJournalForAI(journal);

    const contextForAI = `
🏗️ CHANTIER : ${chantier?.titre || 'Chantier'} (${chantier?.progression || 0}%)

📦 LOTS : ${lotsCompact}

🔌 LOT ACTUEL : ${lotCourant?.titre || 'Lot'} - ${lotCourant?.progression || 0}%
   ${lotCourant?.description || ''}
   Avancement : ${lotCourant?.progression || 0}%

📋 ÉTAPES À RÉALISER (${nbEtapes}) :
   ${etapesFormatted || 'Aucune étape définie'}
${journalText}
TON RÔLE : Tu es l'Expert ${expertiseNom}. Tu guides le bricoleur dans ce lot. Tu connais toutes les étapes et peux donner des conseils sur l'ordre, les dépendances, les points d'attention. Tu te souviens des décisions prises.
`.trim();

    return {
      level: 'etapes',
      header: {
        title: lotCourant?.titre || 'Lot',
        breadcrumb: `Chantier/Lot >> ${nbEtapes} étapes`,
        expertiseLine: `${expertiseIcon} ${expertiseNom}`
      },
      expertiseCode,
      expertiseNom,
      expertiseIcon,
      itemCount: nbEtapes,
      chantierId,
      travailId,
      contextForAI,
      journal,
      raw: { 
        chantier: chantier || undefined, 
        lots: lots || undefined, 
        lotCourant: lotCourant || undefined, 
        etapes: etapes || undefined 
      }
    };

  } catch (error) {
    console.error('Erreur chargement contexte étapes:', error);
    return loadLotsContext(chantierId); // Fallback
  }
}

/**
 * Charge le contexte pour la page Tâches d'une étape
 */
async function loadTachesContext(chantierId: string, travailId: string, etapeId: string): Promise<ContextData> {
  try {
    // Charger le chantier (très compact)
    const { data: chantier } = await supabase
      .from('chantiers')
      .select('id, titre, progression')
      .eq('id', chantierId)
      .single();

    // Charger tous les lots (compact) - utilise "ordre"
    const { data: lots } = await supabase
      .from('travaux')
      .select(`id, titre, ordre, statut, expertise:expertises(code, nom)`)
      .eq('chantier_id', chantierId)
      .order('ordre', { ascending: true });

    // Charger le lot courant
    const { data: lotCourant } = await supabase
      .from('travaux')
      .select(`
        id, titre, description, ordre, statut, progression,
        expertise:expertises(code, nom)
      `)
      .eq('id', travailId)
      .single();

    // Charger toutes les étapes du lot (compact) - utilise "numero"
    const { data: etapes } = await supabase
      .from('etapes')
      .select('id, titre, numero, statut')
      .eq('travail_id', travailId)
      .order('numero', { ascending: true });

    // Charger l'étape courante (détaillée)
    const { data: etapeCourante } = await supabase
      .from('etapes')
      .select('id, titre, description, numero, statut, progression, duree_estimee_minutes')
      .eq('id', etapeId)
      .single();

    // Charger les tâches de l'étape (très détaillées) - utilise "numero"
    const { data: taches } = await supabase
      .from('taches')
      .select('id, titre, description, numero, statut, duree_estimee_minutes, est_critique, outils_necessaires, conseils_pro')
      .eq('etape_id', etapeId)
      .order('numero', { ascending: true });

    // Charger le journal
    const journal = await loadJournalForChantier(chantierId);

    const nbTaches = taches?.length || 0;

    // Formater lots compact (une ligne)
    const lotsCompact = (lots || []).map((lot: any) => {
      const isCurrent = lot.id === travailId;
      const emoji = getStatutEmoji(lot.statut);
      return isCurrent ? `[${emoji} ${lot.titre}]` : `${emoji} ${lot.titre}`;
    }).join(' → ');

    // Formater étapes compact (une ligne)
    const etapesCompact = (etapes || []).map((etape: any) => {
      const isCurrent = etape.id === etapeId;
      const emoji = getStatutEmoji(etape.statut);
      return isCurrent ? `[${emoji} ${etape.titre}]` : `${emoji} ${etape.titre}`;
    }).join(' → ');

    // Formater tâches (détaillées)
    const tachesFormatted = (taches || []).map((tache: any) => {
      const statut = getStatutEmoji(tache.statut);
      const duree = formatDuree(tache.duree_estimee_minutes);
      const critique = tache.est_critique ? '🔥' : '';
      let line = `${tache.numero}. ${statut}${critique} ${tache.titre}`;
      if (duree) {
        line += ` (${duree})`;
      }
      if (tache.description) {
        line += `\n      → ${tache.description}`;
      }
      if (tache.outils_necessaires?.length) {
        const outils = Array.isArray(tache.outils_necessaires) 
          ? tache.outils_necessaires.join(', ')
          : tache.outils_necessaires;
        line += `\n      → Outils : ${outils}`;
      }
      return line;
    }).join('\n   ');

    const expertiseCode = lotCourant?.expertise?.[0]?.code || 'generaliste';
    const expertiseNom = lotCourant?.expertise?.[0]?.nom || 'Généraliste';
    const expertiseIcon = getExpertiseIcon(expertiseCode);

    const journalText = formatJournalForAI(journal);

    const contextForAI = `
🏗️ CHANTIER : ${chantier?.titre || 'Chantier'} (${chantier?.progression || 0}%)

📦 LOTS : ${lotsCompact}

🔌 LOT : ${lotCourant?.titre || 'Lot'} (${expertiseNom}) - ${lotCourant?.progression || 0}%

📋 ÉTAPES : ${etapesCompact}

📍 ÉTAPE ACTUELLE : ${etapeCourante?.titre || 'Étape'} - ${etapeCourante?.progression || 0}%
   ${etapeCourante?.description || ''}

✅ TÂCHES À RÉALISER (${nbTaches}) :
   ${tachesFormatted || 'Aucune tâche définie'}
${journalText}
TON RÔLE : Tu es l'Expert ${expertiseNom}. Tu guides le bricoleur tâche par tâche. Tu donnes des conseils pratiques, techniques de sécurité, et tu connais le contexte global du chantier. Tu te souviens des décisions prises et des problèmes rencontrés.
`.trim();

    return {
      level: 'taches',
      header: {
        title: etapeCourante?.titre || 'Étape',
        breadcrumb: `Chantier/Lot/Étape >> ${nbTaches} tâches`,
        expertiseLine: `${expertiseIcon} ${expertiseNom}`
      },
      expertiseCode,
      expertiseNom,
      expertiseIcon,
      itemCount: nbTaches,
      chantierId,
      travailId,
      etapeId,
      contextForAI,
      journal,
      raw: { 
        chantier: chantier || undefined, 
        lots: lots || undefined, 
        lotCourant: lotCourant || undefined, 
        etapes: etapes || undefined, 
        etapeCourante: etapeCourante || undefined, 
        taches: taches || undefined 
      }
    };

  } catch (error) {
    console.error('Erreur chargement contexte tâches:', error);
    return loadEtapesContext(chantierId, travailId); // Fallback
  }
}

// ==================== PARSER D'URL ====================

/**
 * Parse l'URL pour extraire le niveau et les IDs
 */
export function parseNavigationFromPath(pathname: string): { level: NavigationLevel; ids: NavigationIds } {
  // /chantiers/nouveau (CRÉATION)
  if (pathname === '/chantiers/nouveau') {
    return {
      level: 'chantier_edit',
      ids: { chantierId: 'nouveau' }
    };
  }

  // /chantiers/[id] SANS /travaux (ÉDITION)
  const editMatch = pathname.match(/^\/chantiers\/([^\/]+)$/);
  if (editMatch && editMatch[1] !== 'nouveau') {
    return {
      level: 'chantier_edit',
      ids: { chantierId: editMatch[1] }
    };
  }
  
  // /chantiers/[id]/travaux/[id]/etapes/[id]/taches
  const tachesMatch = pathname.match(/^\/chantiers\/([^\/]+)\/travaux\/([^\/]+)\/etapes\/([^\/]+)\/taches$/);
  if (tachesMatch) {
    return {
      level: 'taches',
      ids: { chantierId: tachesMatch[1], travailId: tachesMatch[2], etapeId: tachesMatch[3] }
    };
  }

  // /chantiers/[id]/travaux/[id]/etapes
  const etapesMatch = pathname.match(/^\/chantiers\/([^\/]+)\/travaux\/([^\/]+)\/etapes$/);
  if (etapesMatch) {
    return {
      level: 'etapes',
      ids: { chantierId: etapesMatch[1], travailId: etapesMatch[2] }
    };
  }

  // /chantiers/[id]/travaux
  const lotsMatch = pathname.match(/^\/chantiers\/([^\/]+)\/travaux$/);
  if (lotsMatch) {
    return {
      level: 'lots',
      ids: { chantierId: lotsMatch[1] }
    };
  }

  // /chantiers
  if (pathname === '/chantiers' || pathname === '/chantiers/') {
    return { level: 'chantiers', ids: {} };
  }

  // Home ou autre
  return { level: 'home', ids: {} };
}

// ==================== FONCTION PRINCIPALE ====================

/**
 * Charge le contexte complet selon l'URL
 */
export async function loadContextForPath(pathname: string): Promise<ContextData> {
  const { level, ids } = parseNavigationFromPath(pathname);

  console.log(`📍 Chargement contexte: niveau=${level}`, ids);

  switch (level) {
    case 'chantier_edit':
      return loadChantierEditContext(ids.chantierId);
      
    case 'taches':
      if (ids.chantierId && ids.travailId && ids.etapeId) {
        return loadTachesContext(ids.chantierId, ids.travailId, ids.etapeId);
      }
      break;

    case 'etapes':
      if (ids.chantierId && ids.travailId) {
        return loadEtapesContext(ids.chantierId, ids.travailId);
      }
      break;

    case 'lots':
      if (ids.chantierId) {
        return loadLotsContext(ids.chantierId);
      }
      break;

    case 'chantiers':
      return loadChantiersContext();
  }

  // Fallback : Home
  return {
    level: 'home',
    header: {
      title: 'Accueil',
      breadcrumb: '',
      expertiseLine: '🏠 Assistant Papibricole'
    },
    expertiseCode: 'generaliste',
    expertiseNom: 'Assistant Papibricole',
    expertiseIcon: '🏠',
    itemCount: 0,
    contextForAI: `Tu es l'assistant Papibricole. Tu aides les bricoleurs à réaliser leurs projets, de la planification à l'exécution. Tu es disponible pour répondre à toutes leurs questions.`
  };
}

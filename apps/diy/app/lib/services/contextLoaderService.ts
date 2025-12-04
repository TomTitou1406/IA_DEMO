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

export type NavigationLevel = 'home' | 'chantiers' | 'chantier_edit' | 'phasage' | 'mise_en_oeuvre' | 'lots' | 'etapes' | 'taches';

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
  
  // Source du prompt (pour afficher warning si fallback)
  promptSource?: 'database' | 'fallback';
  promptError?: string;
  
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
 * AMÉLIORÉ : Charge maintenant la liste des chantiers avec leurs stats
 */
async function loadChantiersContext(): Promise<ContextData> {
  try {
    // Charger tous les chantiers de l'utilisateur
    const { data: chantiers, error } = await supabase
      .from('chantiers')
      .select('id, titre, description, statut, progression, budget_initial, duree_estimee_heures')
      .eq('est_supprime', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const nbChantiers = chantiers?.length || 0;
    
    // Compter par statut
    const nouveaux = chantiers?.filter(c => c.statut === 'nouveau').length || 0;
    const enCours = chantiers?.filter(c => c.statut === 'en_cours' || c.statut === 'actif' || !c.statut).length || 0;
    const termines = chantiers?.filter(c => c.statut === 'terminé').length || 0;

    // Formater les chantiers pour l'IA
    const chantiersFormatted = (chantiers || []).map((c: any, idx: number) => {
      const statut = c.statut === 'nouveau' ? '✨' : 
                     c.statut === 'terminé' ? '✅' : '🔨';
      const progression = c.progression || 0;
      const budget = c.budget_initial ? `${c.budget_initial.toLocaleString()}€` : '';
      return `${idx + 1}. ${statut} ${c.titre} - ${progression}% ${budget}`;
    }).join('\n   ');

    const contextForAI = `
📊 VUE D'ENSEMBLE DE TES CHANTIERS

Tu as ${nbChantiers} chantier${nbChantiers > 1 ? 's' : ''} :
- ${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''} (à configurer)
- ${enCours} en cours
- ${termines} terminé${termines > 1 ? 's' : ''}

📋 LISTE DES CHANTIERS :
   ${chantiersFormatted || 'Aucun chantier créé'}

TON RÔLE : Tu es le Chef de chantier de l'utilisateur. Tu l'aides à :
- Choisir quel chantier prioriser
- Comprendre l'état d'avancement global
- Créer un nouveau chantier si besoin
- Naviguer vers le bon chantier selon ses besoins
`.trim();

    return {
      level: 'chantiers',
      header: {
        title: 'Mes chantiers',
        breadcrumb: `${nbChantiers} chantier${nbChantiers > 1 ? 's' : ''} • ${enCours} en cours`,
        expertiseLine: '📋 Chef de chantier'
      },
      expertiseCode: 'chef_chantier',
      expertiseNom: 'Chef de chantier',
      expertiseIcon: '📋',
      itemCount: nbChantiers,
      contextForAI,
    };

  } catch (error) {
    console.error('Erreur chargement contexte chantiers:', error);
    // Fallback minimal
    return {
      level: 'chantiers',
      header: {
        title: 'Mes chantiers',
        breadcrumb: '',
        expertiseLine: '📋 Chef de chantier'
      },
      expertiseCode: 'chef_chantier',
      expertiseNom: 'Chef de chantier',
      expertiseIcon: '📋',
      itemCount: 0,
      contextForAI: `Tu es le Chef de chantier. Tu aides l'utilisateur à gérer ses projets de bricolage.`
    };
  }
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

   // Charger le lot courant
    const { data: lotCourant } = await supabase
      .from('travaux')
      .select('id, titre, description, ordre, statut, progression, code_expertise')
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

    const expertiseCode = lotCourant?.code_expertise || 'generaliste';
    const expertiseNom = formatExpertiseName(expertiseCode);
    const expertiseIcon = getExpertiseIcon(expertiseCode);

    /**
 * Formate le nom d'expertise proprement
 * electricien -> Électricien
 * plombier -> Plombier
 * generaliste -> Généraliste
 */
function formatExpertiseName(code: string): string {
  if (!code) return 'Généraliste';
  
  const EXPERTISE_NAMES: Record<string, string> = {
    'generaliste': 'Généraliste',
    'chef_chantier': 'Chef de chantier',
    'electricien': 'Électricien',
    'plombier': 'Plombier',
    'plaquiste': 'Plaquiste',
    'peintre': 'Peintre',
    'menuisier': 'Menuisier',
    'carreleur': 'Carreleur',
    'macon': 'Maçon',
    'couvreur': 'Couvreur',
    'chauffagiste': 'Chauffagiste',
    'climaticien': 'Climaticien',
    'serrurier': 'Serrurier',
    'vitrier': 'Vitrier',
    'isolation': 'Spécialiste isolation',
    'demolition': 'Spécialiste démolition',
    'formateur': 'Formateur',
    'economiste': 'Économiste'
  };
  
  return EXPERTISE_NAMES[code.toLowerCase()] || 
         code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ');
}

    
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
 * Charge le contexte pour la page Phasage d'un chantier
 */
async function loadPhasageContext(chantierId: string): Promise<ContextData> {
  try {
    // Charger le chantier avec metadata
    const { data: chantier, error: chantierError } = await supabase
      .from('chantiers')
      .select('id, titre, description, statut, budget_initial, metadata')
      .eq('id', chantierId)
      .single();

    if (chantierError) throw chantierError;

    // Charger les lots brouillon existants
    const { data: lotsBrouillon } = await supabase
      .from('travaux')
      .select('id, titre, ordre, statut, code_expertise, cout_estime, duree_estimee_heures, description, points_attention')
      .eq('chantier_id', chantierId)
      .eq('statut', 'brouillon')
      .order('ordre', { ascending: true });

    // Charger les règles de phasage
    const { data: regles } = await supabase
      .from('regles_phasage')
      .select('code, titre, type_regle, message_ia')
      .eq('est_active', true)
      .order('priorite', { ascending: true });

    // Charger le prompt depuis prompts_library
    const { data: promptData } = await supabase
      .from('prompts_library')
      .select('prompt_text, temperature, max_tokens, model')
      .eq('code', 'phasage_assistant_actions')
      .eq('est_actif', true)
      .single();

    const meta = chantier.metadata || {};
    const nbLotsBrouillon = lotsBrouillon?.length || 0;

    // Formater les infos du chantier
    let chantierInfo = `🏗️ CHANTIER : ${chantier.titre}\n`;
    chantierInfo += `   ${chantier.description || 'Pas de description'}\n`;
    if (chantier.budget_initial) chantierInfo += `   Budget : ${chantier.budget_initial}€\n`;
    if (meta.surface_m2) chantierInfo += `   Surface : ${meta.surface_m2} m²\n`;
    if (meta.style_souhaite) chantierInfo += `   Style : ${meta.style_souhaite}\n`;
    
    // Équipements souhaités
    if (meta.equipements_souhaites?.length) {
      chantierInfo += `   Équipements à installer : ${meta.equipements_souhaites.join(', ')}\n`;
    }
    
    // Éléments à déposer
    if (meta.elements_a_deposer?.length) {
      chantierInfo += `   À déposer : ${meta.elements_a_deposer.join(', ')}\n`;
    }
    
    // Réseaux
    if (meta.reseaux) {
      const reseauxList = [];
      if (meta.reseaux.electricite_a_refaire) reseauxList.push('Électricité');
      if (meta.reseaux.plomberie_a_refaire) reseauxList.push('Plomberie');
      if (meta.reseaux.ventilation_a_prevoir) reseauxList.push('Ventilation');
      if (reseauxList.length) chantierInfo += `   Réseaux à refaire : ${reseauxList.join(', ')}\n`;
    }
    
    // Compétences du bricoleur
    if (meta.competences_ok?.length) {
      chantierInfo += `   Compétences maîtrisées : ${meta.competences_ok.join(', ')}\n`;
    }
    if (meta.competences_faibles?.length) {
      chantierInfo += `   Compétences faibles : ${meta.competences_faibles.join(', ')}\n`;
    }

    // Formater les lots brouillon actuels (avec description et points_attention)
    let lotsBrouillonInfo = '';
    if (nbLotsBrouillon > 0) {
      const lotsFormatted = (lotsBrouillon || []).map((lot: any) => {
        let line = `   ${lot.ordre}. ${lot.titre} (${lot.code_expertise || 'général'}) - ${lot.cout_estime || 0}€ - ${lot.duree_estimee_heures || 0}h`;
        if (lot.description) line += `\n      Description: ${lot.description}`;
        if (lot.points_attention) line += `\n      ⚠️ ${lot.points_attention}`;
        return line;
      }).join('\n');
      lotsBrouillonInfo = `\n📦 LOTS PROPOSÉS (${nbLotsBrouillon}) :\n${lotsFormatted}`;
    }

    // Formater les règles importantes
    let reglesInfo = '';
    if (regles && regles.length > 0) {
      const reglesFormatted = regles
        .filter((r: any) => r.type_regle === 'dependance' || r.type_regle === 'interdit')
        .slice(0, 10)
        .map((r: any) => `   • ${r.message_ia || r.titre}`)
        .join('\n');
      reglesInfo = `\n📏 RÈGLES DE PHASAGE À RESPECTER :\n${reglesFormatted}`;
    }

    // Construire le contexte : données chantier + prompt instructions
    const promptInstructions = promptData?.prompt_text || getDefaultPhasagePrompt();
    
    const contextForAI = `
${chantierInfo}
${lotsBrouillonInfo}
${reglesInfo}

${promptInstructions}
`.trim();

    return {
      level: 'phasage',
      header: {
        title: `Phasage : ${chantier.titre}`,
        breadcrumb: nbLotsBrouillon > 0 ? `${nbLotsBrouillon} lots proposés` : 'Génération en cours...',
        expertiseLine: '📋 Assistant Phasage'
      },
      expertiseCode: 'chef_chantier',
      expertiseNom: 'Assistant Phasage',
      expertiseIcon: '📋',
      itemCount: nbLotsBrouillon,
      chantierId,
      contextForAI,
      raw: {
        chantier,
        lots: lotsBrouillon || undefined
      }
    };

  } catch (error) {
    console.error('Erreur chargement contexte phasage:', error);
    return loadChantiersContext(); // Fallback
  }
}

/**
 * Charge le contexte pour la page Mise en Oeuvre (génération des étapes)
 */
async function loadMiseEnOeuvreContext(chantierId: string, travailId: string): Promise<ContextData> {
  try {
    console.log('🔧 loadMiseEnOeuvreContext APPELÉE - chantierId:', chantierId, 'travailId:', travailId);
    // Charger le chantier
    const { data: chantier } = await supabase
      .from('chantiers')
      .select('id, titre, metadata')
      .eq('id', chantierId)
      .single();

    // Charger le lot courant
    const { data: lot } = await supabase
      .from('travaux')
      .select('id, titre, description, code_expertise, duree_estimee_heures, points_attention')
      .eq('id', travailId)
      .single();

    // Charger les étapes existantes (brouillon ou validées)
    const { data: etapes } = await supabase
      .from('etapes')
      .select('id, numero, titre, statut, duree_estimee_minutes, difficulte')
      .eq('travail_id', travailId)
      .order('numero', { ascending: true });

    // Charger le prompt depuis prompts_library
    const { data: promptData } = await supabase
      .from('prompts_library')
      .select('prompt_text, temperature, max_tokens, model')
      .eq('code', 'etapes_assistant_actions')
      .eq('est_actif', true)
      .single();

    // Charger les règles d'étapes (générales + spécifiques à l'expertise)
    const expertiseCode = lot?.code_expertise || 'generaliste';
    
    // Charger les règles générales (code_expertise = NULL)
    const { data: reglesGenerales } = await supabase
      .from('regles_etapes')
      .select('code, titre, type_regle, message_ia, priorite')
      .eq('est_active', true)
      .is('code_expertise', null);

    // Charger les règles spécifiques à l'expertise
    const { data: reglesExpertise } = await supabase
      .from('regles_etapes')
      .select('code, titre, type_regle, message_ia, priorite')
      .eq('est_active', true)
      .eq('code_expertise', expertiseCode);

    // Fusionner et trier par priorité
    const regles = [...(reglesGenerales || []), ...(reglesExpertise || [])]
      .sort((a, b) => (a.priorite || 100) - (b.priorite || 100));
    
    console.log(`📏 ${regles.length} règles chargées pour expertise: ${expertiseCode}`);

    const nbEtapes = etapes?.length || 0;
    const expertiseIcon = getExpertiseIcon(expertiseCode);
    const meta = chantier?.metadata || {};

    // Formater les infos du chantier (compact)
    let chantierInfo = `🏗️ CHANTIER : ${chantier?.titre || 'Chantier'}`;
    if (meta.surface_m2) chantierInfo += ` (${meta.surface_m2} m²)`;

    // Formater les infos du lot
    let lotInfo = `\n🔧 LOT : ${lot?.titre || 'Lot'}`;
    lotInfo += `\n   ${lot?.description || ''}`;
    lotInfo += `\n   Expertise : ${expertiseCode}`;
    lotInfo += `\n   Durée estimée : ${lot?.duree_estimee_heures || 0}h`;
    if (lot?.points_attention) {
      lotInfo += `\n   ⚠️ ${lot.points_attention}`;
    }

    // Formater les étapes actuelles
    let etapesInfo = '';
    if (nbEtapes > 0) {
      const etapesFormatted = (etapes || []).map((e: any) => {
        const duree = e.duree_estimee_minutes ? `${e.duree_estimee_minutes}min` : '';
        const diff = e.difficulte ? `[${e.difficulte}]` : '';
        return `   ${e.numero}. ${e.titre} ${duree} ${diff}`;
      }).join('\n');
      etapesInfo = `\n📋 ÉTAPES ACTUELLES (${nbEtapes}) :\n${etapesFormatted}`;
    } else {
      etapesInfo = '\n📋 ÉTAPES ACTUELLES (0) :\n   Aucune étape générée';
    }

    // Formater les règles métier
    let reglesInfo = '';
    if (regles && regles.length > 0) {
      const reglesSecurite = regles.filter((r: any) => r.type_regle === 'securite');
      const reglesOrdre = regles.filter((r: any) => r.type_regle === 'ordre');
      const reglesInterdit = regles.filter((r: any) => r.type_regle === 'interdit');
      const reglesConseil = regles.filter((r: any) => r.type_regle === 'conseil');

      reglesInfo = '\n\n📏 RÈGLES MÉTIER À RESPECTER :';
      
      if (reglesSecurite.length > 0) {
        reglesInfo += '\n🔴 SÉCURITÉ (obligatoire) :';
        reglesSecurite.forEach((r: any) => {
          reglesInfo += `\n   • ${r.message_ia}`;
        });
      }
      
      if (reglesInterdit.length > 0) {
        reglesInfo += '\n⛔ INTERDICTIONS :';
        reglesInterdit.forEach((r: any) => {
          reglesInfo += `\n   • ${r.message_ia}`;
        });
      }
      
      if (reglesOrdre.length > 0) {
        reglesInfo += '\n🔢 ORDRE DES ÉTAPES :';
        reglesOrdre.forEach((r: any) => {
          reglesInfo += `\n   • ${r.message_ia}`;
        });
      }
      
      if (reglesConseil.length > 0) {
        reglesInfo += '\n💡 CONSEILS PRO :';
        reglesConseil.forEach((r: any) => {
          reglesInfo += `\n   • ${r.message_ia}`;
        });
      }
    }

    // Construire le contexte : données + règles + prompt instructions
    const promptInstructions = promptData?.prompt_text || getDefaultMiseEnOeuvrePrompt();

    const contextForAI = `
${chantierInfo}
${lotInfo}
${etapesInfo}
${reglesInfo}

${promptInstructions}
`.trim();

    return {
      level: 'mise_en_oeuvre',
      header: {
        title: `Mise en œuvre : ${lot?.titre || 'Lot'}`,
        breadcrumb: `${chantier?.titre || 'Chantier'} >> ${nbEtapes} étapes`,
        expertiseLine: `${expertiseIcon} ${expertiseCode}`
      },
      expertiseCode,
      expertiseNom: expertiseCode,
      expertiseIcon,
      itemCount: nbEtapes,
      chantierId,
      travailId,
      contextForAI
    };

  } catch (error) {
    console.error('Erreur chargement contexte mise en oeuvre:', error);
    return loadLotsContext(chantierId); // Fallback
  }
}

/**
 * Prompt par défaut si non trouvé en BDD pour meo étapes
 */
function getDefaultMiseEnOeuvrePrompt(): string {
  return `Tu aides le bricoleur à définir les étapes de ce lot. Tu peux ajouter, modifier, supprimer ou réorganiser les étapes.`;
}

/**
 * Prompt par défaut si non trouvé en BDD pour phasage
 */
function getDefaultPhasagePrompt(): string {
  return `TU ES L'ASSISTANT PHASAGE. Tu modifies les lots quand le bricoleur le demande.

⛔ RÈGLE ABSOLUE : Quand tu fais une action, tu DOIS inclure le bloc JSON.
SI TU N'INCLUS PAS LE JSON, L'ACTION NE SE FAIT PAS.

ACTIONS : supprimer_lot, modifier_lot, ajouter_lot, deplacer_lot
RAPPEL : SANS LE BLOC JSON, RIEN NE SE PASSE.`;
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

    const expertiseCode = lotCourant?.code_expertise || 'generaliste';
    const expertiseNom = formatExpertiseName(expertiseCode);
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

// /chantiers/[id]/phasage (PHASAGE)
  const phasageMatch = pathname.match(/^\/chantiers\/([^\/]+)\/phasage$/);
  if (phasageMatch) {
    return {
      level: 'phasage',
      ids: { chantierId: phasageMatch[1] }
    };
  }

  // /chantiers/[id]/travaux/[id]/mise-en-oeuvre (MISE EN OEUVRE)
  const miseEnOeuvreMatch = pathname.match(/^\/chantiers\/([^\/]+)\/travaux\/([^\/]+)\/mise-en-oeuvre$/);
  if (miseEnOeuvreMatch) {
    return {
      level: 'mise_en_oeuvre',
      ids: { chantierId: miseEnOeuvreMatch[1], travailId: miseEnOeuvreMatch[2] }
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

  // /chantiers/[id]/travaux/[id]/etapes/[id]/mise-en-oeuvre (MISE EN OEUVRE TÂCHES)
  const miseEnOeuvreTachesMatch = pathname.match(/^\/chantiers\/([^\/]+)\/travaux\/([^\/]+)\/etapes\/([^\/]+)\/mise-en-oeuvre$/);
  if (miseEnOeuvreTachesMatch) {
    return {
      level: 'taches',  // On réutilise le même niveau
      ids: { chantierId: miseEnOeuvreTachesMatch[1], travailId: miseEnOeuvreTachesMatch[2], etapeId: miseEnOeuvreTachesMatch[3] }
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

   case 'phasage':
      if (ids.chantierId) {
        return loadPhasageContext(ids.chantierId);
      }
      break;

    case 'mise_en_oeuvre':
      if (ids.chantierId && ids.travailId) {
        return loadMiseEnOeuvreContext(ids.chantierId, ids.travailId);
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

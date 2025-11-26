/**
 * contextLoaderService.ts
 * 
 * Service de chargement du contexte hiérarchique pour l'assistant IA
 * Stratégie "Zoom progressif" : compact pour les parents, détaillé pour le niveau courant
 * 
 * @version 1.2
 * @date 26 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export type NavigationLevel = 'home' | 'chantiers' | 'lots' | 'etapes' | 'taches';

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
  
  // Contexte formaté pour l'IA
  contextForAI: string;
  
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

    const nbLots = lots?.length || 0;

    // Formater le contexte compact
    const lotsFormatted = (lots || []).map((lot: any, idx: number) => {
      const statut = getStatutEmoji(lot.statut);
      const expertise = lot.expertise?.[0]?.nom || 'Général';
      return `${idx + 1}. ${statut} ${lot.titre} (${expertise})`;
    }).join('\n   ');

    const contextForAI = `
🏗️ CHANTIER : ${chantier.titre}
   ${chantier.description || 'Pas de description'}
   Avancement : ${chantier.progression || 0}%

📦 LOTS À RÉALISER (${nbLots}) :
   ${lotsFormatted || 'Aucun lot défini'}

TON RÔLE : Tu es le Chef de chantier. Tu aides à organiser les lots, définir les priorités, identifier les dépendances entre lots. Tu as la vision globale du projet.
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
      contextForAI,
      raw: { chantier, lots: lots || undefined }
    };

  } catch (error) {
    console.error('Erreur chargement contexte lots:', error);
    return loadChantiersContext(); // Fallback
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
      .select(`
        id, titre, description, ordre, statut, progression,
        expertise:expertises(code, nom)
      `)
      .eq('id', travailId)
      .single();

    // Charger les étapes du lot - utilise "numero"
    const { data: etapes } = await supabase
      .from('etapes')
      .select('id, titre, description, numero, statut, duree_estimee_minutes, difficulte')
      .eq('travail_id', travailId)
      .order('numero', { ascending: true });

    const nbEtapes = etapes?.length || 0;

    // Formater les lots en une ligne compacte
    const lotsCompact = (lots || []).map((lot: any) => {
      const isCurrent = lot.id === travailId;
      const emoji = getStatutEmoji(lot.statut);
      return isCurrent ? `[${emoji} ${lot.titre}]` : `${emoji} ${lot.titre}`;
    }).join(' → ');

    // Formater les étapes (détaillées)
    const etapesFormatted = (etapes || []).map((etape: any) => {
      const statut = getStatutEmoji(etape.statut);
      const duree = formatDuree(etape.duree_estimee_minutes);
      return `${etape.numero}. ${statut} ${etape.titre}${duree ? ` (${duree})` : ''}`;
    }).join('\n   ');

    const expertiseCode = lotCourant?.expertise?.[0]?.code || 'generaliste';
    const expertiseNom = lotCourant?.expertise?.[0]?.nom || 'Généraliste';
    const expertiseIcon = getExpertiseIcon(expertiseCode);

    const contextForAI = `
🏗️ CHANTIER : ${chantier?.titre || 'Chantier'} (${chantier?.progression || 0}% avancé)

📦 LOTS : ${lotsCompact || 'Aucun'}

🔌 LOT ACTUEL : ${lotCourant?.titre || 'Lot'}
   ${lotCourant?.description || ''}
   Expertise : ${expertiseNom} | Avancement : ${lotCourant?.progression || 0}%

📋 ÉTAPES À RÉALISER (${nbEtapes}) :
   ${etapesFormatted || 'Aucune étape définie'}

TON RÔLE : Tu es l'Expert ${expertiseNom}. Tu guides le bricoleur dans ce lot, étape par étape. Tu connais les dépendances avec les autres lots du chantier.
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
      contextForAI,
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
      .select(`id, titre, expertise:expertises(code, nom)`)
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
      .select('id, titre, description, numero, statut, duree_estimee_minutes')
      .eq('id', etapeId)
      .single();

    // Charger les tâches de l'étape (très détaillées) - utilise "numero"
    const { data: taches } = await supabase
      .from('taches')
      .select('id, titre, description, numero, statut, duree_estimee_minutes, est_critique, outils_necessaires, conseils_pro')
      .eq('etape_id', etapeId)
      .order('numero', { ascending: true });

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

    const contextForAI = `
🏗️ CHANTIER : ${chantier?.titre || 'Chantier'} (${chantier?.progression || 0}%)

📦 LOTS : ${lotsCompact}

🔌 LOT : ${lotCourant?.titre || 'Lot'} (${expertiseNom})

📋 ÉTAPES : ${etapesCompact}

📍 ÉTAPE ACTUELLE : ${etapeCourante?.titre || 'Étape'}
   ${etapeCourante?.description || ''}

✅ TÂCHES À RÉALISER (${nbTaches}) :
   ${tachesFormatted || 'Aucune tâche définie'}

TON RÔLE : Tu es l'Expert ${expertiseNom}. Tu guides le bricoleur tâche par tâche. Tu donnes des conseils pratiques, techniques de sécurité, et tu connais le contexte global du chantier.
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
      contextForAI,
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

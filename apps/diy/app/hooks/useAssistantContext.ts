/**
 * useAssistantContext.ts
 * 
 * Hook React pour fournir le contexte complet à l'assistant
 * Utilise contextLoaderService pour charger le contexte hiérarchique
 * 
 * @version 5.0
 * @date 26 novembre 2025
 */

'use client';

import { usePathname } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import { loadContextForPath, parseNavigationFromPath, type ContextData, type NavigationLevel } from '../lib/services/contextLoaderService';

// ==================== TYPES ====================

export type PageContext = 
  | 'home'
  | 'aide'
  | 'chantiers'
  | 'chantier_edit'
  | 'lots'
  | 'etapes'
  | 'taches'
  | 'profil'
  | 'chat';

export interface HeaderInfo {
  /** Ligne 1 : Titre du niveau actuel (gras) */
  title: string;
  
  /** Ligne 2 : Arborescence (ex: "Chantier/Lot >> 5 étapes") */
  breadcrumb: string;
  
  /** Ligne 3 : Expertise avec icône */
  expertiseLine: string;
}

export interface ExpertiseInfo {
  code: string;
  nom: string;
  icon: string;
}

export interface AssistantContext {
  // Contexte de base (rétrocompatibilité)
  pageContext: PageContext;
  contextColor: string;
  welcomeMessage: string;
  placeholder: string;
  additionalContext?: string;
  
  // Header 3 lignes
  header: HeaderInfo;
  
  // Expertise
  expertise: ExpertiseInfo;
  
  // Niveau de navigation
  level: NavigationLevel;
  
  // IDs du contexte actuel (pour les notes)
  chantierId?: string;
  travailId?: string;
  etapeId?: string;
  
  // État
  isLoading: boolean;
}

// ==================== CONFIGURATION COULEURS ====================

function getColorForLevel(level: NavigationLevel, pathname: string): string {
  // Home, aide, profil → couleurs spécifiques
  if (pathname === '/' || pathname.startsWith('/aide')) {
    return 'var(--blue)';
  }
  if (pathname.startsWith('/profil')) {
    return 'var(--purple)';
  }
  
  // Tout ce qui est chantiers → orange
  if (pathname.startsWith('/chantiers')) {
    return 'var(--orange)';
  }
  
  // Défaut
  return 'var(--blue)';
}

function getWelcomeMessage(level: NavigationLevel): string {
  switch (level) {
    case 'home':
      return 'Salut ! Je suis ton assistant bricolage. Que veux-tu savoir sur l\'application PapiBricole ?';
    case 'chantier_edit':
      // Vérifier si c'est une création ou une édition
      if (window.location.pathname === '/chantiers/nouveau') {
        return "Salut ! Je vais t'aider à décrire ton projet, prêt à démarrer ? 🏗️";
      }
      return "Tu souhaites apporter une modification au chantier avant le phasage ? 🔧";
    case 'chantiers':
      return 'Salut ! Je peux t\'aider à gérer tes projets ?';
    case 'lots':
      return 'Salut ! Je connais ce chantier. Comment puis-je t\'aider ?';
    case 'etapes':
      return 'Salut ! Je suis ton expert pour ce lot. Comment puis-je t\'aider ?';
    case 'taches':
      return 'Salut ! Je te guide tâche par tâche. Comment puis-je t\'aider ?';
    default:
      return 'Comment puis-je t\'aider ?';
  }
}

function getPlaceholder(level: NavigationLevel): string {
  switch (level) {
    case 'home':
      return 'Comment puis-je t\'aider ?';
    case 'chantier_edit':
      return 'Décris-moi ton projet...';
    case 'chantiers':
      return 'Une question sur tes projets ?';
    case 'lots':
      return 'Une question sur ce lot ?';
    case 'etapes':
      return 'Une question sur les étapes à suivre ?';
    case 'taches':
      return 'Besoin d\'aide sur une tâche ?';
    default:
      return 'Quelle est ta question ?';
  }
}

function mapLevelToPageContext(level: NavigationLevel, pathname: string): PageContext {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/aide')) return 'aide';
  if (pathname.startsWith('/profil')) return 'profil';
  
  switch (level) {
    case 'chantier_edit':
      return 'chantier_edit';
    case 'chantiers':
      return 'chantiers';
    case 'lots':
      return 'lots';
    case 'etapes':
      return 'etapes';
    case 'taches':
      return 'taches';
    default:
      return 'chat';
  }
}

// ==================== HOOK PRINCIPAL ====================

export function useAssistantContext(): AssistantContext {
  const pathname = usePathname();
  
  // État
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le contexte quand le pathname change
  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      setIsLoading(true);
      
      try {
        const data = await loadContextForPath(pathname);
        
        if (isMounted) {
          setContextData(data);
        }
      } catch (error) {
        console.error('Erreur chargement contexte:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Construire le résultat
  return useMemo(() => {
    const level = contextData?.level || 'home';
    const pageContext = mapLevelToPageContext(level, pathname);
    
    // Header par défaut
    const defaultHeader: HeaderInfo = {
      title: 'Assistant',
      breadcrumb: '',
      expertiseLine: '🏠 Assistant Papibricole'
    };
    
    return {
      // Rétrocompatibilité
      pageContext,
      contextColor: getColorForLevel(level, pathname),
      welcomeMessage: getWelcomeMessage(level),
      placeholder: getPlaceholder(level),
      additionalContext: contextData?.contextForAI,
      
      // Header 3 lignes
      header: contextData?.header || defaultHeader,
      
      // Expertise
      expertise: {
        code: contextData?.expertiseCode || 'generaliste',
        nom: contextData?.expertiseNom || 'Assistant Papibricole',
        icon: contextData?.expertiseIcon || '🏠'
      },
      
      // Niveau
      level,
      
      // IDs du contexte actuel
      chantierId: contextData?.chantierId,
      travailId: contextData?.travailId,
      etapeId: contextData?.etapeId,
      
      // État
      isLoading
    };
  }, [pathname, contextData, isLoading]);
}

export default useAssistantContext;

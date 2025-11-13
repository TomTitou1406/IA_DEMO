'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type PageContext = 'home' | 'chantiers' | 'travaux' | 'chat' | 'profil';

interface AssistantContext {
  pageContext: PageContext;
  contextColor: string;
  welcomeMessage: string;
  placeholder: string;
}

export function useAssistantContext(): AssistantContext {
  const pathname = usePathname();

  return useMemo(() => {
    // HOME
    if (pathname === '/') {
      return {
        pageContext: 'home',
        contextColor: '#2563eb', // Bleu
        welcomeMessage: 'Bienvenue ! Comment puis-je t\'aider à découvrir Papibricole ?',
        placeholder: 'Comment fonctionne l\'app ?'
      };
    }

    // CHANTIERS
    if (pathname.startsWith('/chantiers')) {
      return {
        pageContext: 'chantiers',
        contextColor: '#f97316', // Orange
        welcomeMessage: 'Prêt à planifier ton chantier ? Je t\'aide !',
        placeholder: 'Comment organiser mon chantier ?'
      };
    }

    // TRAVAUX
    if (pathname.startsWith('/travaux')) {
      return {
        pageContext: 'travaux',
        contextColor: '#10b981', // Vert
        welcomeMessage: 'Besoin d\'aide sur cette étape ? Je suis là !',
        placeholder: 'Comment faire cette étape ?'
      };
    }

    // PROFIL
    if (pathname.startsWith('/profil')) {
      return {
        pageContext: 'profil',
        contextColor: '#8b5cf6', // Violet
        welcomeMessage: 'Parlons de tes compétences bricolage !',
        placeholder: 'Quel est ton niveau ?'
      };
    }

    // CHAT (défaut)
    return {
      pageContext: 'chat',
      contextColor: '#2563eb',
      welcomeMessage: 'Salut ! Pose-moi tes questions bricolage !',
      placeholder: 'Ta question...'
    };
  }, [pathname]);
}

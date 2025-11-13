'use client';

import { usePathname, useParams } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';

export type PageContext = 'home' | 'chantiers' | 'travaux' | 'travail-detail' | 'chat' | 'profil';

interface AssistantContext {
  pageContext: PageContext;
  contextColor: string;
  welcomeMessage: string;
  placeholder: string;
  additionalContext?: string;
}

export function useAssistantContext(): AssistantContext {
  const pathname = usePathname();
  const params = useParams();
  const [travailContext, setTravailContext] = useState<string>('');

  // Charger contexte travail si on est sur la page détail
  useEffect(() => {
    async function loadTravailContext() {
      // Détecter si on est sur /chantiers/travaux/[id]
      if (pathname.match(/^\/chantiers\/travaux\/[^\/]+$/)) {
        const travailId = params.id as string;
        
        try {
          // Importer dynamiquement le service
          const { getEtapesByTravail } = await import('../lib/services/travauxService');
          const data = await getEtapesByTravail(travailId);
          
          if (data) {
            const { travail, etapes } = data;
            
            // Construire contexte enrichi
            const etapesTexte = etapes.map((e: any) => 
              `Étape ${e.numero}: ${e.titre} (${e.difficulte}, ${e.duree_minutes}min)\nDescription: ${e.description}\nOutils: ${e.outils.join(', ')}\nConseils: ${e.conseils || 'Aucun'}`
            ).join('\n\n');
            
            const contexte = `
CONTEXTE TRAVAIL ACTUEL :
Travail : ${travail.titre}
Description : ${travail.description}
Expertise requise : ${travail.expertise?.nom || 'Généraliste'}
Progression : ${travail.progression}%
Statut : ${travail.statut}

ÉTAPES À SUIVRE (${etapes.length} étapes) :
${etapesTexte}

TON RÔLE :
Tu es un expert en ${travail.expertise?.nom || 'bricolage'}. Le bricoleur travaille actuellement sur ce travail et a besoin de ton aide pour suivre ces étapes. Guide-le étape par étape, donne des conseils pratiques, réponds à ses questions sur les outils, techniques et problèmes qu'il rencontre.
            `.trim();
            
            setTravailContext(contexte);
          }
        } catch (error) {
          console.error('Error loading travail context:', error);
        }
      } else {
        setTravailContext('');
      }
    }

    loadTravailContext();
  }, [pathname, params]);

  return useMemo(() => {
    // TRAVAIL DÉTAIL (priorité max)
    if (pathname.match(/^\/chantiers\/travaux\/[^\/]+$/)) {
      return {
        pageContext: 'travaux',
        contextColor: '#10b981',
        welcomeMessage: 'Je suis ton expert bricolage ! Sur quelle étape as-tu besoin d\'aide ?',
        placeholder: 'Demande-moi de l\'aide sur une étape...',
        additionalContext: travailContext
      };
    }

    // HOME
    if (pathname === '/') {
      return {
        pageContext: 'home',
        contextColor: '#2563eb',
        welcomeMessage: 'Bienvenue ! Comment puis-je t\'aider à découvrir Papibricole ?',
        placeholder: 'Comment fonctionne l\'app ?'
      };
    }

    // TRAVAUX (liste)
    if (pathname.includes('/travaux')) {
      return {
        pageContext: 'travaux',
        contextColor: '#10b981',
        welcomeMessage: 'Besoin d\'aide sur un travail ? Je suis là !',
        placeholder: 'Comment faire ce travail ?'
      };
    }

    // CHANTIERS
    if (pathname.startsWith('/chantiers')) {
      return {
        pageContext: 'chantiers',
        contextColor: '#f97316',
        welcomeMessage: 'Prêt à planifier ton chantier ? Je t\'aide !',
        placeholder: 'Comment organiser mon chantier ?'
      };
    }

    // PROFIL
    if (pathname.startsWith('/profil')) {
      return {
        pageContext: 'profil',
        contextColor: '#8b5cf6',
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
  }, [pathname, travailContext]);
}

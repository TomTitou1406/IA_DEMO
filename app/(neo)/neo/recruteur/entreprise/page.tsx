"use client";

/**
 * Page Entreprise - Conversation acquisition
 * @version 1.1
 * @date 2025-10-31
 * 
 * Conversation continue avec l'avatar pour collecter les infos entreprise
 * Logique: 1 user = 1 entreprise (reprise si existe)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaticKnowledgeBase } from '@/app/(neo)/neo/hooks/useStaticKnowledgeBase';
import InteractiveBlock from '@/components/ui/InteractiveBlock';
import type { ConversationContext } from '@/components/ui/InteractiveBlock';
import type { ChatMessage } from '@/app/(neo)/neo/hooks/useNeoAvatar';
import { supabase } from '@/app/lib/supabaseClient';
import { DEFAULT_USER_ID } from '@/app/lib/constants';

export default function EntreprisePage() {
  const router = useRouter();
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Charger la KB statique depuis BDD
  const { kb, loading: kbLoading, error: kbError } = useStaticKnowledgeBase('acquisition_entreprise');

  // Charger ou créer l'entreprise du user
  useEffect(() => {
    async function loadOrCreateEntreprise() {
      try {
        console.log('🔍 Recherche entreprise pour user:', DEFAULT_USER_ID);

        // 1. Chercher L'entreprise du user (unique)
        const { data: entreprise, error: searchError } = await supabase
          .from('entreprises')
          .select('id, nom, status')
          .eq('recruiter_id', DEFAULT_USER_ID)
          .maybeSingle(); // ← maybeSingle au lieu de single (pas d'erreur si vide)

        if (entreprise) {
          // Entreprise existe
          console.log('📂 Entreprise trouvée:', {
            id: entreprise.id,
            nom: entreprise.nom,
            status: entreprise.status
          });
          
          setEntrepriseId(entreprise.id);

          // Charger la conversation si status = in_progress
          if (entreprise.status === 'in_progress' || entreprise.status === 'draft') {
            console.log('💬 Recherche conversation en cours...');
            
            const { data: conv, error: convError } = await supabase
              .from('conversations')
              .select('id, messages')
              .eq('related_entity_id', entreprise.id)
              .eq('type', 'acquisition_entreprise')
              .maybeSingle();

            if (conv) {
              console.log('✅ Conversation chargée:', conv.messages?.length || 0, 'messages');
              setConversationId(conv.id);
              setChatHistory(conv.messages || []);
            } else {
              console.log('ℹ️ Pas de conversation, création...');
              await createConversation(entreprise.id);
            }
          } else {
            console.log('ℹ️ Entreprise complétée, pas de reprise');
          }
        } else {
          // Pas d'entreprise → créer
          console.log('🆕 Aucune entreprise trouvée, création...');
          await createEntrepriseAndConversation();
        }

        setIsLoading(false);

      } catch (error) {
        console.error('❌ Erreur chargement entreprise:', error);
        setIsLoading(false);
      }
    }

    loadOrCreateEntreprise();
  }, []);

  // Fonction: Créer entreprise + conversation
  async function createEntrepriseAndConversation() {
    try {
      // 1. Créer entreprise
      const response = await fetch('/api/entreprise/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entreprise_id: null,
          data: {
            nom: 'Entreprise sans nom',
            status: 'draft',
          },
        }),
      });
  
      const result = await response.json();
      if (!result.success) {
        throw new Error('Erreur création entreprise');
      }
  
      const newEntrepriseId = result.entreprise_id;
      console.log('✅ Entreprise créée:', newEntrepriseId);
  
      setEntrepriseId(newEntrepriseId);

      // 2. Créer conversation
      await createConversation(newEntrepriseId);
  
    } catch (error) {
      console.error('❌ Erreur création:', error);
      throw error;
    }
  }

  // Fonction: Créer conversation
  async function createConversation(entrepriseIdParam: string) {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: DEFAULT_USER_ID,
          type: 'acquisition_entreprise',
          related_entity_id: entrepriseIdParam,
          title: '📋 Acquisition entreprise',
          subtitle: 'Collecte informations entreprise',
          messages: [],
          statut: 'EN_COURS',
        })
        .select()
        .single();
  
      if (error) {
        console.error('❌ Erreur création conversation:', error);
        throw error;
      }
  
      console.log('✅ Conversation créée:', conversation.id);
      setConversationId(conversation.id);

    } catch (error) {
      console.error('❌ Erreur création conversation:', error);
      throw error;
    }
  }

  // Handler mise à jour conversation
  const handleChatUpdate = (messages: ChatMessage[]) => {
    setChatHistory(messages);
  };

  // Handler finalisation
  const handleFinaliser = () => {
    router.push('/neo/recruteur/entreprise/validation');
  };

  // Handler sauvegarde manuelle
  const handleSauvegarder = async () => {
    console.log('💾 Sauvegarde manuelle (déjà gérée par auto-save)');
  };

  // Handler abandon
  const handleAbandonner = () => {
    if (confirm('Abandonner la création de l\'entreprise ?')) {
      router.push('/neo/recruteur');
    }
  };

  // Loading KB
  if (kbLoading || isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">⏳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Erreur KB
  if (kbError || !kb) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-5xl mb-4">❌</div>
          <p>Erreur: {kbError || 'KB non trouvée'}</p>
        </div>
      </div>
    );
  }

  // Configuration du contexte
  const contextConfig: ConversationContext = {
    context_key: 'acquisition_entreprise',
    context_type: 'workflow',
    title: '📋 Présentez votre entreprise',
    subtitle: 'Conversation avec votre guide interactif (~10 minutes)',
    knowledge_id: kb.heygen_kb_id,
    avatar_name: 'Anastasia_Chair_Sitting_public',
    avatar_preview_image: '/avatars/anastasia_16_9_preview.webp',
    voice_rate: 1.2,
    language: 'fr',
    initial_message_new: 'Bonjour ! Je suis là pour vous aider à créer le profil complet de votre entreprise. Je vais vous poser des questions sur 10 aspects clés de votre organisation. Prêt à commencer par l\'histoire de votre entreprise ?',
    initial_message_resume: 'Bienvenue ! Je vois que nous avions commencé à parler de votre entreprise. Voulez-vous que nous reprenions là où nous nous sommes arrêtés ?',
    is_active: true,
  };

  console.log('🔧 Passage à InteractiveBlock:', {
    entrepriseId,
    conversationId,
    chatHistoryLength: chatHistory.length
  });
  
  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            📋 {chatHistory.length > 0 ? 'Reprendre votre entreprise' : 'Créer votre entreprise'}
          </h1>
          <p className="text-gray-600">
            {chatHistory.length > 0 
              ? `Vous pouvez reprendre là où vous vous êtes arrêté (${chatHistory.length} messages sauvegardés).`
              : 'Votre guide interactif va vous poser des questions pour comprendre votre entreprise. La conversation dure environ 10 minutes.'
            }
          </p>
        </div>

        {/* Composant InteractiveBlock */}
        <InteractiveBlock
          conversationId={conversationId}
          conversationType="acquisition_entreprise"
          context={contextConfig}
          chatHistory={chatHistory}
          entrepriseId={entrepriseId}
          onConversationUpdate={handleChatUpdate}
          onFinaliser={handleFinaliser}
          onSauvegarder={handleSauvegarder}
          onAbandonner={handleAbandonner}
        />
      </div>
    </div>
  );
}

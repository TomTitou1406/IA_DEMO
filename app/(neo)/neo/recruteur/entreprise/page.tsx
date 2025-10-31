"use client";

/**
 * Page Entreprise - Conversation acquisition
 * @version 1.0
 * @date 2025-10-31
 * 
 * Conversation continue avec l'avatar pour collecter les infos entreprise
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
  
  // Charger la KB statique depuis BDD
  const { kb, loading: kbLoading, error: kbError } = useStaticKnowledgeBase('acquisition_entreprise');

  // Créer l'entreprise en draft au chargement
  useEffect(() => {
    async function createEntrepriseAndConversation() {
      try {
        // 1. Créer entreprise draft
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
        console.log('✅ Entreprise draft créée:', newEntrepriseId);
    
        // 2. Créer conversation liée
        const { data: conversation, error } = await supabase
          .from('conversations')
          .insert({
            user_id: DEFAULT_USER_ID,
            type: 'acquisition_entreprise',
            related_entity_id: newEntrepriseId,
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
        console.log('📊 States après création:', {
          entrepriseId: newEntrepriseId,
          conversationId: conversation.id
        });
    
        // 3. Stocker les 2 IDs
        setEntrepriseId(newEntrepriseId);
        setConversationId(conversation.id);
    
      } catch (error) {
        console.error('❌ Erreur init:', error);
      }
    }
    
    createEntrepriseAndConversation();
  }, []);

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
    // Auto-save déjà géré par InteractiveBlock
    console.log('💾 Sauvegarde manuelle');
  };

  // Handler abandon
  const handleAbandonner = () => {
    if (confirm('Abandonner la création de l\'entreprise ?')) {
      router.push('/neo/recruteur');
    }
  };

  // Loading states
  if (kbLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">⏳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

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
    knowledge_id: kb.heygen_kb_id, // ← Depuis BDD
    avatar_name: 'Anastasia_Chair_Sitting_public',
    avatar_preview_image: '/avatars/anastasia_16_9_preview.webp',
    voice_rate: 1.2,
    language: 'fr',
    initial_message_new: 'Bonjour ! Je suis là pour vous aider à créer le profil complet de votre entreprise. Je vais vous poser des questions sur 10 aspects clés de votre organisation. Prêt à commencer par l\'histoire de votre entreprise ?',
    initial_message_resume: 'Bienvenue ! Je vois que nous avions commencé à parler de votre entreprise. Voulez-vous que nous reprenions là où nous nous sommes arrêtés ?',
    is_active: true,
  };

  console.log('🔧 Passage à InteractiveBlock:', {   // ← AJOUTER ICI (ligne 153)
    entrepriseId,
    conversationId
  })
  
  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            📋 Créer votre entreprise
          </h1>
          <p className="text-gray-600">
            Votre guide interactif va vous poser des questions pour comprendre votre entreprise.
            La conversation dure environ 10 minutes.
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

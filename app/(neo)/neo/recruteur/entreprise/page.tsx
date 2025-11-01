"use client";

/**
 * Page Entreprise - Conversation acquisition
 * @version 1.2
 * @date 2025-10-31
 * 
 * Conversation continue avec l'avatar pour collecter les infos entreprise
 * Logique: 1 user = 1 entreprise (reprise si existe)
 * Ajout: Champ nom entreprise éditable
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
  const [entrepriseName, setEntrepriseName] = useState('Entreprise sans nom');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  
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
          .maybeSingle();

        if (entreprise) {
          // Entreprise existe
          console.log('📂 Entreprise trouvée:', {
            id: entreprise.id,
            nom: entreprise.nom,
            status: entreprise.status
          });
          
          setEntrepriseId(entreprise.id);
          setEntrepriseName(entreprise.nom || 'Entreprise sans nom');

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
      setEntrepriseName('Entreprise sans nom');

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

// Sauvegarder le nom de l'entreprise
  const handleSaveEntrepriseName = async () => {
    if (!entrepriseId || !entrepriseName.trim()) return;
    
    setIsSavingName(true);
    
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({ 
          nom: entrepriseName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', entrepriseId);
  
      if (error) {
        console.error('❌ Erreur sauvegarde nom:', error);
      } else {
        console.log('✅ Nom entreprise sauvegardé:', entrepriseName);
        setIsEditingName(false); // Sortir du mode édition
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      setTimeout(() => setIsSavingName(false), 1000);
    }
  };

  // Annuler l'édition du nom
  const handleCancelEditName = () => {
    // Recharger le nom depuis la BDD
    if (entrepriseId) {
      supabase
        .from('entreprises')
        .select('nom')
        .eq('id', entrepriseId)
        .single()
        .then(({ data }) => {
          if (data) setEntrepriseName(data.nom);
        });
    }
    setIsEditingName(false);
  };

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
    <div className="mb-4 text-center">
      <div className="flex items-center justify-center gap-3 mb-2">
        {!isEditingName ? (
          <>
            <h1 className="text-2xl font-bold text-blue-900">
              📋 Présentez votre entreprise - {entrepriseName}
            </h1>
            <button
              onClick={() => setIsEditingName(true)}
              className="text-gray-400 hover:text-blue-600 transition"
              title="Modifier le nom"
            >
              <span className="text-xl">✏️</span>
            </button>
          </>
        ) : (
          // Mode édition
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border-2 border-blue-500">
            <span className="text-xl">🏢</span>
            <input
              type="text"
              value={entrepriseName}
              onChange={(e) => setEntrepriseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEntrepriseName();
                if (e.key === 'Escape') handleCancelEditName();
              }}
              placeholder="Nom de l'entreprise"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSaveEntrepriseName}
              disabled={isSavingName}
              className="text-green-600 hover:text-green-700 disabled:opacity-50"
              title="Sauvegarder"
            >
              <span className="text-xl">{isSavingName ? '⏳' : '💾'}</span>
            </button>
            <button
              onClick={handleCancelEditName}
              className="text-red-600 hover:text-red-700"
              title="Annuler"
            >
              <span className="text-xl">❌</span>
            </button>
          </div>
        )}
      </div>
    
      {/* Ligne 2 : Info contexte */}
      <p className="text-gray-600 text-sm">
        {chatHistory.length > 0 
          ? `Reprenez là où vous vous êtes arrêté (${chatHistory.length} messages sauvegardés).`
          : 'Votre guide interactif va vous poser des questions (~10 minutes).'
        }
      </p>
    </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-gray-600 text-center">
            {chatHistory.length > 0 
              ? `Reprenez là où vous vous êtes arrêté (${chatHistory.length} messages sauvegardés).`
              : 'Votre guide interactif va vous poser des questions pour comprendre votre entreprise (~10 minutes).'
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

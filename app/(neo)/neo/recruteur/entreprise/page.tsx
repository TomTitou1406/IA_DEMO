"use client";

/**
 * Page Entreprise - Conversation acquisition
 * @version 1.4 - Corrigé hooks order + JSX
 * @date 2025-11-04
 * 
 * Conversation continue avec l'avatar pour collecter les infos entreprise
 * Logique: 1 user = 1 entreprise (reprise si existe)
 * Layout compact optimisé
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaticKnowledgeBase } from '@/app/(neo)/neo/hooks/useStaticKnowledgeBase';
import InteractiveBlock from '@/components/ui/InteractiveBlock';
import type { ConversationContext } from '@/components/ui/InteractiveBlock';
import type { ChatMessage } from '@/app/(neo)/neo/hooks/useNeoAvatar';
import { supabase } from '@/app/lib/supabaseClient';
import { DEFAULT_USER_ID } from '@/app/lib/constants';
import ProgressionChecklist from '@/components/conversation/ProgressionChecklist';
import { useAvatarConfigFromDB } from "@/app/(neo)/neo/hooks/useAvatarConfigFromDB";
import { useConversationContext } from '@/app/(neo)/neo/hooks/useConversationContext';
import { getResumeContext, generateResumeMessage } from '@/app/lib/conversation-resume';

export default function EntreprisePage() {
  const router = useRouter();
  
  // ============================================
  // ÉTATS
  // ============================================
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entrepriseName, setEntrepriseName] = useState('Entreprise sans nom');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customResumeMessage, setCustomResumeMessage] = useState<string | null>(null);
  
  // ============================================
  // HOOKS PERSONNALISÉS
  // ============================================
  const { kb, loading: kbLoading, error: kbError } = useStaticKnowledgeBase('acquisition_entreprise');
  
  const { 
    config: avatarConfig, 
    loading: configLoading,
    error: configError 
  } = useAvatarConfigFromDB({
    autoSave: true,
    autoSaveDelay: 2000,
    onConfigLoaded: (config) => {
      console.log('✅ Configuration avatar chargée depuis BDD');
    },
    onError: (error) => {
      console.error('❌ Erreur configuration avatar:', error);
    },
  });

  const { 
  context: dbContext, 
  loading: contextLoading, 
  error: contextError 
} = useConversationContext('acquisition_entreprise');

  // ============================================
  // EFFECTS (TOUS ICI, AVANT LES RETURN)
  // ============================================
  
  // Effect 1: Charger ou créer l'entreprise
  useEffect(() => {
    async function loadOrCreateEntreprise() {
      try {
        console.log('🔍 Recherche entreprise pour user:', DEFAULT_USER_ID);

        const { data: entreprise, error: searchError } = await supabase
          .from('entreprises')
          .select('id, nom, status')
          .eq('recruiter_id', DEFAULT_USER_ID)
          .maybeSingle();

        if (entreprise) {
          console.log('📂 Entreprise trouvée:', {
            id: entreprise.id,
            nom: entreprise.nom,
            status: entreprise.status
          });
          
          setEntrepriseId(entreprise.id);
          setEntrepriseName(entreprise.nom || 'Entreprise sans nom');

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

              / 🆕 GÉNÉRER MESSAGE DE REPRISE CONTEXTUALISÉ
              if (dbContext?.id) {
                try {
                  const resumeContext = await getResumeContext(
                    dbContext.id,
                    entreprise.id,
                    'entreprises'
                  );
                  
                  const resumeMsg = generateResumeMessage(
                    resumeContext,
                    dbContext.id
                  );
                  
                  console.log('📝 Message de reprise généré:', resumeMsg.substring(0, 100) + '...');
                  console.log('📊 Progression:', {
                    completed: resumeContext.completedCount,
                    total: resumeContext.totalFields,
                    percentage: resumeContext.percentage,
                    nextField: resumeContext.nextField
                  });
                  
                  setCustomResumeMessage(resumeMsg);
                  
                } catch (error) {
                  console.error('❌ Erreur génération message reprise:', error);
                  // Fallback sur message par défaut
                  setCustomResumeMessage(null);
                }
            
            } else {
              console.log('ℹ️ Pas de conversation, création...');
              await createConversation(entreprise.id);
            }
          } else {
            console.log('ℹ️ Entreprise complétée, pas de reprise');
          }
        } else {
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

  // Effect 2: Debug config avatar
  useEffect(() => {
    if (avatarConfig) {
      console.log('🔧 Configuration avatar active:', {
        quality: avatarConfig.quality,
        language: avatarConfig.language,
        voiceRate: avatarConfig.voice?.rate,
        sttConfidence: avatarConfig.sttSettings?.confidence,
        idleTimeout: avatarConfig.activityIdleTimeout,
      });
    }
  }, [avatarConfig]);

  // ============================================
  // FONCTIONS HELPER
  // ============================================
  
  async function createEntrepriseAndConversation() {
    try {
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

      await createConversation(newEntrepriseId);
  
    } catch (error) {
      console.error('❌ Erreur création:', error);
      throw error;
    }
  }

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
        setIsEditingName(false);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      setTimeout(() => setIsSavingName(false), 1000);
    }
  };

  const handleCancelEditName = () => {
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

  const handleChatUpdate = async (messages: ChatMessage[]) => {
    console.log('📝 Chat update:', messages.length);
    setChatHistory(messages);
    
    if (conversationId) {
      const { data } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();
      
      if (data) {
        setChatHistory(data.messages);
      }
    }
  };

  const handleFinaliser = () => {
    console.log('🎯 Finalisation (extraction à implémenter)');
    router.push('/neo/recruteur/entreprise/validation');
  };

  const handleSauvegarder = async () => {
    console.log('💾 Sauvegarde manuelle (déjà gérée par auto-save)');
  };

  const handleAbandonner = () => {
    if (confirm('Abandonner la création de l\'entreprise ?')) {
      router.push('/neo/recruteur');
    }
  };

  // ============================================
  // RETURNS CONDITIONNELS
  // ============================================

  // Loading context
  if (contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du contexte...</p>
        </div>
      </div>
    );
  }
  
  // Erreur context
  if (contextError || !dbContext) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center text-red-600">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-lg font-semibold mb-2">Erreur de chargement</p>
          <p className="text-sm mb-4">{contextError?.message || 'Contexte non trouvé'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }
  
  // Loading config
  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la configuration avatar...</p>
        </div>
      </div>
    );
  }

  // Erreur config
  if (configError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-800 mb-2">Erreur de configuration</p>
          <p className="text-sm text-gray-600 mb-4">{configError.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

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

  // ============================================
  // CONFIGURATION CONTEXTE
  // ============================================

  console.log('🔧 Passage à InteractiveBlock:', {
    entrepriseId,
    conversationId,
    chatHistoryLength: chatHistory.length,
    contextId: dbContext.id,  // ← AJOUTE CETTE LIGNE
    contextKey: dbContext.context_key  // ← ET CELLE-CI
  });
  
  // ============================================
  // RETURN PRINCIPAL
  // ============================================
  // Debug context chargé
    console.log('✅ Context depuis BDD:', {
      id: dbContext.id,
      key: dbContext.context_key,
      title: dbContext.title,
      knowledgeId: dbContext.knowledge_id
    });
  return (
    <div className="w-full h-screen bg-gray-50 p-6 overflow-hidden">
      
      {/* Container du contenu centré de la page max 1152 pix */}
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        
        {/* Header compact - 2 lignes */}
        <div className="mb-2 text-center">
          
          {/* Ligne 1 : Titre + Nom entreprise + Crayon */}
          <div className="flex items-center justify-center gap-3 mb-2">
            {!isEditingName ? (
              <>
               <h1 className="text-2xl font-bold text-blue-900">
                  {dbContext.title} - {entrepriseName}
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
              : dbContext.subtitle || 'Votre guide interactif va vous poser des questions (~10 minutes).'
            }
          </p>
        </div>

        {/* Composant InteractiveBlock avec Checklist et fil de discussion en dessous */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden px-0">
          
          {/* LIGNE 1 : Avatar (55%, min 600px) + Gap 20px + Checklist (20%) - CENTRÉ */}
          <div className="flex items-start justify-center gap-5 flex-shrink-0" style={{ height: '340px', width: '100%' }}>
            
            {/* Zone Avatar : 55% avec minimum 600px */}
            <div style={{ width: '55%', minWidth: '600px', height: '340px' }} className="flex items-start">
              <InteractiveBlock
                conversationId={conversationId}
                conversationType="acquisition_entreprise"
                context={dbContext}
                chatHistory={chatHistory}
                entrepriseId={entrepriseId}
                onConversationUpdate={handleChatUpdate}
                onFinaliser={handleFinaliser}
                onSauvegarder={handleSauvegarder}
                onAbandonner={handleAbandonner}
                showDiscussionThread={true}
                avatarConfig={avatarConfig}
              />
            </div>
            
            {/* Checklist : 20% */}
            {entrepriseId && dbContext.id && (
              <div style={{ width: '20%', minWidth: '250px', paddingTop: '10px' }} className="flex items-start">
                <ProgressionChecklist
                  contextId={dbContext.id}
                  entityId={entrepriseId}
                  targetTable="entreprises"
                />
              </div>
            )}
            
          </div>
                  
        </div>
  
      </div>
        
    </div>
  );
}

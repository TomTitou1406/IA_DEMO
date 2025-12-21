/**
 * ChatInterface.tsx
 * 
 * Interface de chat principale avec :
 * - Persistance des conversations (useConversation)
 * - Détection automatique d'expertise (useExpertiseDetection)
 * - Support mode vocal et texte
 * - Intégration complète du système d'expertise
 * - Notes épinglables (📌)
 * - Focus automatique après envoi
 * - Détection JSON récap pour création/modification chantier
 * 
 * @version 2.3
 * @date 27 novembre 2025
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { sendChat, type ChatResponse, type PromptContext } from '../lib/services/openaiService';
import { transcribeAudio, textToSpeech, playAudio } from '../lib/services/audioService';
import { useConversation } from '../hooks/useConversation';
import { getUserId } from '../lib/services/conversationService';
import { useExpertiseDetection } from '../hooks/useExpertiseDetection';
import ExpertiseBanner, { ExpertiseTransitionMessage } from './ExpertiseBanner';
import type { Message, ConversationType } from '../lib/types/conversation';
import { addNote, type NoteLevel } from '../lib/services/notesService';
import RecapModal, { type RecapData } from './RecapModal';
import { loadContextForPath } from '../lib/services/contextLoaderService';
import { usePathname } from 'next/navigation';
import { extractPhasageActions, dispatchPhasageAction } from '../lib/services/phasageActions';
import { extractEtapesActions, dispatchEtapesAction } from '../lib/services/etapesActions';
import { detectChantierType, getChantierTypeConfig, formatTypeConfigForAI, type Phase1Synthese } from '../lib/services/chantierTypeService';
import { 
  extractExpertTransition, 
  getOrCreateExpertPrompt,
  getExpertHeaderInfo,
  type ExpertiseIdentifiee,
  type ExpertHeaderInfo
} from '../lib/services/expertiseDynamicService';
import { useToast } from '@/app/components/Toast';

// ==================== TYPES ====================

export interface ChatInterfaceProps {
  /** Contexte de la page (home, chantiers, travaux...) */
  pageContext: string;
  /** Couleur du thème */
  contextColor?: string;
  /** Placeholder du champ de saisie */
  placeholder?: string;
  /** Message de bienvenue */
  welcomeMessage?: string;
  /** Contexte additionnel (texte libre) */
  additionalContext?: string;
  /** Contexte structuré pour le prompt */
  promptContext?: PromptContext;
  /** Callback changement d'état (idle, thinking, speaking) */
  onStateChange?: (state: 'idle' | 'thinking' | 'speaking') => void;
  /** Mode compact (pour modal) */
  compact?: boolean;
  /** Désactiver la persistance */
  disablePersistence?: boolean;
  /** Désactiver la détection d'expertise */
  disableExpertiseDetection?: boolean;
  /** ID du chantier (pour contexte) */
  chantierId?: string;
  /** ID du travail (pour contexte) */
  travailId?: string;
  /** Utilisé pour sticker les notes importantes */
  noteContext?: {
    level: NoteLevel;
    id: string;
  };
}

// ==================== COMPOSANT ====================

export default function ChatInterface({
  pageContext,
  contextColor = '#2563eb',
  placeholder = 'Ta question...',
  welcomeMessage = 'Comment puis-je t\'aider ?',
  additionalContext,
  promptContext,
  onStateChange,
  compact = false,
  disablePersistence = false,
  disableExpertiseDetection = false,
  chantierId,
  travailId,
  noteContext
}: ChatInterfaceProps) {

  // ==================== TOAST ====================
  const { showError, showSuccess, showWarning } = useToast();
  
  // ==================== ÉTAT LOCAL ====================
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('papibricole_voice_mode') === 'true';
    }
    return false;
  });
  const [autoPlayAudio, setAutoPlayAudio] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('papibricole_auto_play');
      return stored === null ? false : stored === 'true';
    }
    return false;
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionExpertise, setTransitionExpertise] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedMessageForNote, setSelectedMessageForNote] = useState<Message | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const [isCreatingChantier, setIsCreatingChantier] = useState(false);
  const [creationPhase, setCreationPhase] = useState<'discovery' | 'details' | 'done'>('discovery');
  const [phase1Synthese, setPhase1Synthese] = useState<Phase1Synthese | null>(null);
  const [showPhase1Transition, setShowPhase1Transition] = useState(false);
  const [typeConfig, setTypeConfig] = useState<any>(null);
  const [pendingExpertise, setPendingExpertise] = useState<ExpertiseIdentifiee | null>(null);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [expertHeader, setExpertHeader] = useState<ExpertHeaderInfo | null>(null);
  const [expertPrompt, setExpertPrompt] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<string>('');
  const [isTransitioningToExpert, setIsTransitioningToExpert] = useState(false);
  const [pendingVideoSearch, setPendingVideoSearch] = useState<{query: string; description: string} | null>(null);
  const [pendingTravailSimple, setPendingTravailSimple] = useState<any>(null);
  const [isCreatingTravailSimple, setIsCreatingTravailSimple] = useState(false);
  const [suggestedTravailSimple, setSuggestedTravailSimple] = useState<any>(null);
  
  // ==================== REFS ====================
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();

  // ==================== HOOKS PERSONNALISÉS ====================
  
  // Déterminer le type de conversation
  const getConversationType = (): ConversationType => {
    if (chantierId) return 'chantier';
    if (travailId) return 'travail';
    if (pageContext === 'aide' || pageContext === 'home') return 'aide_ponctuelle';
    if (pageContext === 'profil') return 'profil';
    return 'general';
  };

  // Hook persistance (conditionnel)
  const {
    conversation,
    messages: persistedMessages,
    loading: conversationLoading,
    currentExpertise,
    addMessage: persistMessage,
    updateExpertise: updateConversationExpertise,
    addDecision
  } = disablePersistence 
    ? {
        conversation: null,
        messages: [],
        loading: false,
        currentExpertise: null,
        addMessage: async () => {},
        updateExpertise: async () => {},
        addDecision: async () => {}
      }
    : useConversation({
        userId: getUserId(),
        type: getConversationType(),
        contextId: chantierId || travailId,
        autoCreate: true,
        autoSave: true
      });

  // Messages locaux (si pas de persistance)
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Messages à afficher
  const displayMessages = disablePersistence ? localMessages : persistedMessages;

  // Hook détection expertise
  const {
    detectedExpertise,
    confidence,
    matchedKeywords,
    isDetecting,
    suggestionShown,
    confirmExpertise,
    dismissSuggestion
  } = disableExpertiseDetection
    ? {
        detectedExpertise: null,
        confidence: 0,
        matchedKeywords: [],
        isDetecting: false,
        suggestionShown: false,
        confirmExpertise: async () => null,
        dismissSuggestion: () => {}
      }
    : useExpertiseDetection(displayMessages, {
        minMessages: 3,
        autoDetect: true,
        currentExpertiseCode: currentExpertise?.code,
        displayThreshold: 65,
        debounceDelay: 1500
      });

  // Expertise active (conversation ou détectée confirmée)
  const [activeExpertise, setActiveExpertise] = useState<{
    id?: string;
    code?: string;
    nom?: string;
  } | null>(null);

  // ==================== FONCTIONS NOTES ====================

  const handleSaveNote = async () => {
    if (!noteText.trim() || !noteContext || !selectedMessageForNote) return;
    
    setSavingNote(true);
    try {
      const success = await addNote(
        noteContext.level,
        noteContext.id,
        noteText.trim(),
        'assistant_ia',
        selectedMessageForNote.content
      );
      
      if (success) {
        setShowNoteModal(false);
        setNoteText('');
        setSelectedMessageForNote(null);
        alert('📌 Note enregistrée !');
      } else {
        alert('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur sauvegarde note:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSavingNote(false);
    }
  };
  
  const handlePinClick = (message: Message) => {
    setSelectedMessageForNote(message);
    setNoteText(message.content);
    setShowNoteModal(true);
  };

  // Persister voiceMode
    useEffect(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('papibricole_voice_mode', voiceMode.toString());
      }
    }, [voiceMode]);
    
    // Persister autoPlayAudio
    useEffect(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('papibricole_auto_play', autoPlayAudio.toString());
      }
    }, [autoPlayAudio]);

  // Sync expertise depuis conversation
  useEffect(() => {
    if (currentExpertise?.code) {
      setActiveExpertise(currentExpertise);
    }
  }, [currentExpertise]);

  // ==================== EFFETS ====================
  // Reset conversation quand on arrive sur un nouveau chantier
  useEffect(() => {
    if (chantierId === 'nouveau' || !chantierId) {
      setLocalMessages([]);
      setCreationPhase('discovery');
      setPhase1Synthese(null);
      setShowPhase1Transition(false);
      setTypeConfig(null);
      setRecapData(null);
      setShowRecapModal(false);
      setPendingExpertise(null);
      setIsExpertMode(false);
      setExpertHeader(null);
      setExpertPrompt(null);
      setConversationContext('');
      setIsTransitioningToExpert(false);
      console.log('🔄 Reset conversation pour nouveau chantier');
    }
  }, [chantierId]);

  // Reset conversation quand demandé (ex: après génération d'étapes)
  useEffect(() => {
    const handleResetChat = () => {
      setLocalMessages([]);
      console.log('🔄 Reset conversation demandé');
    };
    window.addEventListener('resetAssistantChat', handleResetChat);
    return () => {
      window.removeEventListener('resetAssistantChat', handleResetChat);
    };
  }, []);

  // Notifier parent du changement d'état
  useEffect(() => {
    if (onStateChange) {
      if (isGeneratingAudio || loading) {
        onStateChange('thinking');
      } else if (isPlaying) {
        onStateChange('speaking');
      } else {
        onStateChange('idle');
      }
    }
  }, [isGeneratingAudio, isPlaying, loading, onStateChange]);

    /**
   * Extrait le recap JSON de la réponse si présent
   * Retourne { hasRecap, recap, cleanContent }
   */
  const extractRecapFromResponse = (content: string): {
    hasRecap: boolean;
    recap: RecapData | null;
    cleanContent: string;
  } => {
    try {
      // Pattern 1: ```json ... ```
      let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      
      // Pattern 2: JSON brut avec ready_for_recap (sans backticks)
      if (!jsonMatch) {
        jsonMatch = content.match(/(\{[\s\S]*"ready_for_recap"\s*:\s*true[\s\S]*\})/);
      }
      
      if (jsonMatch && jsonMatch[1]) {
        // Nettoyer le JSON (supprimer espaces multiples, normaliser)
        let jsonStr = jsonMatch[1].trim();
        
        // Normaliser les espaces multiples en un seul
        jsonStr = jsonStr.replace(/\s+/g, ' ');
        
        // Tenter le parsing
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.ready_for_recap && parsed.recap) {
          // Extraire le contenu AVANT toute mention du JSON/récap
          let cleanContent = content.split('```json')[0].split('{"ready_for_recap"')[0].trim();
          
          // Supprimer les phrases d'introduction du JSON
          cleanContent = cleanContent
            .replace(/Voici le récapitulatif[^:]*:/gi, '')
            .replace(/Voici le récap[^:]*:/gi, '')
            .replace(/Voici la mise à jour[^:]*:/gi, '')
            .replace(/récapitulatif mis à jour[^:]*:/gi, '')
            .replace(/récapitulatif final[^:]*:/gi, '')
            .trim();
          
          // Si le contenu est vide ou trop court, mettre un message par défaut
          if (!cleanContent || cleanContent.length < 10) {
            cleanContent = "Parfait, je mets à jour ton projet !";
          }
          
          console.log('✅ Recap JSON détecté:', parsed.recap);
          
          return {
            hasRecap: true,
            recap: parsed.recap as RecapData,
            cleanContent
          };
        }
      }
      
      return { hasRecap: false, recap: null, cleanContent: content };
    } catch (error) {
      console.error('Erreur parsing recap JSON:', error, 'Content:', content);
      return { hasRecap: false, recap: null, cleanContent: content };
    }
  };

  /**
   * Extrait la synthèse Phase 1 si présente dans la réponse
   */
  const extractPhase1FromResponse = (content: string): {
    hasPhase1: boolean;
    synthese: Phase1Synthese | null;
    messageTransition: string | null;
    cleanContent: string;
  } => {
    try {
      // Pattern: ```json ... ``` avec phase1_complete
      let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      
      // Pattern 2: JSON brut avec phase1_complete
      if (!jsonMatch) {
        jsonMatch = content.match(/(\{[\s\S]*"phase1_complete"\s*:\s*true[\s\S]*\})/);
      }
      
      if (jsonMatch && jsonMatch[1]) {
        let jsonStr = jsonMatch[1].trim();
        jsonStr = jsonStr.replace(/\s+/g, ' ');
        
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.phase1_complete && parsed.synthese) {
          // Extraire le contenu AVANT le JSON
          let cleanContent = content.split('```json')[0].split('{"phase1_complete"')[0].trim();
          
          // Si vide, utiliser le message de transition
          if (!cleanContent || cleanContent.length < 10) {
            cleanContent = parsed.message_transition || "J'ai bien compris ton projet !";
          }
          
          console.log('✅ Phase 1 complète détectée:', parsed.synthese);
          
          return {
            hasPhase1: true,
            synthese: parsed.synthese as Phase1Synthese,
            messageTransition: parsed.message_transition,
            cleanContent
          };
        }
      }
      
      return { hasPhase1: false, synthese: null, messageTransition: null, cleanContent: content };
    } catch (error) {
      console.error('Erreur parsing Phase 1 JSON:', error);
      return { hasPhase1: false, synthese: null, messageTransition: null, cleanContent: content };
    }
  };

  /**
   * Détecte si le message utilisateur est une confirmation pour passer à Phase 2
   */
  const isUserConfirmingPhase2 = (message: string): boolean => {
    const confirmPatterns = [
      /^(ok|okay|oui|yes|go|vas-y|allons-y|c'est bon|parfait|on y va|passons|continue|continuons)$/i,
      /pas (d'|de )?(autre|plus de) question/i,
      /on (peut|va) passer/i,
      /je suis prêt/i,
      /c'est parti/i,
    ];
    
    const msg = message.toLowerCase().trim();
    return confirmPatterns.some(pattern => pattern.test(msg));
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, showTransition]);

  // Écouter événements audio
  useEffect(() => {
    const handleAudioStarted = () => {
      setIsGeneratingAudio(false);
      setIsPlaying(true);
    };
    
    const handleAudioEnded = () => {
      setIsPlaying(false);
    };
    
    window.addEventListener('audioStarted', handleAudioStarted);
    window.addEventListener('audioEnded', handleAudioEnded);
    
    return () => {
      window.removeEventListener('audioStarted', handleAudioStarted);
      window.removeEventListener('audioEnded', handleAudioEnded);
    };
  }, []);

  // ==================== HELPERS ====================

  // Stop audio
  const stopAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
    setIsPlaying(false);
    setIsGeneratingAudio(false);
  };

  // Format temps enregistrement
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== GESTION EXPERTISE ====================

  /**
   * Confirme l'expertise détectée et l'active
   */
  const handleConfirmExpertise = useCallback(async () => {
    if (!detectedExpertise) return;

    // Confirmer dans le hook
    const confirmed = await confirmExpertise();
    if (!confirmed) return;

    // Afficher la transition
    setTransitionExpertise(confirmed.nom);
    setShowTransition(true);

    // Mettre à jour l'expertise active
    setActiveExpertise({
      id: confirmed.id,
      code: confirmed.code,
      nom: confirmed.nom
    });

    // Sauvegarder dans la conversation
    if (!disablePersistence) {
      await updateConversationExpertise(
        confirmed.id,
        confirmed.code,
        confirmed.nom,
        'auto'
      );

      // Enregistrer la décision
      await addDecision({
        type: 'expertise_switched',
        description: `Passage à l'expert ${confirmed.nom}`,
        data: { expertise_code: confirmed.code },
        validated_by_user: true
      });
    }

    // Masquer la transition après 2s
    setTimeout(() => {
      setShowTransition(false);
    }, 2000);

  }, [detectedExpertise, confirmExpertise, disablePersistence, updateConversationExpertise, addDecision]);

  // ==================== ENVOI MESSAGE ====================

  /**
   * Envoie un message et récupère la réponse
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Message utilisateur
    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      expertise_code: activeExpertise?.code
    };

    // Ajouter à l'affichage
    if (disablePersistence) {
      setLocalMessages(prev => [...prev, userMessage]);
    } else {
      await persistMessage(userMessage);
    }

    setLoading(true);

    try {
      // Recharger le contexte frais depuis la BDD
      let freshContext = '';
      try {
        const contextData = await loadContextForPath(pathname);
        freshContext = contextData.contextForAI || '';
        console.log('🔄 Contexte rechargé pour le message');
      } catch (e) {
        console.warn('⚠️ Impossible de recharger le contexte:', e);
      }
      
      // Fusionner avec additionalContext (contexte vidéo, etc.) s'il existe
      if (additionalContext) {
        freshContext = additionalContext + (freshContext ? `\n\n${freshContext}` : '');
        console.log('🎬 Contexte additionnel fusionné');
      }
    
      // Préparer les messages pour l'API
      const apiMessages = [...displayMessages, userMessage].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      // Construire le contexte enrichi pour Phase 2
      let enrichedContext = freshContext;
      if (creationPhase === 'details' && typeConfig && phase1Synthese) {
        const typeContextStr = formatTypeConfigForAI(typeConfig);
        enrichedContext = `${freshContext}\n\n## SYNTHÈSE PHASE 1\nType: ${phase1Synthese.type_projet}\nTaille: ${phase1Synthese.taille_projet}\nDescription: ${phase1Synthese.description_courte}\n${typeContextStr}`;
      }

      // === VÉRIFIER CONFIRMATION UTILISATEUR POUR PHASE 2 (AVANT appel API) ===
      if (showPhase1Transition && phase1Synthese && isUserConfirmingPhase2(content)) {
        console.log('✅ Utilisateur confirme passage Phase 2');
        setCreationPhase('details');
        setShowPhase1Transition(false);
        
        // Ajouter le message utilisateur
        if (disablePersistence) {
          setLocalMessages(prev => [...prev, userMessage]);
        } else {
          await persistMessage(userMessage);
        }
        
        // Message de transition automatique
        const transitionMessage: Message = {
          role: 'assistant',
          content: `Parfait ! Passons aux détails de ton projet "${phase1Synthese.description_courte}".\n\nCommençons : quelles sont les dimensions de l'espace ? (longueur × largeur × hauteur en mètres)`,
          timestamp: new Date().toISOString(),
          metadata: { promptSource: 'phase_transition' }
        };
        
        if (disablePersistence) {
          setLocalMessages(prev => [...prev, transitionMessage]);
        } else {
          await persistMessage(transitionMessage);
        }
        
        setLoading(false);
              
        return; // Stop ici, ne pas appeler l'API
      }
      
      // Appel API avec expertise si active
      const response: ChatResponse = await sendChat({
        messages: apiMessages,
        context: isExpertMode && expertPrompt 
          ? `${expertPrompt}\n\n---\nCONTEXTE CONVERSATION:\n${conversationContext}\n\n---\nNOUVELLE QUESTION:`
          : enrichedContext,
        isVoiceMode: voiceMode,
        pageContext: isExpertMode ? 'expert' : pageContext,
        expertiseCode: isExpertMode ? expertHeader?.expertiseCode : activeExpertise?.code,
        promptContext: {
          ...promptContext,
          chantierId,
          travailId,
          creationPhase,
          typeProjet: phase1Synthese?.type_projet,
        }
      });

      // === DÉTECTION EXPERTISE (aide ponctuelle) ===
      if (pageContext === 'aide_decouverte' && !isExpertMode) {
        const expertTransition = extractExpertTransition(response.message);
        
        if (expertTransition) {
          console.log('🎯 Expert identifié:', expertTransition.expertise_identifiee.nom_affichage);
          setPendingExpertise(expertTransition.expertise_identifiee);
        }
      }

      // Détection dans handleSend après réponse IA
      if (pageContext === 'video_decouverte') {
        const videoMatch = response.message.match(/```json[\s\S]*?"ready_for_search"\s*:\s*true[\s\S]*?```/);
        if (videoMatch) {
          try {
            const json = JSON.parse(videoMatch[0].replace(/```json|```/g, ''));
            setPendingVideoSearch(json.video_search);
          } catch {}
        }
      }

      // Détection travaux simples
      if (pageContext === 'travaux_simple_decouverte') {
        const travailMatch = response.message.match(/```json[\s\S]*?"ready_to_create"\s*:\s*true[\s\S]*?```/);
        if (travailMatch) {
          try {
            const json = JSON.parse(travailMatch[0].replace(/```json|```/g, ''));
            if (json.travail_simple) {
              console.log('🔧 Travail simple détecté:', json.travail_simple.titre);
              setPendingTravailSimple(json.travail_simple);
              // Nettoyer le JSON du message
              response.message = response.message.replace(/```json[\s\S]*?```/g, '').trim();
            }
          } catch (e) {
            console.error('Erreur parsing travail simple:', e);
          }
        }
      }

      // Détection travaux simples
      if (pageContext === 'travaux_simple_decouverte') {
        const travailMatch = response.message.match(/```json[\s\S]*?"ready_to_create"\s*:\s*true[\s\S]*?```/);
        if (travailMatch) {
          try {
            const json = JSON.parse(travailMatch[0].replace(/```json|```/g, ''));
            if (json.travail_simple) {
              console.log('🔧 Travail simple détecté:', json.travail_simple.titre);
              setPendingTravailSimple(json.travail_simple);
              // Nettoyer le JSON du message
              response.message = response.message.replace(/```json[\s\S]*?```/g, '').trim();
            }
          } catch (e) {
            console.error('Erreur parsing travail simple:', e);
          }
        }
      }
      
      // Détection suggestion travail simple (depuis aide_decouverte)
      if (pageContext === 'aide_decouverte') {
        const suggestionMatch = response.message.match(/```json[\s\S]*?"ready_for_travail_simple"\s*:\s*true[\s\S]*?```/);
        if (suggestionMatch) {
          try {
            const json = JSON.parse(suggestionMatch[0].replace(/```json|```/g, ''));
            if (json.travail_simple_detecte) {
              console.log('💡 Suggestion travail simple détectée:', json.travail_simple_detecte.titre);
              setSuggestedTravailSimple(json.travail_simple_detecte);
              // Nettoyer le JSON du message
              response.message = response.message.replace(/```json[\s\S]*?```/g, '').trim();
            }
          } catch (e) {
            console.error('Erreur parsing suggestion travail simple:', e);
          }
        }
      }
      
      // DEBUG : Voir la réponse brute de l'IA
      console.log('🤖 RÉPONSE BRUTE IA:', response.message);
      
      // === PHASE 1 : Vérifier si Phase 1 complète ===
      if (creationPhase === 'discovery' && pageContext === 'chantier_edit') {
        const { hasPhase1, synthese, messageTransition, cleanContent: phase1Clean } = extractPhase1FromResponse(response.message);
        
        if (hasPhase1 && synthese) {
          // Vérifier si hors scope
          if (synthese.est_hors_scope) {
            // Afficher le message d'erreur et ne pas continuer
            const errorMessage: Message = {
              role: 'assistant',
              content: `⚠️ ${synthese.raison_hors_scope}\n\nJe ne peux malheureusement pas t'accompagner sur ce type de projet. N'hésite pas à me parler d'un autre projet !`,
              timestamp: new Date().toISOString()
            };
            
            if (disablePersistence) {
              setLocalMessages(prev => [...prev, errorMessage]);
            } else {
              await persistMessage(errorMessage);
            }
            setLoading(false);
            return;
          }
          
          // Sauvegarder la synthèse et afficher la transition
          setPhase1Synthese(synthese);
          setShowPhase1Transition(true);
          
          // Charger la config du type de chantier
          if (synthese.type_projet) {
            const config = await getChantierTypeConfig(synthese.type_projet);
            if (config) {
              setTypeConfig(config);
              console.log('✅ Config type chargée:', config.nom);
            }
          }
          
          // Message avec la transition
          const assistantMessage: Message = {
            role: 'assistant',
            content: phase1Clean,
            timestamp: new Date().toISOString(),
            metadata: {
              phase1_complete: true,
              synthese: synthese
            }
          };
          
          if (disablePersistence) {
            setLocalMessages(prev => [...prev, assistantMessage]);
          } else {
            await persistMessage(assistantMessage);
          }
          
          setLoading(false);
          return;
        }
      }

      // === DÉTECTION PRÉ-PHASAGE COMPLET ===
      if (pageContext === 'pre_phasage') {
        const prePhasageMatch = response.message.match(/```json[\s\S]*?"pre_phasage_complete"\s*:\s*true[\s\S]*?```/);
        if (prePhasageMatch) {
          try {
            const json = JSON.parse(prePhasageMatch[0].replace(/```json|```/g, ''));
            if (json.pre_phasage_complete && json.metadata_updates) {
              console.log('✅ Pré-phasage complet, mise à jour metadata:', json.metadata_updates);
              
              const chantierId = promptContext?.chantierId;
              if (chantierId) {
                // Utiliser le service existant
                const { updateChantier, getChantierById } = await import('../lib/services/chantierService');
                
                // Charger les metadata existantes
                const existingChantier = await getChantierById(chantierId);
                const existingMetadata = existingChantier?.metadata || {};
                
                // Fusionner les metadata
                const updatedMetadata = {
                  ...existingMetadata,
                  ...json.metadata_updates
                };
                
                // Mettre à jour
                await updateChantier(chantierId, { metadata: updatedMetadata });
                console.log('✅ Metadata mises à jour en BDD');
                
                // Afficher le message nettoyé (sans le JSON)
                const cleanMessage = response.message.replace(/```json[\s\S]*?```/g, '').trim();
                const assistantMessage: Message = {
                  role: 'assistant',
                  content: cleanMessage || 'Parfait ! Je lance la génération des lots de travaux.',
                  timestamp: new Date().toISOString(),
                };
                
                if (disablePersistence) {
                  setLocalMessages(prev => [...prev, assistantMessage]);
                } else {
                  await persistMessage(assistantMessage);
                }
                
                // Rediriger vers le phasage après un court délai
                setTimeout(() => {
                  window.location.href = `/chantiers/${chantierId}/phasage`;
                }, 1500);
                
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Erreur parsing pré-phasage JSON:', e);
          }
        }
      }
 
      // Vérifier si la réponse contient un recap JSON (création chantier)
      const { hasRecap, recap, cleanContent } = extractRecapFromResponse(response.message);
      
      // Vérifier si la réponse contient des actions phasage (peut y en avoir plusieurs)
      const { hasActions, actions, cleanContent: actionCleanContent } = extractPhasageActions(cleanContent);
      
      // Utiliser le contenu nettoyé
      const finalContent = hasActions ? actionCleanContent : cleanContent;
      
      // Dispatcher toutes les actions PHASAGE si présentes
      if (hasActions && actions.length > 0) {
        console.log(`🚀 Dispatch de ${actions.length} action(s) phasage`);
        actions.forEach((action, index) => {
          setTimeout(() => {
            dispatchPhasageAction(action);
          }, index * 100);
        });
      }

      // Vérifier si la réponse contient des actions ÉTAPES (sur le contenu original, pas nettoyé)
      const { hasActions: hasEtapesActions, actions: etapesActions, cleanContent: etapesCleanContent } = extractEtapesActions(cleanContent);
      
      // Mettre à jour le contenu final si actions étapes trouvées
      const finalContentWithEtapes = hasEtapesActions ? etapesCleanContent : finalContent;

      // Dispatcher toutes les actions ÉTAPES si présentes
      console.log('🔍 DEBUG: hasEtapesActions=', hasEtapesActions, 'etapesActions=', etapesActions);
      
      if (hasEtapesActions && etapesActions.length > 0) {
        console.log(`🔧 Dispatch de ${etapesActions.length} action(s) étapes`);
        etapesActions.forEach((action, index) => {
          setTimeout(() => {
            dispatchEtapesAction(action);
          }, index * 100);
        });
      }
      
      // Message assistant (sans le JSON)
      const assistantMessage: Message = {
        role: 'assistant',
        content: hasEtapesActions ? finalContentWithEtapes : finalContent,
        timestamp: new Date().toISOString(),
        expertise_code: activeExpertise?.code,
        expertise_nom: response.expertiseNom || activeExpertise?.nom,
        metadata: {
          isVoiceMode: voiceMode,
          promptSource: response.promptSource,
        }
      };
      
      // Ajouter à l'affichage
      if (disablePersistence) {
        setLocalMessages(prev => [...prev, assistantMessage]);
      } else {
        await persistMessage(assistantMessage);
      }
      
       // Si recap détecté, créer directement le chantier (plus de modal intermédiaire)
       if (hasRecap && recap) {
          console.log('✅ Recap JSON détecté, création directe du chantier');
          await handleValidateRecap(recap);
          return;
        }
        // Lecture audio SEULEMENT si PAS de recap
        if (voiceMode && autoPlayAudio) {
          setIsGeneratingAudio(true);
          try {
            const audioBlob = await textToSpeech(cleanContent);
            await playAudio(audioBlob, audioElementRef);
          } catch (audioError) {
            console.error('Erreur audio:', audioError);
            setIsGeneratingAudio(false);
          }
        }
      } catch (error) {
        console.error('Erreur envoi message:', error);
      
      // Message d'erreur
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Peux-tu reformuler ta question ?',
        timestamp: new Date().toISOString()
      };

      if (disablePersistence) {
        setLocalMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
    }
  }, [
    displayMessages, 
    activeExpertise, 
    additionalContext, 
    pathname, 
    voiceMode, 
    pageContext, 
    promptContext,
    chantierId,
    travailId,
    autoPlayAudio, 
    disablePersistence, 
    persistMessage
  ]);

  // ==================== HANDLERS ====================

 /**
   * Gère la transition vers le mode expert (appelée au clic sur le bouton)
   */
  const handleExpertTransition = async () => {
    if (!pendingExpertise) return;
    
    console.log('🚀 Transition vers expert:', pendingExpertise.nom_affichage);
    setIsTransitioningToExpert(true);
    
    try {
      // Construire le contexte de conversation
      const context = displayMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      setConversationContext(context);
      
      // Chercher ou créer le prompt expert
      const prompt = await getOrCreateExpertPrompt(pendingExpertise, context);
      
      console.log(`✅ Prompt expert ${prompt.isNew ? 'créé' : 'trouvé'}: ${prompt.code}`);
      
     // Mettre à jour le header
    const headerInfo = getExpertHeaderInfo(pendingExpertise);
    setExpertHeader(headerInfo);
    setExpertPrompt(prompt.prompt_text);
    setIsExpertMode(true);
    
    // Envoyer un event pour mettre à jour le FloatingAssistant
    window.dispatchEvent(new CustomEvent('expertModeActivated', {
      detail: {
        header: headerInfo,
        expertise: pendingExpertise
      }
    }));
    
    // Vérifier si le contexte contient une question à laquelle répondre directement
    const hasQuestion = pendingExpertise.contexte_resume && 
      (pendingExpertise.contexte_resume.includes('?') || 
       pendingExpertise.contexte_resume.toLowerCase().startsWith('à quelle') ||
       pendingExpertise.contexte_resume.toLowerCase().startsWith('comment') ||
       pendingExpertise.contexte_resume.toLowerCase().startsWith('quel') ||
       pendingExpertise.contexte_resume.toLowerCase().startsWith('pourquoi'));
    
    if (hasQuestion) {
      // Message court de transition
      const transitionMessage: Message = {
        role: 'assistant',
        content: `🎯 ${pendingExpertise.nom_affichage} à ton service !`,
        timestamp: new Date().toISOString(),
        metadata: { promptSource: 'expert_transition' }
      };
    
      if (disablePersistence) {
        setLocalMessages(prev => [...prev, transitionMessage]);
      } else {
        await persistMessage(transitionMessage);
      }
    
      // Reset pending avant l'appel async
      const questionToAnswer = pendingExpertise.contexte_resume;
      const expertName = pendingExpertise.nom_affichage;
      setPendingExpertise(null);
    
     // L'expert répond directement à la question
      setLoading(true);
      try {
        const response = await sendChat({
          messages: [{ role: 'user', content: questionToAnswer }],
          context: `Tu es ${expertName}. Réponds directement à cette question de manière claire et concise. IMPORTANT : pas de markdown (pas de ** ni ## ni ###), écris en texte simple avec des numéros (1. 2. 3.) si tu dois lister.`,
          isVoiceMode: false,
          pageContext: 'expert_mode'
        });
        
        const expertResponse: Message = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
          metadata: { promptSource: 'expert_direct_response' }
        };
        
        if (disablePersistence) {
          setLocalMessages(prev => [...prev, expertResponse]);
        } else {
          await persistMessage(expertResponse);
        }
      } catch (error) {
        console.error('Erreur réponse expert:', error);
      } finally {
        setLoading(false);
      }
    
    } else {
      // Pas de question directe, message d'accueil standard
      const transitionMessage: Message = {
        role: 'assistant',
        content: `🎯 ${pendingExpertise.nom_affichage} à ton service !\n\n${pendingExpertise.contexte_resume}\n\nPose-moi tes questions, je suis là pour t'aider ! 💪`,
        timestamp: new Date().toISOString(),
        metadata: { promptSource: 'expert_transition' }
      };
    
      if (disablePersistence) {
        setLocalMessages(prev => [...prev, transitionMessage]);
      } else {
        await persistMessage(transitionMessage);
      }
    
      // Reset pending
      setPendingExpertise(null);
    }
      
    } catch (error) {
      console.error('Erreur transition expert:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Désolé, j'ai eu un souci technique. Mais je peux quand même t'aider ! Pose ta question. 😊",
        timestamp: new Date().toISOString()
      };
      
      if (disablePersistence) {
        setLocalMessages(prev => [...prev, errorMessage]);
      } else {
        await persistMessage(errorMessage);
      }
    } finally {
      setIsTransitioningToExpert(false);
    }
  };

  /**
   * Gère la création d'un travail simple
   */
  const handleCreateTravailSimple = async () => {
    if (!pendingTravailSimple || isCreatingTravailSimple) return;
    
    console.log('🔧 Création travail simple:', pendingTravailSimple.titre);
    setIsCreatingTravailSimple(true);
    
    try {
      const response = await fetch('/api/travaux-simple/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingTravailSimple)
      });
      
      const data = await response.json();
      
      if (data.success && data.chantierId) {
        // Message de confirmation
        const confirmMessage: Message = {
          role: 'assistant',
          content: `✅ Travail "${pendingTravailSimple.titre}" créé avec succès !\n\nJe te redirige vers le suivi...`,
          timestamp: new Date().toISOString()
        };
        
        if (disablePersistence) {
          setLocalMessages(prev => [...prev, confirmMessage]);
        } else {
          await persistMessage(confirmMessage);
        }
        
        // Fermer l'assistant et rediriger
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('closeAssistant'));
          window.location.href = `/chantiers/${data.chantierId}/travaux`;
        }, 1500);
        
      } else {
        throw new Error(data.error || 'Erreur création');
      }
      
    } catch (error) {
      console.error('Erreur création travail simple:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: "❌ Désolé, j'ai eu un problème pour créer le travail. Peux-tu réessayer ?",
        timestamp: new Date().toISOString()
      };
      
      if (disablePersistence) {
        setLocalMessages(prev => [...prev, errorMessage]);
      } else {
        await persistMessage(errorMessage);
      }
    } finally {
      setIsCreatingTravailSimple(false);
    }
  };

  /**
   * Bascule vers le mode travaux simples avec les infos pré-collectées
   */
  const handleSwitchToTravailSimple = (travailInfo: any) => {
    // Fermer la card de suggestion
    setSuggestedTravailSimple(null);
    
    // Stocker les infos dans sessionStorage pour les récupérer après redirection
    sessionStorage.setItem('pendingTravailSimpleFromAide', JSON.stringify({
      titre: travailInfo.titre,
      description: travailInfo.description_courte || '',
      contexte: travailInfo.contexte_resume
    }));
    
    // Fermer l'assistant
    window.dispatchEvent(new CustomEvent('closeAssistant'));
    
    // Rediriger vers /chantiers
    window.location.href = '/chantiers';
  };
  
  // Envoi texte
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input;
    setInput('');
    await sendMessage(content);
    // Remettre le focus sur l'input après envoi
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Fermer la modal recap
  const handleCloseRecap = () => {
    setShowRecapModal(false);
  };
  
  // Modifier le recap (retour conversation)
  const handleModifyRecap = () => {
    setShowRecapModal(false);
    // L'utilisateur peut continuer à discuter pour modifier
  };
  
  // Valider et créer/modifier le chantier
  const handleValidateRecap = async (recap: RecapData) => {
    console.log('🔍 DEBUG promptContext:', promptContext);
    console.log('🔍 DEBUG chantierId:', promptContext?.chantierId);
    console.log('🔍 DEBUG isModification:', promptContext?.chantierId && promptContext.chantierId !== 'nouveau');
    setIsCreatingChantier(true);
    
    try {
      const { createChantier, updateChantier } = await import('../lib/services/chantierService');
      
      // Générer un titre court
      const generateTitreShort = (projet: string): string => {
        if (!projet) return 'Mon chantier';
        
        const keywords = ['rénovation', 'création', 'aménagement', 'installation', 'construction'];
        const rooms = ['salle de bain', 'sdb', 'cuisine', 'chambre', 'salon', 'garage', 'terrasse', 'combles', 'grenier'];
        
        const projetLower = projet.toLowerCase();
        let action = '';
        let room = '';
        
        for (const kw of keywords) {
          if (projetLower.includes(kw)) {
            action = kw.charAt(0).toUpperCase() + kw.slice(1);
            break;
          }
        }
        
        for (const r of rooms) {
          if (projetLower.includes(r)) {
            room = r === 'sdb' ? 'SDB' : r.charAt(0).toUpperCase() + r.slice(1);
            break;
          }
        }
        
        if (action && room) return `${action} ${room}`;
        return projet.split(' ').slice(0, 3).join(' ');
      };

      const titreShort = recap.titre || generateTitreShort(recap.projet);

      // En mode modification, récupérer les données existantes pour fusion
     let existingMetadata: Record<string, any> = {};
      if (isModification && existingChantierId) {
        try {
          const { getChantierById } = await import('../lib/services/chantierService');
          const existingChantier = await getChantierById(existingChantierId);
          if (existingChantier?.metadata) {
            existingMetadata = existingChantier.metadata;
          }
        } catch (err) {
          console.warn('Impossible de charger le chantier existant:', err);
        }
      }
      
    // Construire les nouvelles metadata en fusionnant avec l'existant
    // Fonction pour fusionner les tableaux (concat + dédoublonner)
    const mergeArrays = (existing: string[] | undefined, incoming: string[] | undefined): string[] | undefined => {
      if (!incoming || incoming.length === 0) return existing;
      if (!existing || existing.length === 0) return incoming;
      // Fusionner et dédoublonner (insensible à la casse)
      const merged = [...existing];
      incoming.forEach(item => {
        const itemLower = item.toLowerCase();
        if (!merged.some(m => m.toLowerCase() === itemLower)) {
          merged.push(item);
        }
      });
      return merged;
    };

    // Construire les nouvelles metadata en fusionnant avec l'existant
    // Fonction pour vérifier si une valeur est "vide" (à ignorer)
    const isEmptyValue = (val: any): boolean => {
      if (val === undefined || val === null) return true;
      if (typeof val === 'string' && val.trim() === '') return true;
      if (typeof val === 'number' && val === 0) return true;
      if (Array.isArray(val) && val.length === 0) return true;
      return false;
    };

// Construire les nouvelles metadata en fusionnant avec l'existant
    const newMetadata: Record<string, any> = {
      ...existingMetadata,
      
      // === CHAMPS PHASE 1 ===
      ...(phase1Synthese && {
        type_projet: phase1Synthese.type_projet,
        taille_projet: phase1Synthese.taille_projet,
        motivations: phase1Synthese.motivations,
        points_vigilance_initiaux: phase1Synthese.points_vigilance,
      }),
      
      // === CHAMPS SIMPLES : écraser SEULEMENT si valeur non vide ===
      ...(!isEmptyValue(recap.budget_inclut_materiaux) && { budget_inclut_materiaux: recap.budget_inclut_materiaux }),
      ...(!isEmptyValue(recap.disponibilite_heures_semaine) && { disponibilite_heures_semaine: recap.disponibilite_heures_semaine }),
      ...(!isEmptyValue(recap.deadline_semaines) && { deadline_semaines: recap.deadline_semaines }),
      ...(!isEmptyValue(recap.surface_m2) && { surface_m2: recap.surface_m2 }),
      ...(!isEmptyValue(recap.style_souhaite) && { style_souhaite: recap.style_souhaite }),
      ...(!isEmptyValue(recap.budget_max) && { budget_max: recap.budget_max }),
      
      // === NOUVEAUX CHAMPS (enrichissement pour budget/économies) ===
      ...(!isEmptyValue(recap.type_piece) && { type_piece: recap.type_piece }),
      ...(!isEmptyValue(recap.dimensions) && { dimensions: recap.dimensions }),
      ...(!isEmptyValue(recap.surface_sol_m2) && { surface_sol_m2: recap.surface_sol_m2 }),
      ...(!isEmptyValue(recap.surface_murs_m2) && { surface_murs_m2: recap.surface_murs_m2 }),
      ...(!isEmptyValue(recap.sol_actuel) && { sol_actuel: recap.sol_actuel }),
      ...(!isEmptyValue(recap.murs_actuels) && { murs_actuels: recap.murs_actuels }),
      ...(!isEmptyValue(recap.points_techniques) && { points_techniques: recap.points_techniques }),
      ...(!isEmptyValue(recap.acces_chantier) && { acces_chantier: recap.acces_chantier }),
      
      // === OBJETS COMPLEXES ===
      ...(!isEmptyValue(recap.reseaux) && { reseaux: recap.reseaux }),
      
      // === CHAMPS TEXTE À CONCATÉNER ===
      ...(!isEmptyValue(recap.contraintes) && { 
        contraintes: existingMetadata.contraintes 
          ? `${existingMetadata.contraintes} ${recap.contraintes}`
          : recap.contraintes 
      }),
      ...(!isEmptyValue(recap.etat_existant) && { 
        etat_existant: existingMetadata.etat_existant 
          ? `${existingMetadata.etat_existant} ${recap.etat_existant}`
          : recap.etat_existant 
      }),
      
      // === TABLEAUX : FUSIONNER au lieu d'écraser ===
      competences_ok: mergeArrays(existingMetadata.competences_ok, recap.competences_ok),
      competences_faibles: mergeArrays(existingMetadata.competences_faibles, recap.competences_faibles),
      travaux_pro_suggeres: mergeArrays(existingMetadata.travaux_pro_suggeres, recap.travaux_pro_suggeres),
      elements_a_deposer: mergeArrays(existingMetadata.elements_a_deposer, recap.elements_a_deposer),
      elements_a_conserver: mergeArrays(existingMetadata.elements_a_conserver, recap.elements_a_conserver),
      equipements_souhaites: mergeArrays(existingMetadata.equipements_souhaites, recap.equipements_souhaites),
    };
      
    const chantierData: Record<string, any> = {
        metadata: newMetadata
      };
      
     let chantier: any;

      // En mode création
      if (!isModification) {
        const createData = {
          titre: titreShort || 'Mon chantier',
          description: recap.projet,
          budget_initial: recap.budget_max,
          taille_projet: phase1Synthese?.taille_projet || 'moyen',
          duree_estimee_heures: (recap.disponibilite_heures_semaine && recap.deadline_semaines) 
            ? recap.disponibilite_heures_semaine * recap.deadline_semaines 
            : undefined,
          metadata: newMetadata
        };
        
        chantier = await createChantier(createData);
        console.log('✅ Chantier créé:', chantier);
      } else {
        // MODE MODIFICATION - Ne changer que les champs nécessaires
        const updateData: Record<string, any> = {
          metadata: newMetadata
        };
        
        // Mettre à jour le titre seulement si explicitement fourni
        if (recap.titre) {
          updateData.titre = recap.titre;
        } else if (recap.projet && !existingMetadata.description) {
          // Générer un titre seulement si pas de description existante (nouveau projet)
          updateData.titre = generateTitreShort(recap.projet);
        }
        
        // Mettre à jour la description seulement si c'est une vraie description (pas juste un titre)
        if (recap.projet && recap.projet.length > 50) {
          updateData.description = recap.projet;
        }
        
        // Mettre à jour les colonnes directes si modifiées
        if (recap.budget_max !== undefined) {
          updateData.budget_initial = recap.budget_max;
        }
        if (recap.disponibilite_heures_semaine !== undefined && recap.deadline_semaines !== undefined) {
          updateData.duree_estimee_heures = recap.disponibilite_heures_semaine * recap.deadline_semaines;
        }
        
        chantier = await updateChantier(existingChantierId, updateData);
        console.log('✅ Chantier mis à jour:', chantier);
      }
      
      if (!chantier || !chantier.id) {
        throw new Error('Échec de la création/modification du chantier');
      }
      
      setShowRecapModal(false);
      
      // Fermer le FloatingAssistant
      window.dispatchEvent(new CustomEvent('closeAssistant'));
      
      // Petit délai pour laisser les modales se fermer avant la redirection
      setTimeout(() => {
        window.location.href = `/chantiers/${chantier.id}`;
      }, 150);
      
    } catch (error) {
      console.error('Erreur création/modification chantier:', error);
      alert('Erreur lors de la création/modification du chantier. Vérifie la console.');
    } finally {
      setIsCreatingChantier(false);
    }
  };

  // Gestion vocal
  const handleVoiceAction = async () => {
    if (isPlaying) {
      stopAudio();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (loading) return;

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        setRecordingTime(0);

        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setIsRecording(false);

          if (audioBlob.size < 1000) {
            alert('Enregistrement trop court');
            setRecordingTime(0);
            return;
          }

          try {
            setLoading(true);
            const text = await transcribeAudio(audioBlob);
            
            if (!text.trim()) {
              alert('Aucun texte détecté');
              setLoading(false);
              setRecordingTime(0);
              return;
            }

            setRecordingTime(0);
            await sendMessage(text);

          } catch (error) {
            console.error('Erreur transcription:', error);
            setLoading(false);
            setRecordingTime(0);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);

      } catch (error) {
        console.error('Erreur micro:', error);
        alert('Impossible d\'accéder au microphone');
      }
    }
  };

  // Détection mode modification : soit via promptContext, soit via l'URL
  const getExistingChantierId = (): string | null => {
    // Via promptContext
    if (promptContext?.chantierId && promptContext.chantierId !== 'nouveau') {
      return promptContext.chantierId;
    }
    // Via URL (fallback)
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/\/chantiers\/([^\/]+)/);
      if (match && match[1] && match[1] !== 'nouveau') {
        return match[1];
      }
    }
    return null;
  };
  
  const existingChantierId = getExistingChantierId();
  const isModification = !!existingChantierId;

  /**
   * Retire le bloc JSON de la réponse pour l'affichage
   */
  const cleanMessageContent = (content: string): string => {
    // Retirer le bloc ```json ... ```
    let cleaned = content.replace(/```json[\s\S]*?```/g, '').trim();
    
    // Retirer aussi le JSON brut si présent
    cleaned = cleaned.replace(/\{[\s\S]*"ready_for_expert"[\s\S]*?\}/g, '').trim();
    
    // Nettoyer les lignes vides multiples
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    // Nettoyer create travaux simples
    content = content.replace(/```json[\s\S]*?"ready_to_create"\s*:\s*true[\s\S]*?```/g, '').trim();
    
    return cleaned || content;
  };

  // ==================== RENDU ====================

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'transparent',
      position: 'relative'
    }}>
      
     {/* Zone messages */}
     <div style={{
       flex: 1,
       overflowY: 'auto',
       padding: compact ? '1rem' : '1.5rem',
       background: 'transparent',
     }}>
        
        {/* Message de bienvenue */}
        {displayMessages.length === 0 && !conversationLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: compact ? '2rem 1rem' : '3rem 1rem',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: compact ? '2rem' : '3rem', marginBottom: '1rem' }}>👋</div>
            <p style={{ fontSize: compact ? '0.9rem' : '1rem', fontWeight: '500' }}>
              {welcomeMessage}
            </p>
            {activeExpertise?.nom && (
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: contextColor }}>
                🔧 Expert {activeExpertise.nom} à votre service
              </p>
            )}
          </div>
        )}

        {/* Message transition expertise */}
        {showTransition && transitionExpertise && (
          <ExpertiseTransitionMessage
            expertiseNom={transitionExpertise}
            themeColor={contextColor}
          />
        )}

        {/* Messages */}
        {displayMessages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '0.75rem'
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                position: 'relative'
              }}
            >
              {/* Bulle du message */}
              <div
                style={{
                  padding: compact ? '0.6rem 0.9rem' : '0.75rem 1rem',
                  borderRadius: compact ? '12px' : '16px',
                  background: message.role === 'user' ? contextColor : 'rgba(30, 30, 30, 0.95)',
                  color: message.role === 'user' ? 'white' : 'var(--gray-light)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  fontSize: compact ? '0.85rem' : '0.95rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {cleanMessageContent(message.content)}
              </div>

              {/* Bouton "Parler avec l'expert" si expertise détectée */}
              {message.role === 'assistant' && 
               pendingExpertise && 
               index === displayMessages.length - 1 && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    🎯 Expert identifié : {pendingExpertise.nom_affichage}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.8)',
                    marginBottom: '0.75rem'
                  }}>
                    {pendingExpertise.contexte_resume}
                  </div>
                  <button
                    onClick={handleExpertTransition}
                    disabled={isTransitioningToExpert}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: isTransitioningToExpert 
                        ? 'rgba(255,255,255,0.3)' 
                        : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: isTransitioningToExpert ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isTransitioningToExpert ? (
                      <>⏳ Connexion en cours...</>
                    ) : (
                      <>💬 Parler avec l'expert</>
                    )}
                  </button>
                </div>
              )}

              {pendingVideoSearch && index === displayMessages.length - 1 && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
                  borderRadius: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>
                    🎬 {pendingVideoSearch.description}
                  </div>
                  <button
                    onClick={async () => {
                      // Fermer l'assistant
                      window.dispatchEvent(new Event('closeAssistant'));
                      // Naviguer vers page vidéos
                      window.location.href = `/videos?q=${encodeURIComponent(pendingVideoSearch.query)}`;
                    }}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #22c55e, #10b981)',
                      color: 'white',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    🎬 Rechercher des vidéos
                  </button>
                </div>
              )}
              
              {/* Bouton 📌 toujours visible (seulement pour messages IA) */}
              {message.role === 'assistant' && noteContext && (
                <button
                  onClick={() => handlePinClick(message)}
                  title="Épingler comme note"
                  className="pin-button"
                  style={{
                    position: 'absolute',
                    bottom: '-0.5rem',
                    right: '-0.5rem',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '2px solid #e5e7eb',
                    background: 'var(--body-bg)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f97316';
                    e.currentTarget.style.borderColor = '#f97316';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  📌
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loader */}
        {loading && !isGeneratingAudio && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div className="spinner" style={{ 
                width: '20px', 
                height: '20px',
                borderColor: 'rgba(255,255,255,0.2)',
                borderTopColor: contextColor
              }}></div>
              <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Réflexion...</span>
            </div>
          </div>
        )}

        {/* Génération audio */}
        {isGeneratingAudio && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              background: `${contextColor}15`,
              color: contextColor,
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: contextColor }}></div>
              Génération audio...
            </div>
          </div>
        )}

       {/* Card suggestion travail simple (depuis aide_decouverte) */}
        {suggestedTravailSimple && !loading && (
          <div style={{
            padding: '1rem',
            margin: '0.5rem 0',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(37, 99, 235, 0.1))',
            borderRadius: '12px',
            border: '2px solid var(--blue)',
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔧</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: 'var(--blue)',
                  marginBottom: '0.5rem'
                }}>
                  Ce travail semble simple !
                </div>
                
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--gray-light)',
                  marginBottom: '0.75rem',
                  lineHeight: 1.4
                }}>
                  {suggestedTravailSimple.contexte_resume}
                </p>
                
                <div style={{
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(37, 99, 235, 0.15)',
                  borderRadius: '8px',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--gray-light)'
                  }}>
                    📋 {suggestedTravailSimple.titre}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleSwitchToTravailSimple(suggestedTravailSimple)}
                    style={{
                      flex: 1,
                      minWidth: '140px',
                      padding: '0.75rem 1rem',
                      background: 'var(--blue)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    ✨ Créer de petits travaux
                  </button>
                  <button
                    onClick={() => setSuggestedTravailSimple(null)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'transparent',
                      color: 'var(--gray)',
                      border: '1px solid var(--gray)',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Continuer à discuter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        {/* Bouton création travail simple - UNE SEULE FOIS */}
        {pendingTravailSimple && !loading && (
          <div style={{
            padding: '1rem',
            margin: '0.5rem 0',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))',
            borderRadius: '12px',
            border: '1px solid var(--green)'
          }}>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--green)',
              marginBottom: '0.75rem'
            }}>
              ✅ Travail prêt à créer
            </div>
            
            <div style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--gray-light)',
              marginBottom: '0.5rem'
            }}>
              {pendingTravailSimple.titre}
            </div>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--gray)',
              marginBottom: '0.75rem'
            }}>
              <span>⏱ {pendingTravailSimple.duree_estimee_minutes} min</span>
              <span>📊 {pendingTravailSimple.difficulte}</span>
              <span>📋 {pendingTravailSimple.etapes?.length || 0} étapes</span>
            </div>
            
            {/* Liste étapes preview */}
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '0.75rem',
              fontSize: '0.85rem'
            }}>
              {pendingTravailSimple.etapes?.slice(0, 3).map((etape: any, idx: number) => (
                <div key={idx} style={{
                  color: 'var(--gray-light)',
                  padding: '0.25rem 0',
                  borderBottom: idx < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                }}>
                  {etape.ordre}. {etape.titre}
                </div>
              ))}
              {pendingTravailSimple.etapes?.length > 3 && (
                <div style={{ color: 'var(--gray)', paddingTop: '0.25rem' }}>
                  + {pendingTravailSimple.etapes.length - 3} autres...
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleCreateTravailSimple}
                disabled={isCreatingTravailSimple}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: isCreatingTravailSimple ? 'var(--gray)' : 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: isCreatingTravailSimple ? 'wait' : 'pointer'
                }}
              >
                {isCreatingTravailSimple ? '⏳ Création...' : '✅ Créer ce travail'}
              </button>
              
              <button
                onClick={() => setPendingTravailSimple(null)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  color: 'var(--gray)',
                  border: '1px solid var(--gray)',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ↩ Modifier
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bandeau transition Phase 1 → Phase 2 */}
        {showPhase1Transition && phase1Synthese && (
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: '12px',
            margin: '0.5rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <span style={{ fontWeight: '700' }}>Voici ce que j'ai compris de ton projet :</span>
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.95, marginBottom: '0.75rem' }}>
              <strong>{phase1Synthese.description_courte}</strong>
              <br />
              Taille : {phase1Synthese.taille_projet === 'petit' ? '📦 Projet rapide' : 
                        phase1Synthese.taille_projet === 'moyen' ? '📦📦 Projet standard' : '📦📦📦 Grand projet'}
            </div>
            {phase1Synthese.points_vigilance && phase1Synthese.points_vigilance.length > 0 && (
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                ⚠️ Points de vigilance : {phase1Synthese.points_vigilance.join(', ')}
              </div>
            )}
            <div style={{ 
              fontSize: '0.9rem',
              fontWeight: '600',
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              👉 Réponds "OK" ou "vas-y" pour passer aux détails !
            </div>
          </div>
        )}

      {/* Zone input */}
        <div style={{
          padding: compact ? '0.75rem' : '1rem',
          background: contextColor,
          borderTop: 'none',
          borderRadius: '0 0 16px 16px'
        }}>
        
        {/* Toggles mode */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <button
              onClick={() => setVoiceMode(false)}
              style={{
                flex: 1,
                padding: compact ? '0.4rem' : '0.5rem',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.4)',
                background: !voiceMode ? 'white' : 'transparent',
                color: !voiceMode ? contextColor : 'rgba(255,255,255,0.8)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✍️ Mode texte
            </button>
            <button
              onClick={() => setVoiceMode(true)}
              style={{
                flex: 1,
                padding: compact ? '0.4rem' : '0.5rem',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.4)',
                background: voiceMode ? 'white' : 'transparent',
                color: voiceMode ? contextColor : 'rgba(255,255,255,0.8)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🎤 Mode vocal
            </button>
          </div>

          {voiceMode && (
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              style={{
                padding: compact ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: autoPlayAudio ? 'white' : 'rgba(255,255,255,0.2)',
                color: autoPlayAudio ? contextColor : 'rgba(255,255,255,0.8)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {autoPlayAudio ? '🔊' : '🔇'}
            </button>
          )}
        </div>

        {/* Input zone */}
        {voiceMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            
            {/* Indication textuelle */}
            <div style={{
              fontSize: compact ? '0.85rem' : '0.9rem',
              color: isRecording ? 'var(--red)' : 'rgba(255,255,255,0.7)',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              {isRecording 
                ? `🔴 Enregistrement... ${formatTime(recordingTime)}`
                : '🎤 Appuie sur le bouton pour parler'
              }
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleVoiceAction}
                disabled={loading}
                style={{
                  padding: compact ? '0.75rem 2rem' : '0.875rem 2.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isRecording ? 'var(--red)' : 'var(--green)',
                  color: 'white',
                  fontSize: compact ? '0.9rem' : '1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s',
                  boxShadow: isRecording 
                    ? '0 0 20px rgba(239, 68, 68, 0.5)' 
                    : '0 0 20px rgba(16, 185, 129, 0.5)'
                }}
              >
                {isRecording ? '📤 Envoyer' : '🎤 Parler'}
              </button>
        
              {(isGeneratingAudio || isPlaying) && (
                <button
                  onClick={stopAudio}
                  style={{
                    padding: compact ? '0.75rem 1.25rem' : '0.875rem 1.5rem',
                    borderRadius: '12px',
                    border: '2px solid var(--red)',
                    background: 'transparent',
                    color: 'var(--red)',
                    fontSize: compact ? '0.9rem' : '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ⏹️ Interrompre
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeExpertise?.nom 
                ? `Question pour l'expert ${activeExpertise.nom}...`
                : 'Écris tes instructions ici...'
              }
              disabled={loading}
              style={{
                flex: 1,
                padding: compact ? '0.6rem' : '0.75rem',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                fontSize: compact ? '0.85rem' : '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                color: 'var(--gray-light)',
                backgroundColor: 'var(--body-bg)',
             }}
              onFocus={(e) => e.target.style.borderColor = 'white'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                padding: compact ? '0.6rem 1.25rem' : '0.75rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                background: contextColor,
                color: 'white',
                fontSize: compact ? '1.1rem' : '1.25rem',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || loading ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !loading) {
                  e.currentTarget.style.background = 'var(--body-bg)';
                  e.currentTarget.style.color = contextColor;
                  e.currentTarget.style.border = `2px solid ${contextColor}`;
                  e.currentTarget.style.boxShadow = `0 0 20px ${contextColor}60`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = contextColor;
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.border = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ➤
            </button>
          </div>
        )}
      </div>

      {/* ==================== MODALE NOTE ==================== */}
      {showNoteModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.25rem',
            width: '90%',
            maxWidth: '320px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              fontWeight: '700',
              fontSize: '1rem',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1f2937'
            }}>
              📌 Épingler comme note
            </div>
            
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Résumé de la note..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.9rem',
                resize: 'vertical',
                marginBottom: '0.75rem',
                boxSizing: 'border-box',
                color: '#1f2937',
                backgroundColor: 'white'
              }}
            />
            
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              Cette note sera attachée au niveau actuel.
            </div>
            
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                  setSelectedMessageForNote(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#374151'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!noteText.trim() || savingNote}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: savingNote ? '#9ca3af' : '#f97316',
                  color: 'white',
                  cursor: savingNote ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                {savingNote ? '...' : '✓ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODALE RÉCAP ==================== */}
      {showRecapModal && recapData && (
        <RecapModal
          isOpen={showRecapModal}
          recap={recapData}
          onClose={handleCloseRecap}
          onValidate={handleValidateRecap}
          onModify={handleModifyRecap}
          isLoading={isCreatingChantier}
          themeColor={contextColor}
          isModification={isModification}
        />
      )}
    </div>
  );
}

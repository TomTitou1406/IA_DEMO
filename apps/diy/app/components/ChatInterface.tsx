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
  
  // ==================== ÉTAT LOCAL ====================
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
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

  // Sync expertise depuis conversation
  useEffect(() => {
    if (currentExpertise?.code) {
      setActiveExpertise(currentExpertise);
    }
  }, [currentExpertise]);

  // ==================== EFFETS ====================

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
      let freshContext = additionalContext;
      try {
        const contextData = await loadContextForPath(pathname);
        freshContext = contextData.contextForAI;
        console.log('🔄 Contexte rechargé pour le message');
      } catch (e) {
        console.warn('⚠️ Impossible de recharger le contexte:', e);
      }
    
      // Préparer les messages pour l'API
      const apiMessages = [...displayMessages, userMessage].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      // Appel API avec expertise si active
     const response: ChatResponse = await sendChat({
        messages: apiMessages,
        context: freshContext,
        isVoiceMode: voiceMode,
        pageContext,
        expertiseCode: activeExpertise?.code,
        promptContext: {
          ...promptContext,
          chantierId,
          travailId
        }
      });

     // DEBUG : Voir la réponse brute de l'IA
      console.log('🤖 RÉPONSE BRUTE IA:', response.message);
      
      // Vérifier si la réponse contient un recap JSON (création chantier)
      const { hasRecap, recap, cleanContent } = extractRecapFromResponse(response.message);
      
      // Vérifier si la réponse contient des actions phasage (peut y en avoir plusieurs)
      const { hasActions, actions, cleanContent: actionCleanContent } = extractPhasageActions(cleanContent);
      
      // Utiliser le contenu nettoyé
      const finalContent = hasActions ? actionCleanContent : cleanContent;
      
      // Dispatcher toutes les actions si présentes
      if (hasActions && actions.length > 0) {
        console.log(`🚀 Dispatch de ${actions.length} action(s) phasage`);
        actions.forEach((action, index) => {
          // Petit délai entre chaque action pour éviter les conflits de state
          setTimeout(() => {
            dispatchPhasageAction(action);
          }, index * 100);
        });
      }
      
      // Message assistant (sans le JSON)
      const assistantMessage: Message = {
        role: 'assistant',
        content: finalContent,
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
      
      // Si recap détecté, ouvrir la modal et NE PAS lire l'audio
      if (hasRecap && recap) {
        setRecapData(recap);
        setShowRecapModal(true);
        // Pas de lecture audio, pas de fermeture assistant (la modal s'affiche par-dessus)
      } else {
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

  // Envoi texte
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input;
    setInput('');
    await sendMessage(content);
    // Remettre le focus sur l'input après envoi
    inputRef.current?.focus();
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

      const titreShort = generateTitreShort(recap.projet);

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
        
        if (recap.projet) {
          updateData.titre = titreShort;
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

  // ==================== RENDU ====================

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'white',
      position: 'relative'
    }}>
      
      {/* Zone messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: compact ? '1rem' : '1.5rem',
        background: '#f8f9fa'
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

        {/* Banner détection expertise */}
        {suggestionShown && detectedExpertise && !activeExpertise?.code && (
          <ExpertiseBanner
            expertise={detectedExpertise}
            confidence={confidence}
            matchedKeywords={matchedKeywords}
            onConfirm={handleConfirmExpertise}
            onDismiss={dismissSuggestion}
            themeColor={contextColor}
            compact={compact}
          />
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
                  background: message.role === 'user' ? contextColor : 'white',
                  color: message.role === 'user' ? 'white' : '#1f2937',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  fontSize: compact ? '0.85rem' : '0.95rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {message.content}
              </div>
              
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
                    background: 'white',
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
              padding: '0.75rem',
              borderRadius: '16px',
              background: contextColor,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
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

        <div ref={messagesEndRef} />
      </div>

      {/* Zone input */}
      <div style={{
        padding: compact ? '0.75rem' : '1rem',
        borderTop: '1px solid var(--gray-light)',
        background: 'white'
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
                border: 'none',
                background: !voiceMode ? contextColor : 'var(--gray-light)',
                color: !voiceMode ? 'white' : 'var(--gray)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✍️ Texte
            </button>
            <button
              onClick={() => setVoiceMode(true)}
              style={{
                flex: 1,
                padding: compact ? '0.4rem' : '0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: voiceMode ? contextColor : 'var(--gray-light)',
                color: voiceMode ? 'white' : 'var(--gray)',
                fontSize: compact ? '0.75rem' : '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🎤 Vocal
            </button>
          </div>

          {voiceMode && (
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              style={{
                padding: compact ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: autoPlayAudio ? 'var(--green)' : 'var(--gray-light)',
                color: autoPlayAudio ? 'white' : 'var(--gray)',
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
            {isRecording && (
              <div style={{
                fontSize: compact ? '0.85rem' : '0.9rem',
                color: 'var(--red)',
                fontWeight: '700'
              }}>
                🔴 {formatTime(recordingTime)}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleVoiceAction}
                disabled={loading}
                style={{
                  padding: compact ? '0.75rem 1.5rem' : '0.875rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isRecording ? 'var(--blue)' : 'var(--green)',
                  color: 'white',
                  fontSize: compact ? '0.9rem' : '1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s'
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
                    border: 'none',
                    background: 'var(--red)',
                    color: 'white',
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
                : placeholder
              }
              disabled={loading}
              style={{
                flex: 1,
                padding: compact ? '0.6rem' : '0.75rem',
                borderRadius: '12px',
                border: `2px solid ${contextColor}30`,
                fontSize: compact ? '0.85rem' : '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                color: 'var(--gray-dark)',
                backgroundColor: 'var(--white)'
              }}
              onFocus={(e) => e.target.style.borderColor = contextColor}
              onBlur={(e) => e.target.style.borderColor = `${contextColor}30`}
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

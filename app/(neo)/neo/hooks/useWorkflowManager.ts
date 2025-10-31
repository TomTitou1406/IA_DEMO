/**
 * useWorkflowManager Hook
 * @version 0.01
 * @date 2025-10-31
 * 
 * Hook de gestion du workflow (entreprise ou poste)
 * Gère la navigation, validation, sauvegarde et état des étapes
 */

import { useState, useCallback, useEffect } from 'react';

export interface WorkflowStep {
  stepKey: string;
  stepTitle: string;
  stepDescription?: string;
  stepNumber: number;
  stepType: 'conversation' | 'form' | 'validation';
  isOptional?: boolean;
  contextKey?: string; // Clé dans conversation_contexts
}

export interface CompletedStep {
  stepKey: string;
  stepTitle: string;
  stepNumber: number;
  summary: string;
  completedAt: string;
  data?: any;
}

export interface WorkflowState {
  workflowType: 'entreprise' | 'poste';
  entityId: string | null;
  conversationId: string | null;
  currentStepIndex: number;
  completedSteps: CompletedStep[];
  collectedData: Record<string, any>;
  status: 'draft' | 'in_progress' | 'completed' | 'validated';
}

interface UseWorkflowManagerProps {
  workflowType: 'entreprise' | 'poste';
  steps: WorkflowStep[];
  onSave?: (data: WorkflowState) => Promise<void>;
  onComplete?: (data: WorkflowState) => Promise<void>;
  initialState?: Partial<WorkflowState>;
}

export const useWorkflowManager = ({
  workflowType,
  steps,
  onSave,
  onComplete,
  initialState,
}: UseWorkflowManagerProps) => {
  // État principal
  const [state, setState] = useState<WorkflowState>({
    workflowType,
    entityId: initialState?.entityId || null,
    conversationId: initialState?.conversationId || null,
    currentStepIndex: initialState?.currentStepIndex || 0,
    completedSteps: initialState?.completedSteps || [],
    collectedData: initialState?.collectedData || {},
    status: initialState?.status || 'draft',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Étape actuelle
  const currentStep = steps[state.currentStepIndex];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === steps.length - 1;

  // Navigation
  const goToNextStep = useCallback(() => {
    if (!isLastStep) {
      setState((prev) => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        status: 'in_progress',
      }));
    }
  }, [isLastStep]);

  const goToPreviousStep = useCallback(() => {
    if (!isFirstStep) {
      setState((prev) => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
      }));
    }
  }, [isFirstStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setState((prev) => ({
        ...prev,
        currentStepIndex: stepIndex,
      }));
    }
  }, [steps.length]);

  // Validation d'une étape
  const validateStep = useCallback(async (stepData: any, summary: string) => {
    setIsValidating(true);

    try {
      const completedStep: CompletedStep = {
        stepKey: currentStep.stepKey,
        stepTitle: currentStep.stepTitle,
        stepNumber: currentStep.stepNumber,
        summary,
        completedAt: new Date().toISOString(),
        data: stepData,
      };

      setState((prev) => ({
        ...prev,
        completedSteps: [...prev.completedSteps, completedStep],
        collectedData: {
          ...prev.collectedData,
          [currentStep.stepKey]: stepData,
        },
      }));

      // Passer à l'étape suivante
      if (!isLastStep) {
        goToNextStep();
      } else {
        // Dernière étape validée
        setState((prev) => ({
          ...prev,
          status: 'completed',
        }));
      }

      return true;
    } catch (error) {
      console.error('Erreur validation étape:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [currentStep, isLastStep, goToNextStep]);

  // Sauvegarde de la progression
  const saveProgress = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);

    try {
      await onSave(state);
      console.log('✅ Progression sauvegardée');
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [state, onSave]);

  // Auto-save toutes les 30 secondes
  useEffect(() => {
    if (!onSave) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [saveProgress, onSave]);

  // Validation finale du workflow
  const completeWorkflow = useCallback(async () => {
    if (!onComplete) return;

    try {
      await onComplete(state);
      setState((prev) => ({
        ...prev,
        status: 'validated',
      }));
      console.log('✅ Workflow complété');
    } catch (error) {
      console.error('❌ Erreur validation finale:', error);
      throw error;
    }
  }, [state, onComplete]);

  // Éditer une étape précédente
  const editStep = useCallback((stepKey: string) => {
    const stepIndex = steps.findIndex((s) => s.stepKey === stepKey);
    if (stepIndex !== -1) {
      goToStep(stepIndex);
    }
  }, [steps, goToStep]);

  return {
    // État
    state,
    currentStep,
    totalSteps: steps.length,
    completedSteps: state.completedSteps,
    isFirstStep,
    isLastStep,
    isSaving,
    isValidating,

    // Navigation
    goToNextStep,
    goToPreviousStep,
    goToStep,
    editStep,

    // Actions
    validateStep,
    saveProgress,
    completeWorkflow,

    // Data
    getStepData: (stepKey: string) => state.collectedData[stepKey],
    getAllData: () => state.collectedData,
  };
};

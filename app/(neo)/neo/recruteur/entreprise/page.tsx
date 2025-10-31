"use client";

/**
 * Page Entreprise - Workflow de création
 * @version 0.05
 * @date 2025-10-31
 * 
 * Page de création d'entreprise avec workflow guidé en 10 étapes
 */

import { useState } from 'react';
import { WorkflowLayout } from '@/components/workflow/WorkflowLayout';
import { useWorkflowManager } from '@/app/(neo)/neo/hooks/useWorkflowManager';
import { 
  ENTREPRISE_WORKFLOW_STEPS, 
  ENTREPRISE_WORKFLOW_TITLE 
} from '@/app/lib/config/entrepriseWorkflowConfig';
import InteractiveAvatarWrapper from '@/components/InteractiveAvatar';

export default function EntreprisePage() {
  const [conversationData, setConversationData] = useState<Record<string, any>>({});

  // Hook de gestion du workflow
  const {
    state,
    currentStep,
    totalSteps,
    completedSteps,
    isValidating,
    isSaving,
    validateStep,
    saveProgress,
    completeWorkflow,
    editStep,
  } = useWorkflowManager({
    workflowType: 'entreprise',
    steps: ENTREPRISE_WORKFLOW_STEPS,
    onSave: async (data) => {
      // TODO: Sauvegarder en BDD
      console.log('💾 Sauvegarde entreprise:', data);
    },
    onComplete: async (data) => {
      // TODO: Créer l'entreprise en BDD
      console.log('✅ Création entreprise:', data);
    },
  });

  // Gestion de la validation d'étape
  const handleValidateStep = async () => {
    // Récupérer les données de la conversation
    const stepData = conversationData[currentStep.stepKey] || {};
    
    // Générer un résumé basique (TODO: améliorer avec IA)
    const summary = `Informations collectées pour ${currentStep.stepTitle}`;

    await validateStep(stepData, summary);
  };

  // Rendu selon le type d'étape
  const renderStepContent = () => {
    switch (currentStep.stepType) {
      case 'conversation':
        return (
          <div className="w-full">
            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-2">
                Clara va vous poser quelques questions pour mieux comprendre votre entreprise.
              </p>
            </div>
            <InteractiveAvatarWrapper />
          </div>
        );

      case 'validation':
        return (
          <div className="w-full bg-gray-100 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              📋 Récapitulatif de votre entreprise
            </h3>
            
            <div className="space-y-4">
              {completedSteps.map((step) => (
                <div key={step.stepKey} className="bg-white rounded-lg p-4 shadow">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {step.stepTitle}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {step.summary}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                ✓ Toutes les informations ont été collectées. 
                Vous pouvez maintenant valider la création de votre entreprise.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-500">
            Type d'étape non géré : {currentStep.stepType}
          </div>
        );
    }
  };

  return (
    <WorkflowLayout
      completedSteps={completedSteps}
      currentStep={currentStep}
      isSaving={isSaving}
      isValidateDisabled={isValidating}
      title={ENTREPRISE_WORKFLOW_TITLE}
      totalSteps={totalSteps}
      onEditStep={editStep}
      onSaveProgress={saveProgress}
      onValidateStep={handleValidateStep}
    >
      {renderStepContent()}
    </WorkflowLayout>
  );
}

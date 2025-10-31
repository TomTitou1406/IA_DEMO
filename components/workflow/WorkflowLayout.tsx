/**
 * WorkflowLayout Component
 * @version 0.01
 * @date 2025-10-31
 * 
 * Layout principal orchestrant tout le workflow
 * Combine ProgressBar, StepCard et CompletedStepsPanel
 */

import { ProgressBar } from "./ProgressBar";
import { StepCard } from "./StepCard";
import { CompletedStepsPanel } from "./CompletedStepsPanel";

interface WorkflowStep {
  stepKey: string;
  stepTitle: string;
  stepDescription?: string;
  stepNumber: number;
}

interface CompletedStep {
  stepKey: string;
  stepTitle: string;
  stepNumber: number;
  summary: string;
  completedAt: string;
}

interface WorkflowLayoutProps {
  title: string;
  currentStep: WorkflowStep;
  totalSteps: number;
  completedSteps: CompletedStep[];
  children: React.ReactNode;
  onValidateStep: () => void;
  onSaveProgress?: () => void;
  onEditStep?: (stepKey: string) => void;
  isValidateDisabled?: boolean;
  isSaving?: boolean;
}

export const WorkflowLayout: React.FC<WorkflowLayoutProps> = ({
  title,
  currentStep,
  totalSteps,
  completedSteps,
  children,
  onValidateStep,
  onSaveProgress,
  onEditStep,
  isValidateDisabled = false,
  isSaving = false,
}) => {
  return (
    <div className="w-full min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header avec titre et progression */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {title}
          </h1>
          <ProgressBar
            completedSteps={completedSteps.length}
            currentStep={currentStep.stepNumber}
            totalSteps={totalSteps}
          />
        </div>

        {/* Layout 2 colonnes sur desktop, 1 colonne sur mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale (étape actuelle) */}
          <div className="lg:col-span-2">
            <StepCard
              isSaving={isSaving}
              isValidateDisabled={isValidateDisabled}
              stepDescription={currentStep.stepDescription}
              stepNumber={currentStep.stepNumber}
              stepTitle={currentStep.stepTitle}
              totalSteps={totalSteps}
              onSave={onSaveProgress}
              onValidate={onValidateStep}
            >
              {children}
            </StepCard>
          </div>

          {/* Colonne secondaire (historique) */}
          <div className="lg:col-span-1">
            <CompletedStepsPanel
              completedSteps={completedSteps}
              onEdit={onEditStep}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * StepCard Component
 * @version 0.01
 * @date 2025-10-31
 * 
 * Carte affichant l'étape actuelle du workflow
 * Contient le titre, l'avatar et les actions
 */

import { Button } from "@/components/Button";

interface StepCardProps {
  stepTitle: string;
  stepDescription?: string;
  stepNumber: number;
  totalSteps: number;
  children: React.ReactNode;
  onValidate: () => void;
  onSave?: () => void;
  isValidateDisabled?: boolean;
  isSaving?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  stepTitle,
  stepDescription,
  stepNumber,
  totalSteps,
  children,
  onValidate,
  onSave,
  isValidateDisabled = false,
  isSaving = false,
}) => {
  return (
    <div className="w-full bg-zinc-900 rounded-xl overflow-hidden shadow-xl border border-zinc-800">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-zinc-800 to-zinc-900 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border-2 border-indigo-500">
                <span className="text-indigo-400 font-semibold text-sm">
                  {stepNumber}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {stepTitle}
              </h2>
            </div>
            {stepDescription && (
              <p className="text-zinc-400 text-sm ml-11">
                {stepDescription}
              </p>
            )}
          </div>
          <div className="text-zinc-500 text-sm">
            Étape {stepNumber} / {totalSteps}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-zinc-800/50 border-t border-zinc-700 flex justify-between items-center">
        {onSave && (
          <Button
            className="!bg-zinc-700 hover:!bg-zinc-600"
            disabled={isSaving}
            onClick={onSave}
          >
            {isSaving ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Sauvegarde...
              </>
            ) : (
              <>
                💾 Sauvegarder
              </>
            )}
          </Button>
        )}
        <div className="flex-1" />
        <Button
          className="!bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          disabled={isValidateDisabled}
          onClick={onValidate}
        >
          Valider l'étape →
        </Button>
      </div>
    </div>
  );
};

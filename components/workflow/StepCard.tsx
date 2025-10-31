/**
 * StepCard Component
 * @version 0.02
 * @date 2025-10-31
 * 
 * Carte affichant l'étape actuelle du workflow
 * Contient le titre, l'avatar et les actions
 * Design NeoRecrut avec boutons natifs
 */

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
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-lg border-t-4 border-blue-500">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-500">
                <span className="text-blue-600 font-bold text-base">
                  {stepNumber}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-blue-900">
                {stepTitle}
              </h2>
            </div>
            {stepDescription && (
              <p className="text-gray-600 text-sm ml-13">
                {stepDescription}
              </p>
            )}
          </div>
          <div className="text-gray-500 text-sm font-medium">
            Étape {stepNumber} / {totalSteps}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-white">
        {children}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        {onSave && (
          <button
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
          </button>
        )}
        <div className="flex-1" />
        <button
          className="bg-gradient-to-r from-[var(--nc-blue)] to-[var(--nc-cyan)] text-white px-8 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isValidateDisabled}
          onClick={onValidate}
        >
          Valider l'étape →
        </button>
      </div>
    </div>
  );
};

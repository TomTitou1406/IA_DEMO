/**
 * CompletedStepsPanel Component
 * @version 0.01
 * @date 2025-10-31
 * 
 * Panneau affichant les étapes complétées
 * Permet de voir et modifier les étapes précédentes
 */

import { useState } from "react";

interface CompletedStep {
  stepKey: string;
  stepTitle: string;
  stepNumber: number;
  summary: string;
  completedAt: string;
}

interface CompletedStepsPanelProps {
  completedSteps: CompletedStep[];
  onEdit?: (stepKey: string) => void;
}

export const CompletedStepsPanel: React.FC<CompletedStepsPanelProps> = ({
  completedSteps,
  onEdit,
}) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  if (completedSteps.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-green-500 text-xl">✓</span>
        Étapes complétées
      </h3>

      <div className="flex flex-col gap-3">
        {completedSteps.map((step) => {
          const isExpanded = expandedStep === step.stepKey;

          return (
            <div
              key={step.stepKey}
              className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors"
            >
              {/* Header cliquable */}
              <button
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                onClick={() =>
                  setExpandedStep(isExpanded ? null : step.stepKey)
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 border-2 border-green-500">
                    <span className="text-green-600 text-sm font-bold">✓</span>
                  </div>
                  <span className="text-gray-800 font-medium">
                    {step.stepTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium">
                    #{step.stepNumber}
                  </span>
                  <span
                    className={`text-gray-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Contenu expandable */}
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-200 bg-white">
                  <div className="pt-3 flex flex-col gap-3">
                    {/* Résumé */}
                    <div className="text-sm text-gray-700">
                      {step.summary}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-gray-500">
                        Complété le {new Date(step.completedAt).toLocaleDateString('fr-FR')}
                      </span>
                      {onEdit && (
                        <button
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          onClick={() => onEdit(step.stepKey)}
                        >
                          ✏️ Modifier
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

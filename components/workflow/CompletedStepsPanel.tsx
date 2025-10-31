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
    <div className="w-full bg-zinc-900 rounded-xl p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-green-500">✓</span>
        Étapes complétées
      </h3>

      <div className="flex flex-col gap-3">
        {completedSteps.map((step) => {
          const isExpanded = expandedStep === step.stepKey;

          return (
            <div
              key={step.stepKey}
              className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              {/* Header cliquable */}
              <button
                className="w-full px-4 py-3 flex items-center justify-between text-left"
                onClick={() =>
                  setExpandedStep(isExpanded ? null : step.stepKey)
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 border border-green-500">
                    <span className="text-green-400 text-xs">✓</span>
                  </div>
                  <span className="text-white font-medium">
                    {step.stepTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs">
                    #{step.stepNumber}
                  </span>
                  <span
                    className={`text-zinc-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Contenu expandable */}
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-zinc-700">
                  <div className="pt-3 flex flex-col gap-3">
                    {/* Résumé */}
                    <div className="text-sm text-zinc-300">
                      {step.summary}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-zinc-500">
                        Complété le {new Date(step.completedAt).toLocaleDateString('fr-FR')}
                      </span>
                      {onEdit && (
                        <button
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
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

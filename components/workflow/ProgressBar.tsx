/**
 * ProgressBar Component
 * @version 0.01
 * @date 2025-10-31
 * 
 * Barre de progression animée pour les workflows
 * Affiche le pourcentage d'avancement et le nombre d'étapes complétées
 */

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  completedSteps,
}) => {
  const percentage = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Barre de progression */}
      <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-600 ease-in-out"
          style={{ width: `${percentage}%` }}
        >
          {/* Animation de brillance */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>

        {/* Indicateur position actuelle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-600 ease-in-out"
          style={{ left: `calc(${percentage}% - 8px)` }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-indigo-500 rounded-full animate-ping opacity-75" />
        </div>
      </div>

      {/* Texte progression */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-zinc-400">
          {completedSteps} sur {totalSteps} étapes complétées
        </span>
        <span className="text-indigo-400 font-semibold">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

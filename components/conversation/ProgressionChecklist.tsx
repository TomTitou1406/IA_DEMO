'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

interface Step {
  step_key: string;
  step_title: string;
  completed: boolean;
}

interface ProgressionChecklistProps {
  contextId: string;
  entityId: string;
  targetTable: 'entreprises' | 'postes';
  onProgressionChange?: (percentage: number) => void;
}

export default function ProgressionChecklist({
  contextId,
  entityId,
  targetTable,
  onProgressionChange
}: ProgressionChecklistProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProgression = async () => {
    // 1. Charger les steps
    const { data: stepsData } = await supabase
      .from('conversation_steps')
      .select('step_key, step_title, target_field')
      .eq('context_id', contextId)
      .eq('is_required', true)
      .not('target_field', 'is', null)
      .order('step_order');

    if (!stepsData) {
      setLoading(false);
      return;
    }

    // 2. Charger l'entité
    const { data: entity } = await supabase
      .from(targetTable)
      .select('*')
      .eq('id', entityId)
      .single();

    if (!entity) {
      setLoading(false);
      return;
    }

    // 3. Vérifier quels champs sont remplis
    const stepsWithStatus: Step[] = stepsData.map(step => {
      const value = entity[step.target_field];
      const isCompleted = value && (
        typeof value === 'string' ? value.trim().length > 0 :
        Array.isArray(value) ? value.length > 0 :
        value !== null
      );

      // Nettoyer le titre (enlever ce qui est après & ou :)
      const cleanTitle = step.step_title
        .replace(/^(.*?) (&|&amp;|:|,).*$/, '$1')
        .trim();

      return {
        step_key: step.step_key,
        step_title: cleanTitle,
        completed: isCompleted
      };
    });

    const completedCount = stepsWithStatus.filter(s => s.completed).length;
    const percentage = Math.round((completedCount / stepsWithStatus.length) * 100);

    setSteps(stepsWithStatus);
    setCompleted(completedCount);
    setTotal(stepsWithStatus.length);
    setLoading(false);

    if (onProgressionChange) {
      onProgressionChange(percentage);
    }
  };

  useEffect(() => {
    if (contextId && entityId) {
      loadProgression();

      // Recharger toutes les 5 secondes
      const interval = setInterval(loadProgression, 5000);
      return () => clearInterval(interval);
    }
  }, [contextId, entityId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <div key={i} className="h-3 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* En-tête avec titre */}
      <div className="mb-4">
        <h3 className="font-bold text-base mb-3 text-gray-800">📋 Progression</h3>
        
        {/* Barre de progression principale */}
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        
        {/* Pourcentage */}
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-700">
            {completed}/{total} complétés
          </span>
          <span className="text-lg font-bold text-green-600 ml-2">
            ({percentage}%)
          </span>
        </div>
      </div>

      {/* Séparateur */}
      <div className="border-t border-gray-200 my-3"></div>

      {/* Liste des étapes - scrollable */}
      <ul className="space-y-2 flex-1 overflow-y-auto">
        {steps.map(step => (
          <li 
            key={step.step_key}
            className={`flex items-center gap-2 text-sm transition-all duration-300 ${
              step.completed 
                ? 'text-green-600 font-medium' 
                : 'text-gray-400'
            }`}
          >
            <span className="text-base flex-shrink-0">
              {step.completed ? '✅' : '⏳'}
            </span>
            <span className="leading-tight">
              {step.step_title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

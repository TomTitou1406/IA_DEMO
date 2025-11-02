'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/lib/supabaseClient';

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
    const supabase = createClient();

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

      return {
        step_key: step.step_key,
        step_title: step.step_title,
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
      <aside className="w-64 bg-white rounded-xl shadow-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <aside className="w-64 bg-white rounded-xl shadow-lg p-4 h-fit sticky top-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-lg mb-2">📋 Progression</h3>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-center text-sm font-medium text-gray-600 mt-2">
          {completed}/{total} complétés ({percentage}%)
        </div>
      </div>

      {/* Liste des steps */}
      <ul className="space-y-2">
        {steps.map(step => (
          <li 
            key={step.step_key}
            className={`flex items-start gap-2 text-sm transition-colors ${
              step.completed 
                ? 'text-green-600 font-medium' 
                : 'text-gray-400'
            }`}
          >
            <span className="text-base">
              {step.completed ? '✅' : '⏳'}
            </span>
            <span className="flex-1">
              {step.step_title.replace(/^(Histoire|Mission|Produits|Marché|Culture|Localisation|Équipe|Avantages|Perspectives) (&|&amp;|,) .*$/, '$1')}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

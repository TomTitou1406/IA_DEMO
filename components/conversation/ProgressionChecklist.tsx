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

    const { data: entity } = await supabase
      .from(targetTable)
      .select('*')
      .eq('id', entityId)
      .single();

    if (!entity) {
      setLoading(false);
      return;
    }

    const stepsWithStatus: Step[] = stepsData.map(step => {
      const value = entity[step.target_field];
      const isCompleted = value && (
        typeof value === 'string' ? value.trim().length > 0 :
        Array.isArray(value) ? value.length > 0 :
        value !== null
      );

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
      const interval = setInterval(loadProgression, 5000);
      return () => clearInterval(interval);
    }
  }, [contextId, entityId]);

  if (loading) {
    return (
      <div 
        className="bg-white rounded-lg shadow-md p-3 flex flex-col" 
        style={{ 
          height: '500px',
          minHeight: '500px',
          maxHeight: '500px'
        }}
      >
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <div key={i} className="h-2 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-3 flex flex-col" 
      style={{ 
        height: '500px',
        minHeight: '500px',
        maxHeight: '500px'
      }}
    >
      {/* Header compact sur une ligne */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-bold text-sm text-gray-800 whitespace-nowrap">📋 Progression :</h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-600">{percentage}%</span>
            <span className="text-xs font-semibold text-gray-500">({completed}/{total})</span>
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Séparateur */}
      <div className="border-t border-gray-200 mb-2 flex-shrink-0"></div>

      {/* Liste scrollable avec minHeight */}
      <ul className="space-y-1.5 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {steps.map(step => (
          <li 
            key={step.step_key}
            className={`flex items-center gap-1.5 text-xs transition-all ${
              step.completed 
                ? 'text-green-600 font-medium' 
                : 'text-gray-400'
            }`}
          >
            <span className="text-sm flex-shrink-0">
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

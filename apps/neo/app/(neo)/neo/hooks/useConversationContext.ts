/**
 * Hook pour charger un contexte de conversation depuis la BDD
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import type { ConversationContext } from '@/components/ui/InteractiveBlock';

export function useConversationContext(contextKey: string) {
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadContext() {
      try {
        console.log('📥 Chargement contexte:', contextKey);

        const { data, error: dbError } = await supabase
          .from('conversation_contexts')
          .select('*')
          .eq('context_key', contextKey)
          .eq('is_active', true)
          .single();

        if (dbError) throw dbError;
        if (!data) throw new Error('Contexte non trouvé');

        console.log('✅ Contexte chargé:', data.id);

        setContext({
          id: data.id,
          context_key: data.context_key,
          context_type: data.context_type,
          title: data.title,
          subtitle: data.subtitle,
          avatar_preview_image: data.avatar_preview_image,
          avatar_name: data.avatar_name,
          knowledge_id: data.knowledge_id,
          voice_rate: data.voice_rate,
          language: data.language,
          initial_message_new: data.initial_message_new,
          initial_message_resume: data.initial_message_resume,
          is_active: data.is_active,
        });

        setLoading(false);
      } catch (err) {
        console.error('❌ Erreur chargement contexte:', err);
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
        setLoading(false);
      }
    }

    loadContext();
  }, [contextKey]);

  return { context, loading, error };
}

import { useState, useEffect } from 'react';

interface StaticKB {
  id: string;
  heygen_kb_id: string;
  heygen_kb_name: string;
  kb_specialty: string;
}

export function useStaticKnowledgeBase(specialty: string) {
  const [kb, setKb] = useState<StaticKB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadKB() {
      try {
        const response = await fetch(
          `/api/knowledge-base/get-static?specialty=${specialty}`
        );
        
        if (!response.ok) {
          throw new Error('KB non trouvée');
        }
        
        const { kb } = await response.json();
        setKb(kb);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement KB');
      } finally {
        setLoading(false);
      }
    }
    
    loadKB();
  }, [specialty]);
  
  return { kb, loading, error };
}

"use client";

import { useState } from 'react';

export default function TestExtractPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testExtraction = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/openai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entreprise_id: '39861555-8d18-4022-8829-d65ffedd6178',
          target_table: 'entreprises',
        }),
      });

      const data = await response.json();
      setResult(data);
      
      console.log('📊 Résultat:', data);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setResult({ success: false, error: 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">🧪 Test Extraction OpenAI</h1>
      
      <button
        onClick={testExtraction}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '⏳ Extraction en cours...' : '🚀 Lancer l\'extraction'}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-white border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">
            {result.success ? '✅ Succès' : '❌ Erreur'}
          </h2>
          
          {result.success && (
            <>
              <div className="mb-4 text-sm text-gray-600">
                <p>Champs extraits: {result.extractedFields?.length || 0}</p>
                <p>Coût total: ${result.totalCost?.toFixed(6)}</p>
                <p>Tokens: {result.totalTokens}</p>
              </div>
              
              <div className="space-y-3">
                {result.results?.map((r: any, idx: number) => (
                  <div 
                    key={idx}
                    className={`p-3 border rounded ${
                      r.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="font-semibold mb-1">
                      {r.success ? '✅' : '❌'} {r.field}
                    </div>
                    {r.content && (
                      <div className="text-sm text-gray-700 mt-2">
                        {r.content.substring(0, 200)}...
                      </div>
                    )}
                    {r.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Erreur: {r.error}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {r.tokens} tokens · ${r.cost?.toFixed(6)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {result.error && (
            <p className="text-red-600">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

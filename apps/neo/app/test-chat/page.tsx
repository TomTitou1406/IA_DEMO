"use client";

/**
 * @file /app/test-chat/page.tsx
 * @version 1.0
 * @description Page de test pour l'API OpenAI Chat
 */

import { useState } from 'react';
import Link from 'next/link';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function TestChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Parlez-moi de votre entreprise.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    cost: number;
    tokens: number;
    model: string;
  } | null>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptKey: 'chat_acquisition_entreprise',
          messages: [...messages, userMsg],
          userId: '00000000-0000-0000-0000-000000000001',
          conversationId: 'test-' + Date.now(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMsg]);
        
        setStats({
          cost: data.cost,
          tokens: data.usage.totalTokens,
          model: data.model,
        });
        
        console.log('💰 Coût:', `$${data.cost.toFixed(6)}`);
        console.log('📊 Tokens:', data.usage.totalTokens);
        console.log('🤖 Model:', data.model);
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Bonjour ! Parlez-moi de votre entreprise.',
        timestamp: new Date(),
      }
    ]);
    setStats(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🧪 Test Chat OpenAI
              </h1>
              <p className="text-gray-600">
                Test de l'API conversationnelle pour acquisition entreprise
              </p>
            </div>
            <Link 
              href="/admin"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
            >
              ← Retour Admin
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-500">Coût:</span>
                <span className="ml-2 font-mono font-semibold text-green-600">
                  ${stats.cost.toFixed(6)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Tokens:</span>
                <span className="ml-2 font-mono font-semibold text-blue-600">
                  {stats.tokens}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Model:</span>
                <span className="ml-2 font-mono text-gray-700">
                  {stats.model}
                </span>
              </div>
            </div>
            <button
              onClick={resetChat}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              🔄 Reset
            </button>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col" style={{ height: '600px' }}>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <p className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 border border-gray-200 px-4 py-3 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Tapez votre message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? '...' : 'Envoyer'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Appuyez sur Entrée pour envoyer
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Teste la conversation comme si tu présentais ton entreprise</li>
            <li>• L'IA pose des questions sur histoire, mission, produits, etc.</li>
            <li>• Les stats (coût, tokens) s'affichent après chaque réponse</li>
            <li>• Utilise "Reset" pour recommencer une conversation</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

"use client";

/**
 * @file /app/test-chat/page.tsx
 * @version 1.0
 * @description Page de test pour l'API OpenAI Chat
 */

import { useState } from 'react';

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Test Chat OpenAI
          </h1>
          <p className="text-

'use client';

import { useState } from 'react';
import { InteractiveBlock } from '@neorecrut/shared-avatar';
import { Button } from '@neorecrut/shared-ui';

export default function TestAvatarPage() {
  const [showAvatar, setShowAvatar] = useState(false);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          🧪 Test InteractiveBlock depuis DIY
        </h1>

        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold text-green-400 mb-4">
            ✅ Composant partagé : InteractiveBlock
          </h2>
          <p className="text-gray-300 mb-4">
            Ce composant vient de @neorecrut/shared-avatar et fonctionne dans DIY !
          </p>
          
          <Button onClick={() => setShowAvatar(!showAvatar)}>
            {showAvatar ? 'Masquer' : 'Afficher'} InteractiveBlock
          </Button>
        </div>

        {showAvatar && (
          <div className="bg-gray-900 p-6 rounded-lg">
            <p className="text-white mb-4">
              Note : InteractiveBlock nécessite une config complète (Supabase, HeyGen).
              Pour l'instant, on vérifie juste qu'il s'importe sans erreur !
            </p>
            <div className="text-green-400 font-mono text-sm">
              import &#123; InteractiveBlock &#125; from '@neorecrut/shared-avatar'; ✅
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
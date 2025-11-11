'use client';

import { useState } from 'react';
import { Button } from '@neorecrut/shared-ui';
import { AvatarConfig } from '@neorecrut/shared-avatar';

export default function TestAvatarPage() {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          🧪 Test Composants Partagés depuis DIY
        </h1>

        <div className="space-y-6">
          {/* Test Button */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-semibold text-green-400 mb-4">
              ✅ Button depuis @neorecrut/shared-ui
            </h2>
            <Button onClick={() => alert('Button partagé fonctionne !')}>
              Cliquer pour tester
            </Button>
          </div>

          {/* Test AvatarConfig */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-semibold text-green-400 mb-4">
              ✅ AvatarConfig depuis @neorecrut/shared-avatar
            </h2>
            <Button onClick={() => setShowConfig(!showConfig)}>
              {showConfig ? 'Masquer' : 'Afficher'} la configuration Avatar
            </Button>
            
            {showConfig && (
              <div className="mt-4 p-4 bg-gray-900 rounded">
                <p className="text-gray-300 mb-4">
                  Le composant AvatarConfig est bien importé depuis le package partagé !
                </p>
                <div className="text-green-400 font-mono text-sm">
                  import &#123; AvatarConfig &#125; from '@neorecrut/shared-avatar'; ✅
                </div>
              </div>
            )}
          </div>

          {/* Info InteractiveBlock */}
          <div className="p-6 bg-gray-700 rounded-lg border-2 border-yellow-500">
            <h2 className="text-2xl font-semibold text-yellow-400 mb-4">
              ℹ️ Note sur InteractiveBlock
            </h2>
            <p className="text-gray-300">
              InteractiveBlock est spécifique à Neo et utilise useNeoAvatar.
              DIY aura son propre composant d'interaction adapté à ses besoins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Button } from '@neorecrut/shared-ui';

export default function TestAvatarPage() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          🧪 Test Button Partagé depuis DIY
        </h1>

        <div className="p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold text-green-400 mb-4">
            ✅ Button depuis @neorecrut/shared-ui
          </h2>
          <Button onClick={() => alert('Button partagé fonctionne !')}>
            Cliquer pour tester le Button partagé
          </Button>
        </div>
      </div>
    </div>
  );
}

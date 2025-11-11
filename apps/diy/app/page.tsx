'use client';

import { Button } from '@neorecrut/shared-ui';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold text-white mb-4">
          🎉 NeoRecrut DIY
        </h1>
        
        <p className="text-xl text-gray-300 mb-8">
          Application DIY utilisant les composants partagés du monorepo
        </p>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => alert('Button depuis @neorecrut/shared-ui !')}>
            Tester le Button partagé
          </Button>
        </div>

        <div className="mt-12 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold text-green-400 mb-4">
            ✅ Packages partagés importés avec succès !
          </h2>
          <p className="text-gray-400">
            Cette page utilise des composants depuis @neorecrut/shared-ui
          </p>
        </div>
      </div>
    </div>
  );
}
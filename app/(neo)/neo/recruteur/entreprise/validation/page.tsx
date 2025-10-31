"use client";

/**
 * Page Validation Entreprise - Récapitulatif
 * @version 1.0
 * @date 2025-10-31
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EntrepriseData {
  histoire: any;
  mission: any;
  produits: any;
  marche: any;
  culture: any;
  equipe: any;
  avantages: any;
  localisation: any;
  perspectives: any;
}

export default function EntrepriseValidationPage() {
  const router = useRouter();
  const [entrepriseData, setEntrepriseData] = useState<EntrepriseData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Récupérer les données depuis localStorage
    const data = localStorage.getItem('entreprise_data');
    if (data) {
      setEntrepriseData(JSON.parse(data));
    } else {
      // Pas de données → retour conversation
      router.push('/neo/recruteur/entreprise');
    }
  }, [router]);

  const handleValidate = async () => {
    setIsSaving(true);
    
    try {
      // TODO: Sauvegarder en BDD
      const response = await fetch('/api/entreprise/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entrepriseData),
      });

      if (response.ok) {
        // Nettoyer localStorage
        localStorage.removeItem('entreprise_data');
        
        // Rediriger vers création poste
        router.push('/neo/recruteur/poste');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    router.push('/neo/recruteur/entreprise');
  };

  if (!entrepriseData) {
    return <div className="p-6">Chargement...</div>;
  }

  const sections = [
    { key: 'histoire', title: 'Histoire', icon: '📖' },
    { key: 'mission', title: 'Mission & Vision', icon: '🎯' },
    { key: 'produits', title: 'Produits & Services', icon: '🛍️' },
    { key: 'marche', title: 'Marché & Clients', icon: '🌍' },
    { key: 'culture', title: 'Culture d\'entreprise', icon: '💡' },
    { key: 'equipe', title: 'Équipe & Organisation', icon: '👥' },
    { key: 'avantages', title: 'Avantages & Conditions', icon: '✨' },
    { key: 'localisation', title: 'Localisation', icon: '📍' },
    { key: 'perspectives', title: 'Perspectives', icon: '🚀' },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            ✓ Récapitulatif de votre entreprise
          </h1>
          <p className="text-gray-600">
            Vérifiez les informations collectées avant de valider.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.key}
              className="bg-white rounded-xl shadow border border-gray-200 p-6"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>{section.icon}</span>
                {section.title}
              </h3>
              <div className="text-gray-700 space-y-2">
                {/* Affichage des données collectées */}
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(entrepriseData[section.key as keyof EntrepriseData], null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4 justify-end">
          <button
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
            onClick={handleEdit}
          >
            ← Modifier
          </button>
          <button
            className="bg-gradient-to-r from-[var(--nc-blue)] to-[var(--nc-cyan)] text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition shadow-lg disabled:opacity-50"
            disabled={isSaving}
            onClick={handleValidate}
          >
            {isSaving ? 'Sauvegarde...' : 'Valider et continuer →'}
          </button>
        </div>
      </div>
    </div>
  );
}

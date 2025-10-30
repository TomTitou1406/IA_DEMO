/**
 * API Route: List HeyGen Knowledge Bases
 * @file app/api/list-kb/route.ts
 * @version 0.01
 * @date 2025-10-30
 * 
 * Route sécurisée côté serveur pour lister les KB HeyGen
 * L'API Key est lue depuis process.env côté serveur uniquement
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Récupérer l'API Key depuis l'environnement (côté serveur uniquement)
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!apiKey) {
      console.error('❌ HEYGEN_API_KEY non configurée dans .env');
      return NextResponse.json(
        { error: 'Configuration serveur incorrecte' },
        { status: 500 }
      );
    }

    console.log('📋 [API Route] Récupération de la liste des KB HeyGen...');

    // Appel API HeyGen pour lister les KB
    const response = await fetch('https://api.heygen.com/v1/streaming/knowledge_base/list', {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    // Vérifier le statut de la réponse
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [API Route] Erreur API HeyGen:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: `Erreur API HeyGen: ${response.status}`,
          details: errorData 
        },
        { status: response.status }
      );
    }

    // Parser la réponse HeyGen
    const data = await response.json();

    console.log(`✅ [API Route] Liste des KB récupérée:`, data);

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('❌ [API Route] Erreur:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false 
      },
      { status: 500 }
    );
  }
}

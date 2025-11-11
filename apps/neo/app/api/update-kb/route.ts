/**
 * API Route: Update HeyGen Knowledge Base
 * @file app/api/update-kb/route.ts
 * @version 0.09 - VERSION FINALE QUI FONCTIONNE
 * @date 2025-10-30
 * 
 * Route sécurisée côté serveur pour mettre à jour les KB HeyGen
 * L'API Key est lue depuis process.env côté serveur uniquement
 * 
 * ENDPOINT CORRECT:
 * POST https://api.heygen.com/v1/streaming/knowledge_base/{knowledgeId}
 * 
 * BODY OBLIGATOIRE:
 * {
 *   "name": "nom de la KB",
 *   "opening": "message d'ouverture",
 *   "prompt": "contenu de la KB"
 * }
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Parser le body
    const { knowledgeId, content, name, opening } = await request.json();

    // Validation des paramètres
    if (!knowledgeId || !content) {
      return NextResponse.json(
        { error: 'knowledgeId et content requis' },
        { status: 400 }
      );
    }

    // Récupérer l'API Key depuis l'environnement (côté serveur uniquement)
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!apiKey) {
      console.error('❌ HEYGEN_API_KEY non configurée dans .env');
      return NextResponse.json(
        { error: 'Configuration serveur incorrecte' },
        { status: 500 }
      );
    }

    console.log(`📤 [API Route] Mise à jour KB HeyGen: ${knowledgeId} (${content.length} caractères)`);

    // Appel API HeyGen - L'ID est dans l'URL, pas dans le body
    const response = await fetch(`https://api.heygen.com/v1/streaming/knowledge_base/${knowledgeId}`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        name: name || 'Knowledge Base',  // Champ obligatoire
        opening: opening || 'Hello!',    // Champ optionnel mais recommandé
        prompt: content,
      }),
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

    console.log(`✅ [API Route] KB mise à jour avec succès: ${knowledgeId}`);

    return NextResponse.json({
      success: true,
      message: 'KB mise à jour avec succès',
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

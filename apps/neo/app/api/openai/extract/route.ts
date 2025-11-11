/**
 * @file /app/api/openai/extract/route.ts
 * @version 1.0
 * @description API pour extraire et structurer les données depuis raw_conversation
 * 
 * Usage:
 * POST /api/openai/extract
 * Body: {
 *   entreprise_id: string,
 *   target_table: 'entreprises' | 'postes'
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';
import { callOpenAI } from '@/app/lib/services/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 secondes max (extraction peut être longue)

interface RequestBody {
  entreprise_id: string;
  target_table: 'entreprises' | 'postes';
  fields?: string[]; // Optionnel : extraire seulement certains champs
}

interface ExtractionResult {
  field: string;
  content: string;
  tokens: number;
  cost: number;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API /openai/extract - Début');
    
    // 1. Parser le body
    const body: RequestBody = await request.json();
    const { entreprise_id, target_table, fields } = body;
    
    // 2. Validation
    if (!entreprise_id) {
      return NextResponse.json(
        { success: false, error: 'entreprise_id requis' },
        { status: 400 }
      );
    }
    
    if (!target_table || !['entreprises', 'postes'].includes(target_table)) {
      return NextResponse.json(
        { success: false, error: 'target_table doit être "entreprises" ou "postes"' },
        { status: 400 }
      );
    }
    
    console.log('📋 Extraction pour:', { entreprise_id, target_table });
    
    // 3. Récupérer raw_conversation depuis la BDD
    const { data: entity, error: fetchError } = await supabase
      .from(target_table)
      .select('raw_conversation')
      .eq('id', entreprise_id)
      .single();
    
    if (fetchError || !entity) {
      console.error('❌ Erreur récupération entité:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Entité non trouvée' },
        { status: 404 }
      );
    }
    
    const rawConversation = entity.raw_conversation;
    
    if (!rawConversation || rawConversation.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune conversation à extraire' },
        { status: 400 }
      );
    }
    
    console.log('📥 Conversation chargée:', rawConversation.length, 'messages');
    
    // 4. Formater la conversation pour extraction
    const conversationText = rawConversation
      .map((msg: any) => `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    // 5. Définir les champs à extraire
    const fieldsToExtract = fields || [
      'histoire',
      'mission',
      'produits_services',
      'marche_cible',
      'culture',
      'equipe_structure',
      'avantages',
      'localisation_details',
      'perspectives'
    ];
    
    console.log('🎯 Extraction de', fieldsToExtract.length, 'champs');
    
    // 6. Extraire chaque champ via OpenAI
    const results: ExtractionResult[] = [];
    const extractedData: Record<string, string> = {};
    let totalCost = 0;
    let totalTokens = 0;
    
    for (const field of fieldsToExtract) {
      try {
        console.log(`🔄 Extraction: ${field}...`);
        
        const response = await callOpenAI({
          promptKey: `extract_${field}`,
          variables: {
            raw_conversation: conversationText,
          },
          metadata: {
            entreprise_id,
            target_table,
            field,
          },
        });
        
        if (response.success && response.content.trim().length > 0) {
          extractedData[field] = response.content.trim();
          totalCost += response.cost;
          totalTokens += response.usage.totalTokens;
          
          results.push({
            field,
            content: response.content.trim(),
            tokens: response.usage.totalTokens,
            cost: response.cost,
            success: true,
          });
          
          console.log(`✅ ${field}: ${response.content.substring(0, 50)}... (${response.usage.totalTokens} tokens)`);
        } else {
          console.log(`⚠️ ${field}: Aucun contenu extrait`);
          
          results.push({
            field,
            content: '',
            tokens: 0,
            cost: 0,
            success: false,
            error: response.error || 'Aucun contenu extrait',
          });
        }
        
      } catch (error) {
        console.error(`❌ Erreur extraction ${field}:`, error);
        
        results.push({
          field,
          content: '',
          tokens: 0,
          cost: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }
    
    console.log('📊 Extraction terminée:', {
      fieldsExtracted: Object.keys(extractedData).length,
      totalCost: `$${totalCost.toFixed(6)}`,
      totalTokens,
    });
    
    // 7. Sauvegarder dans la BDD
    if (Object.keys(extractedData).length > 0) {
      const { error: updateError } = await supabase
        .from(target_table)
        .update({
          ...extractedData,
          extraction_metadata: {
            extraction_date: new Date().toISOString(),
            total_cost: totalCost,
            total_tokens: totalTokens,
            fields_extracted: Object.keys(extractedData),
            extraction_results: results,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', entreprise_id);
      
      if (updateError) {
        console.error('❌ Erreur sauvegarde:', updateError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Erreur lors de la sauvegarde',
            results // On retourne quand même les résultats
          },
          { status: 500 }
        );
      }
      
      console.log('✅ Données sauvegardées en BDD');
    }
    
    // 8. Retourner les résultats
    return NextResponse.json({
      success: true,
      extractedFields: Object.keys(extractedData),
      totalCost,
      totalTokens,
      results,
      message: `${Object.keys(extractedData).length} champs extraits avec succès`,
    });
    
  } catch (error) {
    console.error('❌ Erreur API /openai/extract:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur interne' 
      },
      { status: 500 }
    );
  }
}

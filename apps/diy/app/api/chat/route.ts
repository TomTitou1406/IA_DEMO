/**
 * /api/chat/route.ts
 * 
 * Route API principale pour le chat IA Papibricole
 * Supporte les prompts génériques ET les expertises métier
 * Injecte le contexte du chantier dans le prompt
 * 
 * @version 2.1
 * @date 28 novembre 2025
 */
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPrompt, type PromptContext } from '@/app/lib/services/promptService';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Supabase client pour récupérer le contexte
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Charge les données du chantier et les formate en texte lisible
 */
async function loadChantierContext(chantierId: string): Promise<string> {
  try {
    const { data: chantier, error } = await supabase
      .from('chantiers')
      .select('*')
      .eq('id', chantierId)
      .single();

    if (error || !chantier) {
      console.warn('Chantier non trouvé:', chantierId);
      return '';
    }

    const meta = chantier.metadata || {};
    
    // Construire le contexte lisible
    let context = `## DONNÉES ACTUELLES DU CHANTIER\n\n`;
    
    context += `**Titre :** ${chantier.titre || 'Non défini'}\n`;
    context += `**Description :** ${chantier.description || 'Non définie'}\n`;
    
    if (meta.surface_m2) context += `**Surface :** ${meta.surface_m2} m²\n`;
    if (meta.style_souhaite) context += `**Style :** ${meta.style_souhaite}\n`;
    if (chantier.budget_initial || meta.budget_max) {
      context += `**Budget :** ${chantier.budget_initial || meta.budget_max} € ${meta.budget_inclut_materiaux ? '(matériaux inclus)' : ''}\n`;
    }
    if (meta.disponibilite_heures_semaine) context += `**Disponibilité :** ${meta.disponibilite_heures_semaine}h/semaine\n`;
    if (meta.deadline_semaines) context += `**Objectif :** ${meta.deadline_semaines} semaines\n`;
    
    if (meta.etat_existant) context += `**État existant :** ${meta.etat_existant}\n`;
    
    if (meta.equipements_souhaites && meta.equipements_souhaites.length > 0) {
      context += `**Équipements à installer :** ${meta.equipements_souhaites.join(', ')}\n`;
    }
    
    if (meta.elements_a_deposer && meta.elements_a_deposer.length > 0) {
      context += `**Éléments à déposer :** ${meta.elements_a_deposer.join(', ')}\n`;
    }
    
    if (meta.elements_a_conserver && meta.elements_a_conserver.length > 0) {
      context += `**Éléments à conserver :** ${meta.elements_a_conserver.join(', ')}\n`;
    }
    
    if (meta.reseaux) {
      const reseauxStatus = [];
      if (meta.reseaux.electricite_a_refaire) reseauxStatus.push('Électricité à refaire');
      if (meta.reseaux.plomberie_a_refaire) reseauxStatus.push('Plomberie à refaire');
      if (meta.reseaux.ventilation_a_prevoir) reseauxStatus.push('Ventilation à prévoir');
      if (reseauxStatus.length > 0) {
        context += `**Réseaux :** ${reseauxStatus.join(', ')}\n`;
      } else {
        context += `**Réseaux :** OK (rien à refaire)\n`;
      }
    }
    
    if (meta.competences_ok && meta.competences_ok.length > 0) {
      context += `**Compétences OK :** ${meta.competences_ok.join(', ')}\n`;
    }
    
    if (meta.competences_faibles && meta.competences_faibles.length > 0) {
      context += `**Compétences faibles :** ${meta.competences_faibles.join(', ')}\n`;
    }
    
    if (meta.travaux_pro_suggeres && meta.travaux_pro_suggeres.length > 0) {
      context += `**Travaux pro suggérés :** ${meta.travaux_pro_suggeres.join(', ')}\n`;
    }
    
    if (meta.contraintes) context += `**Contraintes :** ${meta.contraintes}\n`;

    console.log('📋 CHANTIER CONTEXT CHARGÉ:', context);
    
    return context;
  } catch (err) {
    console.error('Erreur chargement contexte chantier:', err);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      messages, 
      context,
      isVoiceMode, 
      pageContext,
      expertiseCode,
      promptContext
    } = await request.json();

    console.log('📋 promptContext reçu:', promptContext);

    // Charger le contexte du chantier si disponible
    let chantierContext = '';
    if (promptContext?.chantierId && promptContext.chantierId !== 'nouveau') {
      chantierContext = await loadChantierContext(promptContext.chantierId);
    }

    // Construire le contexte structuré pour le prompt
    const structuredContext: PromptContext = {
      ...promptContext,
      additionalContext: context
    };

    // Récupérer le prompt via la fonction unifiée
    const promptConfig = await getPrompt({
      expertiseCode,
      pageContext: pageContext || 'chat',
      context: structuredContext,
      additionalContext: context
    });

    // Remplacer {{CHANTIER_CONTEXT}} par les vraies données
    let finalPrompt = promptConfig.systemPrompt;
    if (chantierContext) {
      finalPrompt = finalPrompt.replace('{{CHANTIER_CONTEXT}}', chantierContext);
    } else {
      finalPrompt = finalPrompt.replace('{{CHANTIER_CONTEXT}}', '(Aucune donnée de chantier disponible)');
    }

    let maxTokens = 2000;

    // Ajustements pour le mode vocal
    if (isVoiceMode) {
      finalPrompt += `

🎤 MODE VOCAL ACTIVÉ :
RÈGLES CONVERSATIONNELLES :
- Réponds de manière CONCISE mais COMPLÈTE
- Privilégie 2-3 phrases, mais adapte selon le besoin
- Si liste nécessaire : énumère NATURELLEMENT sans numéros
  ❌ Mauvais : "1 : ceci, 2 : cela, 3 : autre"
  ✅ Bon : "Tu auras besoin de ceci, de cela et d'autre chose"
- Utilise des connecteurs naturels : "d'abord", "ensuite", "enfin", "aussi"
- Reste conversationnel, comme si tu parlais à un ami
- Le BON SENS prime : si 5 étapes nécessaires, cite les 5
- Sois clair mais agréable à écouter
- N'utilise JAMAIS de formatage Markdown (**, __, etc.) car c'est pour l'audio`;
    }

    const systemMessage = {
      role: 'system' as const,
      content: finalPrompt
    };

    // Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...messages],
      temperature: 0.4,
      max_tokens: maxTokens
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
      promptUsed: promptConfig.code,
      promptSource: promptConfig.source,
      expertiseNom: promptConfig.expertiseNom || null,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la réponse' },
      { status: 500 }
    );
  }
}

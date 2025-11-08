/**
 * Génère un message de reprise contextualisé
 */

import { supabase } from '@/app/lib/supabaseClient';

interface ResumeContext {
  completedFields: string[];
  nextField: string;
  totalFields: number;
  completedCount: number;
  percentage: number;
}

/**
 * Récupère l'état de progression depuis la BDD
 */
export async function getResumeContext(
  contextId: string,
  entityId: string,
  targetTable: 'entreprises' | 'postes'
): Promise<ResumeContext> {
  
  // Mapping des champs selon le contexte
  const fieldMapping = {
    '0447e09c-a2bb-4090-b279-01aaf8de1a59': { // acquisition_entreprise
      fields: [
        'histoire',
        'mission',
        'produits',
        'marche',
        'culture',
        'equipe',
        'avantages',
        'localisation',
        'perspectives'
      ],
      labels: {
        histoire: "Histoire de l'entreprise",
        mission: "Mission et vision",
        produits: "Produits et services",
        marche: "Marché cible",
        culture: "Culture d'entreprise",
        equipe: "Équipe et organisation",
        avantages: "Avantages employés",
        localisation: "Localisation",
        perspectives: "Perspectives d'avenir"
      }
    }
  };

  const config = fieldMapping[contextId];
  if (!config) {
    throw new Error(`Context ${contextId} non configuré`);
  }

  // Récupérer l'entité depuis la BDD
  const { data, error } = await supabase
    .from(targetTable)
    .select(config.fields.join(','))
    .eq('id', entityId)
    .single();

  if (error || !data) {
    throw new Error('Entité non trouvée');
  }

  // Analyser les champs complétés
  const completedFields: string[] = [];
  let nextField = config.fields[0];

  for (const field of config.fields) {
    const value = data[field];
    const isCompleted = value && value.trim().length > 0;
    
    if (isCompleted) {
      completedFields.push(field);
    } else if (!nextField || completedFields.length === config.fields.indexOf(field)) {
      // Premier champ vide = prochain à compléter
      nextField = field;
      break;
    }
  }

  return {
    completedFields,
    nextField,
    totalFields: config.fields.length,
    completedCount: completedFields.length,
    percentage: Math.round((completedFields.length / config.fields.length) * 100)
  };
}

/**
 * Génère le message de reprise contextualisé
 */
export function generateResumeMessage(
  context: ResumeContext,
  contextId: string
): string {
  
  const fieldMapping = {
    '0447e09c-a2bb-4090-b279-01aaf8de1a59': {
      labels: {
        histoire: "l'histoire de votre entreprise",
        mission: "votre mission et vision",
        produits: "vos produits et services",
        marche: "votre marché cible",
        culture: "votre culture d'entreprise",
        equipe: "votre équipe",
        avantages: "vos avantages employés",
        localisation: "votre localisation",
        perspectives: "vos perspectives d'avenir"
      },
      questions: {
        marche: "Commençons par votre marché cible. Qui sont vos clients principaux et quelle est votre proposition de valeur ?",
        culture: "Parlons maintenant de votre culture d'entreprise. Quelles sont vos valeurs fondamentales ?",
        equipe: "Décrivez-moi votre équipe. Combien êtes-vous et quelle est votre organisation ?",
        avantages: "Quels avantages offrez-vous à vos employés ?",
        localisation: "Où êtes-vous situé ? Travaillez-vous en remote, hybride ou en présentiel ?",
        perspectives: "Enfin, quelles sont vos perspectives d'avenir et vos objectifs de croissance ?"
      }
    }
  };

  const config = fieldMapping[contextId];
  if (!config) return "Bienvenue ! Reprenons notre conversation.";

  // Si tout est complété
  if (context.completedCount === context.totalFields) {
    return "Parfait ! Nous avons complété tous les aspects de votre profil. Souhaitez-vous vérifier ou modifier quelque chose ?";
  }

  // Si rien n'est complété
  if (context.completedCount === 0) {
    return "Bonjour ! Je suis là pour vous aider à créer le profil complet de votre entreprise. Je vais vous poser des questions sur 10 aspects clés de votre organisation. Prêt à commencer par l'histoire de votre entreprise ?";
  }

  // Message de reprise contextualisé
  const completedLabels = context.completedFields
    .map(f => config.labels[f])
    .filter(Boolean);

  const nextQuestion = config.questions[context.nextField] || 
    `Parlons maintenant de ${config.labels[context.nextField]}.`;

  return `Bienvenue ! Je vois que nous avons déjà parlé de ${completedLabels.join(', ')}. ${nextQuestion}`;
}

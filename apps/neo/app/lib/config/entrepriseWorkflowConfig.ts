/**
 * Workflow Entreprise - Configuration des étapes
 * @version 0.01
 * @date 2025-10-31
 * 
 * Définition des 10 étapes du workflow de création d'entreprise
 */

import { WorkflowStep } from '@/app/(neo)/neo/hooks/useWorkflowManager';

export const ENTREPRISE_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stepKey: 'histoire',
    stepTitle: 'Histoire de l\'entreprise',
    stepDescription: 'Parlez-moi de vos origines et de votre parcours',
    stepNumber: 1,
    stepType: 'conversation',
    contextKey: 'entreprise_histoire',
  },
  {
    stepKey: 'mission',
    stepTitle: 'Mission et vision',
    stepDescription: 'Quelle est votre raison d\'être et vos ambitions ?',
    stepNumber: 2,
    stepType: 'conversation',
    contextKey: 'entreprise_mission',
  },
  {
    stepKey: 'produits',
    stepTitle: 'Produits et services',
    stepDescription: 'Que proposez-vous à vos clients ?',
    stepNumber: 3,
    stepType: 'conversation',
    contextKey: 'entreprise_produits',
  },
  {
    stepKey: 'marche',
    stepTitle: 'Marché et clients',
    stepDescription: 'Qui sont vos clients et quel est votre marché ?',
    stepNumber: 4,
    stepType: 'conversation',
    contextKey: 'entreprise_marche',
  },
  {
    stepKey: 'culture',
    stepTitle: 'Culture d\'entreprise',
    stepDescription: 'Quelles sont vos valeurs et votre culture ?',
    stepNumber: 5,
    stepType: 'conversation',
    contextKey: 'entreprise_culture',
  },
  {
    stepKey: 'equipe',
    stepTitle: 'Équipe et organisation',
    stepDescription: 'Comment est organisée votre équipe ?',
    stepNumber: 6,
    stepType: 'conversation',
    contextKey: 'entreprise_equipe',
  },
  {
    stepKey: 'avantages',
    stepTitle: 'Avantages et conditions',
    stepDescription: 'Quels avantages proposez-vous à vos collaborateurs ?',
    stepNumber: 7,
    stepType: 'conversation',
    contextKey: 'entreprise_avantages',
  },
  {
    stepKey: 'localisation',
    stepTitle: 'Localisation et bureaux',
    stepDescription: 'Où êtes-vous situés ? Télétravail possible ?',
    stepNumber: 8,
    stepType: 'conversation',
    contextKey: 'entreprise_localisation',
  },
  {
    stepKey: 'perspectives',
    stepTitle: 'Perspectives et ambitions',
    stepDescription: 'Quels sont vos projets futurs ?',
    stepNumber: 9,
    stepType: 'conversation',
    contextKey: 'entreprise_perspectives',
  },
  {
    stepKey: 'validation',
    stepTitle: 'Validation finale',
    stepDescription: 'Vérifiez et validez les informations collectées',
    stepNumber: 10,
    stepType: 'validation',
  },
];

export const ENTREPRISE_WORKFLOW_TITLE = '📋 Créer votre entreprise';

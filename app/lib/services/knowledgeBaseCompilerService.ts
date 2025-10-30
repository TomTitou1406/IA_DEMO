/**
 * Knowledge Base Compiler Service v0.05
 * 
 * Service de compilation et assignation des Knowledge Bases HeyGen pour les postes.
 * Orchestre le processus complet :
 * 1. Récupération des données du poste
 * 2. Assignation des 3 KB depuis le pool
 * 3. Formatage du contenu spécifique par phase
 * 4. Mise à jour via API HeyGen
 * 5. Sauvegarde en BDD
 * 
 * @author NeoRecrut Team
 * @date 2025-10-30
 * @version 0.05 - Correction chemin import knowledgeBasePoolService
 */

import { supabase } from "@/app/lib/supabaseClient";
import { assignKBToPoste, releaseKBFromPoste } from '@/app/lib/services/knowledgeBasePoolService';

// Types
interface CompilationResult {
  success: boolean;
  kb_decouverte_id?: string | null;
  kb_preselection_id?: string | null;
  kb_selection_id?: string | null;
  message?: string;
  error?: string;
}

interface PosteData {
  id: string;
  titre: string;
  description: string | null;
  entreprise_id: string;
  
  // Localisation
  ville: string | null;
  pays: string | null;
  remote_possible: boolean | null;
  remote_partiel: boolean | null;
  remote_complet: boolean | null;
  
  // Contrat
  type_contrat: string | null;
  date_debut_souhaitee: string | null;
  
  // Salaire
  salaire_min: number | null;
  salaire_max: number | null;
  devise: string | null;
  avantages: string | null;
  
  // Formation & Expérience
  niveau_etude_min: string | null;
  experience_min_annees: number | null;
  seniorite: string | null;
  
  // Workflow phases
  definition_data: Record<string, any>;
  criteres_redhibitoires: Record<string, any>;
  competences: Record<string, any>;
  job_description: string | null;
  job_offer: string | null;
  
  // Entreprise (jointure)
  entreprise?: {
    nom: string;
    secteur: string | null;
    description: string | null;
    ville: string | null;
    pays: string | null;
    taille: string | null;
    site_web: string | null;
  };
}

/**
 * Compile et assigne les 3 Knowledge Bases HeyGen pour un poste
 * 
 * @param posteId - UUID du poste à compiler
 * @returns Résultat de la compilation avec les IDs des KB assignées
 * 
 * @example
 * const result = await compileKnowledgeBases('uuid-du-poste');
 * if (result.success) {
 *   console.log('KB compilées:', result);
 * }
 */
export async function compileKnowledgeBases(posteId: string): Promise<CompilationResult> {
  console.log(`🔄 [KB Compiler] Démarrage compilation pour poste: ${posteId}`);

  try {
    // ====================================================================
    // ÉTAPE 2 : Récupération des données du poste
    // ====================================================================
    console.log(`📊 [KB Compiler] Récupération des données du poste...`);
    
    const posteData = await fetchPosteData(posteId);
    
    if (!posteData) {
      throw new Error('Poste introuvable');
    }

    console.log(`✅ [KB Compiler] Données récupérées: ${posteData.titre}`);

    // ====================================================================
    // ÉTAPE 3 : Assignation des 3 KB depuis le pool
    // ====================================================================
    console.log(`🎯 [KB Compiler] Assignation des KB depuis le pool...`);
    
    // Assigner KB Découverte (Acte 1)
    const kbDecouverte = await assignKBToPoste(posteId, 'decouverte', 'generique');
    if (!kbDecouverte) {
      throw new Error('Aucune KB Découverte disponible dans le pool');
    }
    console.log(`✅ [KB Compiler] KB Découverte assignée: ${kbDecouverte.heygen_kb_id}`);
    
    // Assigner KB Présélection (Acte 2)
    const kbPreselection = await assignKBToPoste(posteId, 'preselection', 'generique');
    if (!kbPreselection) {
      throw new Error('Aucune KB Présélection disponible dans le pool');
    }
    console.log(`✅ [KB Compiler] KB Présélection assignée: ${kbPreselection.heygen_kb_id}`);
    
    // Assigner KB Sélection (Acte 3)
    const kbSelection = await assignKBToPoste(posteId, 'selection', 'generique');
    if (!kbSelection) {
      throw new Error('Aucune KB Sélection disponible dans le pool');
    }
    console.log(`✅ [KB Compiler] KB Sélection assignée: ${kbSelection.heygen_kb_id}`);
    
    const kb_decouverte_id = kbDecouverte.heygen_kb_id;
    const kb_preselection_id = kbPreselection.heygen_kb_id;
    const kb_selection_id = kbSelection.heygen_kb_id;

    // ====================================================================
    // ÉTAPE 4 : Formatage du contenu pour chaque KB
    // ====================================================================
    console.log(`📝 [KB Compiler] Formatage du contenu...`);
    
    const decouverteContent = formatDecouverteContent(posteData);
    console.log(`✅ [KB Compiler] Contenu Découverte formaté (${decouverteContent.length} caractères)`);
    
    const preselectionContent = formatPreselectionContent(posteData);
    console.log(`✅ [KB Compiler] Contenu Présélection formaté (${preselectionContent.length} caractères)`);
    
    const selectionContent = formatSelectionContent(posteData);
    console.log(`✅ [KB Compiler] Contenu Sélection formaté (${selectionContent.length} caractères)`);


    // ====================================================================
    // ÉTAPE 5 : Mise à jour via API HeyGen
    // ====================================================================
    console.log(`🔄 [KB Compiler] Mise à jour API HeyGen...`);
    
    // TODO: Appeler API HeyGen pour chaque KB

    // ====================================================================
    // ÉTAPE 6 : Sauvegarde en BDD
    // ====================================================================
    console.log(`💾 [KB Compiler] Sauvegarde en BDD...`);
    
    // TODO: Mettre à jour la table postes

    console.log(`✅ [KB Compiler] Compilation terminée avec succès`);

    return {
      success: true,
      kb_decouverte_id,
      kb_preselection_id,
      kb_selection_id,
      message: 'Compilation des Knowledge Bases réussie'
    };

  } catch (error) {
    console.error('❌ [KB Compiler] Erreur lors de la compilation:', error);
    
    // Libérer les KB potentiellement assignées
    console.log('🔄 [KB Compiler] Libération des KB assignées...');
    try {
      await releaseKBFromPoste(posteId);
      console.log('✅ [KB Compiler] KB libérées avec succès');
    } catch (releaseError) {
      console.error('❌ [KB Compiler] Erreur lors de la libération des KB:', releaseError);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de la compilation'
    };
  }
}

/**
 * Récupère les données complètes du poste avec jointure entreprise
 * 
 * @param posteId - UUID du poste
 * @returns Données du poste ou null si introuvable
 */
async function fetchPosteData(posteId: string): Promise<PosteData | null> {
  const { data, error } = await supabase
    .from('postes')
    .select(`
      id,
      titre,
      description,
      entreprise_id,
      ville,
      pays,
      remote_possible,
      remote_partiel,
      remote_complet,
      type_contrat,
      date_debut_souhaitee,
      salaire_min,
      salaire_max,
      devise,
      avantages,
      niveau_etude_min,
      experience_min_annees,
      seniorite,
      definition_data,
      criteres_redhibitoires,
      competences,
      job_description,
      job_offer,
      entreprise:entreprises (
        nom,
        secteur,
        description,
        ville,
        pays,
        taille,
        site_web
      )
    `)
    .eq('id', posteId)
    .single();

  if (error) {
    console.error('❌ [KB Compiler] Erreur récupération poste:', error);
    return null;
  }

  // Validation des données critiques
  if (!data.definition_data || Object.keys(data.definition_data).length === 0) {
    console.warn('⚠️ [KB Compiler] Attention: definition_data vide');
  }
  
  if (!data.job_description) {
    console.warn('⚠️ [KB Compiler] Attention: job_description manquante');
  }

  return data as PosteData;
}

/**
 * Formate le contenu de la KB Découverte (Acte 1)
 * 
 * @param posteData - Données du poste
 * @returns Contenu formaté pour la KB
 */
function formatDecouverteContent(posteData: PosteData): string {
  const entreprise = posteData.entreprise;
  
  return `# POSTE : ${posteData.titre}

## 🏢 ENTREPRISE
**Nom** : ${entreprise?.nom || 'Non renseigné'}
**Secteur** : ${entreprise?.secteur || 'Non renseigné'}
**Localisation** : ${entreprise?.ville || ''}, ${entreprise?.pays || ''}
${entreprise?.taille ? `**Taille** : ${entreprise.taille}` : ''}
${entreprise?.site_web ? `**Site web** : ${entreprise.site_web}` : ''}

### À propos de l'entreprise
${entreprise?.description || 'Non renseigné'}

## 📍 LOCALISATION DU POSTE
**Lieu** : ${posteData.ville || 'Non renseigné'}, ${posteData.pays || ''}
${posteData.remote_complet ? '🏠 **Télétravail complet possible**' : ''}
${posteData.remote_partiel ? '🏠 **Télétravail partiel possible**' : ''}
${!posteData.remote_possible ? '🏢 **Poste en présentiel**' : ''}

## 💼 TYPE DE CONTRAT
**Type** : ${posteData.type_contrat || 'Non renseigné'}
${posteData.date_debut_souhaitee ? `**Début souhaité** : ${posteData.date_debut_souhaitee}` : ''}

## 💰 RÉMUNÉRATION
${posteData.salaire_min && posteData.salaire_max 
  ? `**Fourchette** : ${posteData.salaire_min} - ${posteData.salaire_max} ${posteData.devise || 'EUR'}` 
  : 'À discuter selon profil'}
${posteData.avantages ? `\n**Avantages** : ${posteData.avantages}` : ''}

## 🎯 PRÉSENTATION DU POSTE
${posteData.description || 'Description détaillée à venir'}

## 📚 PROFIL RECHERCHÉ
${posteData.niveau_etude_min ? `**Formation** : ${posteData.niveau_etude_min}` : ''}
${posteData.experience_min_annees !== null ? `**Expérience** : ${posteData.experience_min_annees} ans minimum` : ''}
${posteData.seniorite ? `**Niveau** : ${posteData.seniorite}` : ''}

---
*Acte 1 - Entretien de Découverte*
`;
}

/**
 * Formate le contenu de la KB Présélection (Acte 2)
 * 
 * @param posteData - Données du poste
 * @returns Contenu formaté pour la KB
 */
function formatPreselectionContent(posteData: PosteData): string {
  const entreprise = posteData.entreprise;
  const criteres = posteData.criteres_redhibitoires || {};
  const competences = posteData.competences || {};
  
  return `# POSTE : ${posteData.titre}
**Entreprise** : ${entreprise?.nom || 'Non renseigné'}

## ⚠️ CRITÈRES RÉDHIBITOIRES
${Object.keys(criteres).length > 0 
  ? Object.entries(criteres).map(([key, value]) => `- **${key}** : ${value}`).join('\n')
  : 'Aucun critère rédhibitoire défini'}

## 🎯 COMPÉTENCES REQUISES
${Object.keys(competences).length > 0 
  ? Object.entries(competences).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const comp = value as any;
        return `### ${key}
**Niveau requis** : ${comp.niveau || 'Non spécifié'}
**Importance** : ${comp.importance || 'Non spécifié'}
${comp.description ? `**Description** : ${comp.description}` : ''}`;
      }
      return `- **${key}** : ${value}`;
    }).join('\n\n')
  : 'Compétences à définir'}

## 💼 CONTEXTE DU POSTE
${posteData.description || 'Non renseigné'}

## 📚 FORMATION & EXPÉRIENCE
${posteData.niveau_etude_min ? `**Formation minimum** : ${posteData.niveau_etude_min}` : ''}
${posteData.experience_min_annees !== null ? `**Expérience minimum** : ${posteData.experience_min_annees} ans` : ''}
${posteData.seniorite ? `**Niveau de séniorité** : ${posteData.seniorite}` : ''}

## 🏢 LIEU DE TRAVAIL
**Localisation** : ${posteData.ville || 'Non renseigné'}, ${posteData.pays || ''}
${posteData.remote_complet ? '✅ Télétravail complet possible' : ''}
${posteData.remote_partiel ? '✅ Télétravail partiel possible' : ''}

---
*Acte 2 - Entretien de Présélection*
*Évaluation des compétences techniques et des critères obligatoires*
`;
}

/**
 * Formate le contenu de la KB Sélection (Acte 3)
 * 
 * @param posteData - Données du poste
 * @returns Contenu formaté pour la KB
 */
function formatSelectionContent(posteData: PosteData): string {
  const entreprise = posteData.entreprise;
  const jobDescription = posteData.job_description;
  const competences = posteData.competences || {};
  
  return `# FICHE DE POSTE COMPLÈTE : ${posteData.titre}

## 🏢 ENTREPRISE
**Nom** : ${entreprise?.nom || 'Non renseigné'}
**Secteur** : ${entreprise?.secteur || 'Non renseigné'}
**Localisation** : ${entreprise?.ville || ''}, ${entreprise?.pays || ''}
${entreprise?.taille ? `**Taille** : ${entreprise.taille}` : ''}
${entreprise?.site_web ? `**Site web** : ${entreprise.site_web}` : ''}

${entreprise?.description ? `### À propos\n${entreprise.description}\n` : ''}

## 📋 DESCRIPTION DÉTAILLÉE DU POSTE
${jobDescription || posteData.description || 'Description non disponible'}

## 🎯 COMPÉTENCES CLÉS
${Object.keys(competences).length > 0 
  ? Object.entries(competences).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const comp = value as any;
        return `### ${key}
- **Niveau requis** : ${comp.niveau || 'Non spécifié'}
- **Importance** : ${comp.importance || 'Non spécifié'}
${comp.description ? `- **Description** : ${comp.description}` : ''}
${comp.exemples ? `- **Exemples d'application** : ${comp.exemples}` : ''}`;
      }
      return `- **${key}** : ${value}`;
    }).join('\n\n')
  : 'Compétences à définir'}

## 💼 CONDITIONS
**Type de contrat** : ${posteData.type_contrat || 'Non renseigné'}
${posteData.date_debut_souhaitee ? `**Début souhaité** : ${posteData.date_debut_souhaitee}` : ''}
**Localisation** : ${posteData.ville || 'Non renseigné'}, ${posteData.pays || ''}
${posteData.remote_complet ? '🏠 **Télétravail complet possible**' : ''}
${posteData.remote_partiel ? '🏠 **Télétravail partiel possible**' : ''}

## 💰 RÉMUNÉRATION & AVANTAGES
${posteData.salaire_min && posteData.salaire_max 
  ? `**Fourchette salariale** : ${posteData.salaire_min} - ${posteData.salaire_max} ${posteData.devise || 'EUR'}` 
  : '**Rémunération** : À discuter selon profil et expérience'}
${posteData.avantages ? `\n**Avantages** :\n${posteData.avantages}` : ''}

## 📚 PROFIL RECHERCHÉ
${posteData.niveau_etude_min ? `**Formation** : ${posteData.niveau_etude_min}` : ''}
${posteData.experience_min_annees !== null ? `**Expérience** : ${posteData.experience_min_annees} ans minimum` : ''}
${posteData.seniorite ? `**Niveau de séniorité** : ${posteData.seniorite}` : ''}

---
*Acte 3 - Entretien de Sélection*
*Évaluation approfondie des compétences, soft skills et fit culturel*
`;
}

/**
 * notesService.ts
 * 
 * Service de gestion des notes (pense-bêtes) attachées aux niveaux du projet
 * Les notes peuvent être attachées aux travaux (lots), étapes ou tâches
 * 
 * @version 1.0
 * @date 26 novembre 2025
 */

import { supabase } from '@/app/lib/supabaseClient';

// ==================== TYPES ====================

export interface Note {
  id: string;
  texte: string;
  source: 'assistant_ia' | 'utilisateur';
  message_original?: string;  // Le message complet dont est extraite la note
  created_at: string;
}

export type NoteLevel = 'chantier' | 'travail' | 'etape' | 'tache';

// ==================== HELPERS ====================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getTableName(level: NoteLevel): string {
  switch (level) {
    case 'chantier':
      return 'chantiers';
    case 'travail':
      return 'travaux';
    case 'etape':
      return 'etapes';
    case 'tache':
      return 'taches';
    default:
      return 'travaux';
  }
}

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Récupère les notes d'un élément
 */
export async function getNotes(level: NoteLevel, id: string): Promise<Note[]> {
  try {
    const tableName = getTableName(level);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('notes')
      .eq('id', id)
      .single();

    if (error) throw error;

    return (data?.notes || []) as Note[];
  } catch (error) {
    console.error('Erreur récupération notes:', error);
    return [];
  }
}

/**
 * Ajoute une note à un élément
 */
export async function addNote(
  level: NoteLevel,
  id: string,
  texte: string,
  source: 'assistant_ia' | 'utilisateur' = 'assistant_ia',
  messageOriginal?: string
): Promise<boolean> {
  try {
    const tableName = getTableName(level);
    
    // Récupérer les notes existantes
    const { data, error: fetchError } = await supabase
      .from(tableName)
      .select('notes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const existingNotes: Note[] = data?.notes || [];

    // Créer la nouvelle note
    const newNote: Note = {
      id: generateUUID(),
      texte,
      source,
      message_original: messageOriginal,
      created_at: new Date().toISOString()
    };

    // Ajouter à la liste
    const updatedNotes = [...existingNotes, newNote];

    // Sauvegarder
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ notes: updatedNotes })
      .eq('id', id);

    if (updateError) throw updateError;

    console.log(`📌 Note ajoutée à ${level} ${id}`);
    return true;
  } catch (error) {
    console.error('Erreur ajout note:', error);
    return false;
  }
}

/**
 * Supprime une note
 */
export async function deleteNote(
  level: NoteLevel,
  elementId: string,
  noteId: string
): Promise<boolean> {
  try {
    const tableName = getTableName(level);
    
    // Récupérer les notes existantes
    const { data, error: fetchError } = await supabase
      .from(tableName)
      .select('notes')
      .eq('id', elementId)
      .single();

    if (fetchError) throw fetchError;

    const existingNotes: Note[] = data?.notes || [];

    // Filtrer pour retirer la note
    const updatedNotes = existingNotes.filter(n => n.id !== noteId);

    // Sauvegarder
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ notes: updatedNotes })
      .eq('id', elementId);

    if (updateError) throw updateError;

    console.log(`🗑️ Note supprimée de ${level} ${elementId}`);
    return true;
  } catch (error) {
    console.error('Erreur suppression note:', error);
    return false;
  }
}

/**
 * Met à jour une note
 */
export async function updateNote(
  level: NoteLevel,
  elementId: string,
  noteId: string,
  newTexte: string
): Promise<boolean> {
  try {
    const tableName = getTableName(level);
    
    // Récupérer les notes existantes
    const { data, error: fetchError } = await supabase
      .from(tableName)
      .select('notes')
      .eq('id', elementId)
      .single();

    if (fetchError) throw fetchError;

    const existingNotes: Note[] = data?.notes || [];

    // Mettre à jour la note
    const updatedNotes = existingNotes.map(n => 
      n.id === noteId ? { ...n, texte: newTexte } : n
    );

    // Sauvegarder
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ notes: updatedNotes })
      .eq('id', elementId);

    if (updateError) throw updateError;

    console.log(`✏️ Note mise à jour dans ${level} ${elementId}`);
    return true;
  } catch (error) {
    console.error('Erreur mise à jour note:', error);
    return false;
  }
}

/**
 * Compte le nombre total de notes pour un chantier
 */
export async function countNotesForChantier(chantierId: string): Promise<number> {
  try {
    let total = 0;

    // Compter les notes du chantier lui-même
    const { data: chantier } = await supabase
      .from('chantiers')
      .select('notes')
      .eq('id', chantierId)
      .single();
    
    if (chantier?.notes) {
      total += (chantier.notes as Note[]).length;
    }

    // Compter dans travaux
    const { data: travaux } = await supabase
      .from('travaux')
      .select('id, notes')
      .eq('chantier_id', chantierId);

    travaux?.forEach(t => {
      total += (t.notes as Note[] || []).length;
    });

    // Compter dans étapes (via travaux)
    const travailIds = travaux?.map(t => t.id) || [];
    if (travailIds.length > 0) {
      const { data: etapes } = await supabase
        .from('etapes')
        .select('notes')
        .in('travail_id', travailIds);

      etapes?.forEach(e => {
        total += (e.notes as Note[] || []).length;
      });
    }

    return total;
  } catch (error) {
    console.error('Erreur comptage notes:', error);
    return 0;
  }
}

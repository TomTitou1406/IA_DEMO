/**
 * notesService.ts
 * 
 * Service pour gérer les notes épinglées (pense-bêtes)
 * attachées aux chantiers, travaux, étapes et tâches.
 * 
 * @version 1.1
 * @date 26 novembre 2025
 */

import { supabase } from '../supabaseClient';

// ==================== TYPES ====================

export type NoteLevel = 'chantier' | 'travail' | 'etape' | 'tache';

export interface Note {
  id: string;
  texte: string;
  source: 'assistant_ia' | 'utilisateur';
  message_original?: string;
  created_at: string;
}

// Mapping niveau → table
const TABLE_MAP: Record<NoteLevel, string> = {
  chantier: 'chantiers',
  travail: 'travaux',
  etape: 'etapes',
  tache: 'taches'
};

// ==================== HELPERS ====================

/**
 * Parse les notes depuis la BDD (gère string ou array)
 */
function parseNotes(notesData: unknown): Note[] {
  if (!notesData) return [];
  
  if (typeof notesData === 'string') {
    try {
      const parsed = JSON.parse(notesData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  if (Array.isArray(notesData)) {
    return notesData;
  }
  
  return [];
}

// ==================== FONCTIONS ====================

/**
 * Récupère toutes les notes d'un élément
 */
export async function getNotes(level: NoteLevel, id: string): Promise<Note[]> {
  const table = TABLE_MAP[level];
  
  const { data, error } = await supabase
    .from(table)
    .select('notes')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Erreur getNotes (${level}/${id}):`, error);
    return [];
  }
  
  return parseNotes(data?.notes);
}

/**
 * Ajoute une note à un élément
 */
export async function addNote(
  level: NoteLevel,
  id: string,
  texte: string,
  source: 'assistant_ia' | 'utilisateur',
  messageOriginal?: string
): Promise<boolean> {
  const table = TABLE_MAP[level];
  
  // 1. Récupérer les notes existantes
  const { data, error: fetchError } = await supabase
    .from(table)
    .select('notes')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.error(`Erreur fetch notes (${level}/${id}):`, fetchError);
    return false;
  }
  
  // 2. Parser les notes existantes
  const existingNotes = parseNotes(data?.notes);
  
  // 3. Créer la nouvelle note
  const newNote: Note = {
    id: crypto.randomUUID(),
    texte,
    source,
    message_original: messageOriginal,
    created_at: new Date().toISOString()
  };
  
  // 4. Ajouter et sauvegarder (toujours en JSON string)
  const updatedNotes = [...existingNotes, newNote];
  
  const { error: updateError } = await supabase
    .from(table)
    .update({ notes: JSON.stringify(updatedNotes) })
    .eq('id', id);
  
  if (updateError) {
    console.error(`Erreur update notes (${level}/${id}):`, updateError);
    return false;
  }
  
  return true;
}

/**
 * Supprime une note d'un élément
 */
export async function deleteNote(
  level: NoteLevel,
  id: string,
  noteId: string
): Promise<boolean> {
  const table = TABLE_MAP[level];
  
  // 1. Récupérer les notes existantes
  const { data, error: fetchError } = await supabase
    .from(table)
    .select('notes')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.error(`Erreur fetch notes (${level}/${id}):`, fetchError);
    return false;
  }
  
  // 2. Parser et filtrer
  const existingNotes = parseNotes(data?.notes);
  const updatedNotes = existingNotes.filter(n => n.id !== noteId);
  
  // 3. Sauvegarder
  const { error: updateError } = await supabase
    .from(table)
    .update({ notes: JSON.stringify(updatedNotes) })
    .eq('id', id);
  
  if (updateError) {
    console.error(`Erreur delete note (${level}/${id}):`, updateError);
    return false;
  }
  
  return true;
}

/**
 * Compte le nombre total de notes pour un chantier
 * (incluant travaux, étapes, tâches)
 */
export async function countNotesForChantier(chantierId: string): Promise<number> {
  let total = 0;
  
  // Notes du chantier
  const chantierNotes = await getNotes('chantier', chantierId);
  total += chantierNotes.length;
  
  // Notes des travaux
  const { data: travaux } = await supabase
    .from('travaux')
    .select('id, notes')
    .eq('chantier_id', chantierId);
  
  if (travaux) {
    for (const t of travaux) {
      total += parseNotes(t.notes).length;
    }
  }
  
  // On pourrait continuer avec étapes et tâches si besoin
  
  return total;
}

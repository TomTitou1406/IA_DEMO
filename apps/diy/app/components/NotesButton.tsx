/**
 * NotesButton.tsx
 * 
 * Bouton qui affiche le nombre de notes et ouvre une modale
 * pour visualiser/supprimer les notes enregistrées.
 * 
 * @version 1.0
 * @date 26 novembre 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { getNotes, deleteNote, type NoteLevel, type Note } from '../lib/services/notesService';

interface NotesButtonProps {
  level: NoteLevel;
  id: string;
  /** Couleur du thème */
  themeColor?: string;
}

export default function NotesButton({ level, id, themeColor = '#f97316' }: NotesButtonProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les notes
  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true);
      const data = await getNotes(level, id);
      setNotes(data);
      setLoading(false);
    };
    
    if (id) {
      loadNotes();
    }
  }, [level, id]);

  // Supprimer une note
  const handleDelete = async (noteId: string) => {
    if (!confirm('Supprimer cette note ?')) return;
    
    const success = await deleteNote(level, id, noteId);
    if (success) {
      setNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  // Formater la date
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pas de notes = pas de bouton
  if (loading) return null;
  if (notes.length === 0) return null;

  return (
    <>
      {/* Bouton */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          border: `1px solid ${themeColor}40`,
          background: `${themeColor}15`,
          color: themeColor,
          fontSize: '0.85rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${themeColor}25`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = `${themeColor}15`;
        }}
      >
        <span>📌</span>
        <span>{notes.length} note{notes.length > 1 ? 's' : ''}</span>
      </button>

      {/* Modale */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📌 Notes enregistrées
                <span style={{
                  background: themeColor,
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px'
                }}>
                  {notes.length}
                </span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Liste des notes */}
            <div
              style={{
                padding: '1rem',
                overflowY: 'auto',
                flex: 1
              }}
            >
              {notes.map((note, index) => (
                <div
                  key={note.id}
                  style={{
                    background: '#f9fafb',
                    borderRadius: '8px',
                    padding: '0.875rem',
                    marginBottom: index < notes.length - 1 ? '0.75rem' : 0,
                    border: '1px solid #e5e7eb'
                  }}
                >
                  {/* Texte de la note */}
                  <p style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.9rem',
                    color: '#1f2937',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {note.texte}
                  </p>

                  {/* Footer note */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {note.source === 'assistant_ia' ? '🤖' : '👤'}
                      {formatDate(note.created_at)}
                    </span>
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

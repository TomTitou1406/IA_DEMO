/**
 * NotesButton.tsx
 * 
 * Bouton + modale affichant les notes style Post-It jaune
 * Optimisé mobile-first
 * 
 * @version 2.0
 * @date 26 novembre 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { getNotes, deleteNote, type NoteLevel, type Note } from '../lib/services/notesService';

interface NotesButtonProps {
  level: NoteLevel;
  id: string;
}

export default function NotesButton({ level, id }: NotesButtonProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

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
    if (!confirm('Supprimer ce pense-bête ?')) return;
    
    const success = await deleteNote(level, id, noteId);
    if (success) {
      setNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  // Toggle voir plus/moins
  const toggleExpand = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
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

  // Vérifier si texte dépasse la limite
  const needsTruncation = (text: string) => text.length > 200;
  
  const truncateText = (text: string) => {
    if (text.length <= 200) return text;
    return text.substring(0, 200) + '...';
  };

  // Pas de notes = pas de bouton
  if (loading) return null;
  if (notes.length === 0) return null;

  return (
    <>
      {/* Bouton Post-It miniature */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.4rem 0.6rem',
          border: 'none',
          background: '#fef08a',
          color: '#854d0e',
          fontSize: '0.8rem',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '2px 2px 6px rgba(0,0,0,0.2)',
          transform: 'rotate(-2deg)',
          transition: 'transform 0.15s ease'
        }}
      >
        <span>📌</span>
        <span>{notes.length}</span>
      </button>

      {/* Modale plein écran mobile */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: '#262626',
              borderRadius: '16px 16px 0 0',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '1rem 1rem 0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #404040'
              }}
            >
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📌 Pense-bêtes
                <span style={{
                  background: '#fbbf24',
                  color: '#1a1a1a',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '10px',
                  fontWeight: '800'
                }}>
                  {notes.length}
                </span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#404040',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#a3a3a3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Liste des Post-Its */}
            <div
              style={{
                padding: '1rem',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {notes.map((note) => {
                const isExpanded = expandedNotes.has(note.id);
                const showToggle = needsTruncation(note.texte);
                
                return (
                  <div
                    key={note.id}
                    style={{
                      background: '#fef08a',
                      padding: '1rem',
                      boxShadow: '4px 4px 10px rgba(0,0,0,0.3)',
                      position: 'relative',
                      minHeight: '120px'
                    }}
                  >
                    {/* Punaise en haut */}
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '1.1rem',
                      filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
                    }}>
                      📌
                    </div>

                    {/* Bouton supprimer */}
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'rgba(0,0,0,0.1)',
                        border: 'none',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      🗑️
                    </button>

                    {/* Contenu de la note */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: '#1c1917',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}>
                        {isExpanded ? note.texte : truncateText(note.texte)}
                      </p>

                      {/* Bouton voir plus/moins */}
                      {showToggle && (
                        <button
                          onClick={() => toggleExpand(note.id)}
                          style={{
                            background: 'rgba(0,0,0,0.12)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.8rem',
                            color: '#78716c',
                            cursor: 'pointer',
                            fontWeight: '600',
                            marginTop: '0.75rem',
                            width: '100%'
                          }}
                        >
                          {isExpanded ? '▲ Voir moins' : '▼ Voir plus'}
                        </button>
                      )}
                    </div>

                    {/* Footer : date + source */}
                    <div style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.7rem',
                      color: '#78716c'
                    }}>
                      <span>{note.source === 'assistant_ia' ? '🤖' : '👤'}</span>
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

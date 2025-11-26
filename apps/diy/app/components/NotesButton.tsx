/**
 * NotesButton.tsx
 * 
 * Bouton + modale affichant les notes style Post-It
 * Utilise --yellow (#F59E0B) du global.css
 * 
 * @version 2.1
 * @date 26 novembre 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { getNotes, deleteNote, type NoteLevel, type Note } from '../lib/services/notesService';

// Couleurs Post-It basées sur --yellow: #F59E0B
const COLORS = {
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  yellowMedium: '#FDE68A',
  textDark: '#78350F',
  textMuted: '#92400E'
};

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

  // Vérifier si texte nécessite "voir plus"
  const needsTruncation = (text: string) => text.length > 150;
  
  const truncateText = (text: string) => {
    if (text.length <= 150) return text;
    return text.substring(0, 150) + '...';
  };

  // Pas de notes = pas de bouton
  if (loading) return null;
  if (notes.length === 0) return null;

  return (
    <>
      {/* Bouton Post-It */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.4rem 0.65rem',
          borderRadius: '4px',
          border: 'none',
          background: COLORS.yellowLight,
          color: COLORS.textMuted,
          fontSize: '0.85rem',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '2px 2px 4px rgba(0,0,0,0.15)',
          transition: 'all 0.2s',
          transform: 'rotate(-1deg)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)';
          e.currentTarget.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'rotate(-1deg)';
          e.currentTarget.style.boxShadow = '2px 2px 4px rgba(0,0,0,0.15)';
        }}
      >
        <span>📌</span>
        <span>{notes.length} note{notes.length > 1 ? 's' : ''}</span>
      </button>

      {/* Modale centrée */}
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
              background: '#1f1f1f',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '420px',
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
                borderBottom: `2px solid ${COLORS.yellow}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: '700',
                color: COLORS.yellow,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📌 Pense-bêtes
                <span style={{
                  background: COLORS.yellow,
                  color: '#1f1f1f',
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  fontWeight: '700'
                }}>
                  {notes.length}
                </span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
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
                      background: `linear-gradient(145deg, ${COLORS.yellowMedium} 0%, ${COLORS.yellow} 100%)`,
                      borderRadius: '2px',
                      padding: '1rem',
                      boxShadow: '3px 3px 8px rgba(0,0,0,0.3)',
                      position: 'relative'
                    }}
                  >
                    {/* Texte de la note */}
                    <p style={{
                      margin: '0 0 0.75rem 0',
                      fontSize: '0.9rem',
                      color: COLORS.textDark,
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontWeight: '500'
                    }}>
                      {isExpanded ? note.texte : truncateText(note.texte)}
                    </p>

                    {/* Bouton Voir plus / Voir moins */}
                    {showToggle && (
                      <button
                        onClick={() => toggleExpand(note.id)}
                        style={{
                          background: 'rgba(120,53,15,0.15)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          color: COLORS.textDark,
                          cursor: 'pointer',
                          fontWeight: '600',
                          marginBottom: '0.75rem',
                          display: 'block',
                          width: '100%'
                        }}
                      >
                        {isExpanded ? '▲ Voir moins' : '▼ Voir plus'}
                      </button>
                    )}

                    {/* Footer : date + source + supprimer */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed rgba(120,53,15,0.3)'
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: COLORS.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        {note.source === 'assistant_ia' ? '🤖' : '👤'}
                        {formatDate(note.created_at)}
                      </span>
                      
                      {/* Bouton Supprimer */}
                      <button
                        onClick={() => handleDelete(note.id)}
                        style={{
                          background: 'rgba(220,38,38,0.15)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.75rem',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        🗑️ Supprimer
                      </button>
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

/**
 * /app/components/PhotosModal.tsx
 * Modal pour afficher et gérer les photos d'un niveau
 * 
 * @version 1.0
 */

'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Client Supabase pour Storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Photo {
  id: string;
  url: string;
  legende?: string;
  created_at: string;
}

interface PhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  niveau: 'chantier' | 'travail' | 'etape' | 'tache';
  niveauId: string;
  niveauTitre: string;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
}

export default function PhotosModal({
  isOpen,
  onClose,
  niveau,
  niveauId,
  niveauTitre,
  photos,
  onPhotosChange
}: PhotosModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      setError('Seules les images sont autorisées');
      return;
    }

    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image trop volumineuse (max 10MB)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Générer un nom unique
      const photoId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${niveau}/${niveauId}/${photoId}.${ext}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('papibricole_bucket')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('papibricole_bucket')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      // Sauvegarder en BDD via l'API
      const res = await fetch('/api/medias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_photo',
          niveau,
          niveau_id: niveauId,
          data: {
            id: photoId,
            url: photoUrl,
            legende: ''
          }
        })
      });

      if (!res.ok) {
        throw new Error('Erreur sauvegarde BDD');
      }

      const result = await res.json();
      
      // Mettre à jour la liste
      onPhotosChange([...photos, result.photo]);

    } catch (err: any) {
      console.error('Erreur upload:', err);
      setError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Supprimer cette photo ?')) return;

    try {
      // Extraire le chemin du fichier depuis l'URL
      const urlParts = photo.url.split('/papibricole_bucket/');
      const filePath = urlParts[1];

      // Supprimer du Storage
      if (filePath) {
        await supabase.storage
          .from('papibricole_bucket')
          .remove([filePath]);
      }

      // Supprimer de la BDD
      await fetch('/api/medias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_photo',
          niveau,
          niveau_id: niveauId,
          data: { photo_id: photo.id }
        })
      });

      // Mettre à jour la liste
      onPhotosChange(photos.filter(p => p.id !== photo.id));
      setSelectedPhoto(null);

    } catch (err) {
      console.error('Erreur suppression:', err);
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--background)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div>
            <h2 style={{ 
              color: 'var(--gray-light)', 
              fontSize: '1.1rem', 
              margin: 0,
              fontWeight: '600'
            }}>
              📷 Photos
            </h2>
            <p style={{ 
              color: 'var(--gray)', 
              fontSize: '0.8rem', 
              margin: '0.25rem 0 0 0' 
            }}>
              {niveauTitre}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '1.2rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div style={{ 
          padding: '1.25rem', 
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Erreur */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              color: '#ef4444',
              fontSize: '0.85rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Grille de photos */}
          {photos.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selectedPhoto?.id === photo.id 
                      ? '2px solid var(--orange)' 
                      : '2px solid transparent',
                  }}
                >
                  <img
                    src={photo.url}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {/* Bouton supprimer au hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo);
                    }}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(239, 68, 68, 0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '0.8rem',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--gray)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
              <p>Aucune photo pour l'instant</p>
            </div>
          )}

          {/* Photo sélectionnée en grand */}
          {selectedPhoto && (
            <div style={{
              marginTop: '1rem',
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.3)'
            }}>
              <img
                src={selectedPhoto.url}
                alt=""
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer - Bouton ajouter */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: uploading ? 'var(--gray)' : 'var(--blue)',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: uploading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {uploading ? (
              <>⏳ Upload en cours...</>
            ) : (
              <>➕ Ajouter une photo</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

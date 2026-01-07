/**
 * /app/components/PhotosModal.tsx
 * Modal pour afficher et gérer les médias (photos + vidéos) d'un niveau
 * 
 * @version 2.0
 * @date 07 janvier 2026
 * 
 * Changelog :
 * - v2.0 : Grille 2 colonnes, lightbox plein écran, support vidéos
 * - v1.0 : Version initiale photos uniquement
 */

'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Client Supabase pour Storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Media {
  id: string;
  url: string;
  type: 'image' | 'video';
  legende?: string;
  created_at: string;
}

// Rétrocompatibilité avec l'ancien format Photo
interface Photo {
  id: string;
  url: string;
  legende?: string;
  created_at: string;
  type?: 'image' | 'video';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightboxMedia, setLightboxMedia] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Trier par date (plus récent en premier)
  const sortedMedias = [...photos].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Détecter le type de fichier
  const getFileType = (file: File): 'image' | 'video' => {
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  // Détecter le type depuis l'URL (pour rétrocompatibilité)
  const getMediaType = (media: Photo): 'image' | 'video' => {
    if (media.type) return media.type;
    const url = media.url.toLowerCase();
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
      return 'video';
    }
    return 'image';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = getFileType(file);

    // Vérifier le type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Seules les images et vidéos sont autorisées');
      return;
    }

    // Vérifier la taille
    const maxSize = fileType === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = fileType === 'video' ? '100MB' : '10MB';
    
    if (file.size > maxSize) {
      setError(`Fichier trop volumineux (max ${maxSizeLabel})`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Générer un nom unique
      const mediaId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || (fileType === 'video' ? 'mp4' : 'jpg');
      const filePath = `${niveau}/${niveauId}/${mediaId}.${ext}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('papibricole_bucket')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        } as any);

      if (uploadError) {
        throw uploadError;
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('papibricole_bucket')
        .getPublicUrl(filePath);

      const mediaUrl = urlData.publicUrl;

      // Sauvegarder en BDD via l'API
      const res = await fetch('/api/medias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_photo',
          niveau,
          niveau_id: niveauId,
          data: {
            id: mediaId,
            url: mediaUrl,
            type: fileType,
            legende: ''
          }
        })
      });

      if (!res.ok) {
        throw new Error('Erreur sauvegarde BDD');
      }

      const result = await res.json();
      
      // Mettre à jour la liste
      onPhotosChange([...photos, { ...result.photo, type: fileType }]);

    } catch (err: any) {
      console.error('Erreur upload:', err);
      setError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (media: Photo) => {
    if (!confirm('Supprimer ce média ?')) return;

    try {
      // Extraire le chemin du fichier depuis l'URL
      const urlParts = media.url.split('/papibricole_bucket/');
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
          data: { photo_id: media.id }
        })
      });

      // Mettre à jour la liste
      onPhotosChange(photos.filter(p => p.id !== media.id));
      setLightboxMedia(null);

    } catch (err) {
      console.error('Erreur suppression:', err);
      setError('Erreur lors de la suppression');
    }
  };

  // Navigation lightbox
  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightboxMedia) return;
    const currentIndex = sortedMedias.findIndex(m => m.id === lightboxMedia.id);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex < 0) newIndex = sortedMedias.length - 1;
    if (newIndex >= sortedMedias.length) newIndex = 0;
    
    setLightboxMedia(sortedMedias[newIndex]);
  };

  return (
    <>
      {/* Modal principale */}
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
            maxWidth: '500px',
            maxHeight: '80vh',
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
                📷 Médias
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
            padding: '1rem', 
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

            {/* Progress bar upload */}
            {uploading && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--blue)'
                }}>
                  <span>⏳ Upload en cours...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{
                  height: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: 'var(--blue)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {/* Grille de médias */}
            {sortedMedias.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem',
              }}>
                {sortedMedias.map((media) => {
                  const mediaType = getMediaType(media);
                  return (
                    <div
                      key={media.id}
                      onClick={() => setLightboxMedia(media)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'rgba(0,0,0,0.3)',
                      }}
                    >
                      {mediaType === 'video' ? (
                        <>
                          <video
                            src={media.url}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            muted
                          />
                          {/* Icône play overlay */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: '1.2rem', marginLeft: '3px' }}>▶</span>
                          </div>
                        </>
                      ) : (
                        <img
                          src={media.url}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      {/* Bouton supprimer */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(media);
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'white',
                          fontSize: '0.75rem',
                        }}
                      >
                        🗑️
                      </button>
                      {/* Badge vidéo */}
                      {mediaType === 'video' && (
                        <span style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          background: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: '600'
                        }}>
                          🎬 Vidéo
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--gray)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                <p>Aucun média pour l'instant</p>
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
              accept="image/*,video/mp4,video/webm,video/quicktime"
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
              ➕ Ajouter photo / vidéo
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox plein écran */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          {/* Bouton fermer */}
          <button
            onClick={() => setLightboxMedia(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '1.5rem',
              zIndex: 10001
            }}
          >
            ✕
          </button>

          {/* Navigation précédent */}
          {sortedMedias.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('prev');
              }}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '1.5rem',
              }}
            >
              ‹
            </button>
          )}

          {/* Contenu média */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {getMediaType(lightboxMedia) === 'video' ? (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  borderRadius: '8px',
                }}
              />
            ) : (
              <img
                src={lightboxMedia.url}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
            )}
          </div>

          {/* Navigation suivant */}
          {sortedMedias.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('next');
              }}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '1.5rem',
              }}
            >
              ›
            </button>
          )}

          {/* Compteur */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            color: 'white',
            fontSize: '0.9rem',
          }}>
            {sortedMedias.findIndex(m => m.id === lightboxMedia.id) + 1} / {sortedMedias.length}
          </div>
        </div>
      )}
    </>
  );
}

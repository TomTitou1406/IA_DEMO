/**
 * /app/videos/favorites/page.tsx
 * Page d'affichage des vidéos favorites groupées par requête de recherche
 * 
 * @version 1.1
 * 
 * Changelog :
 * - v1.1 : Ajout bouton "Mettre en œuvre" + modal analyse vidéo
 * - v1.0 : Version initiale - Affichage groupé par search_query
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import VideoAnalysisModal from '@/app/components/VideoAnalysisModal';

interface Favorite {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  channel_title: string;
  duration: string;
  duration_seconds: number;
  view_count: number;
  search_query: string | null;
  chantier_id: string | null;
  travail_id: string | null;
  notes: string | null;
  created_at: string;
}

interface GroupedFavorites {
  query: string;
  favorites: Favorite[];
  latestDate: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedVideoData, setSelectedVideoData] = useState<Favorite | null>(null);
  
  // Modal analyse vidéo
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'complexe'>('simple');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/videos/favorites');
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await fetch(`/api/videos/favorites?video_id=${videoId}`, {
        method: 'DELETE'
      });
      setFavorites(prev => prev.filter(f => f.video_id !== videoId));
      
      // Si la vidéo supprimée était en lecture, fermer le player
      if (selectedVideo === videoId) {
        setSelectedVideo(null);
        setSelectedVideoData(null);
      }
    } catch (error) {
      console.error('Erreur suppression favori:', error);
    }
  };

  const handleNewSearch = () => {
    window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
      detail: { 
        pageContext: 'video_decouverte',
        welcomeMessage: `Quel tutoriel cherches-tu ? 🎬`
      } 
    }));
  };

  const handleSelectVideo = (favorite: Favorite) => {
    setSelectedVideo(favorite.video_id);
    setSelectedVideoData(favorite);
  };

  const handleMettreEnOeuvre = () => {
    if (!selectedVideoData) return;
    setAnalysisMode('simple'); // L'IA décidera
    setShowAnalysisModal(true);
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count?.toString() || '0';
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine(s)`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  };

  // Grouper les favoris par search_query
  const groupedFavorites: GroupedFavorites[] = favorites.reduce((groups, fav) => {
    const query = fav.search_query || 'Autres vidéos';
    const existingGroup = groups.find(g => g.query === query);
    
    if (existingGroup) {
      existingGroup.favorites.push(fav);
      // Mettre à jour la date la plus récente
      if (new Date(fav.created_at) > new Date(existingGroup.latestDate)) {
        existingGroup.latestDate = fav.created_at;
      }
    } else {
      groups.push({
        query,
        favorites: [fav],
        latestDate: fav.created_at
      });
    }
    
    return groups;
  }, [] as GroupedFavorites[]);

  // Trier les groupes par date (plus récent en premier)
  groupedFavorites.sort((a, b) => 
    new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );

  const VideoCard = ({ favorite }: { favorite: Favorite }) => (
    <div
      onClick={() => handleSelectVideo(favorite)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: selectedVideo === favorite.video_id 
          ? '2px solid var(--green)' 
          : '2px solid transparent',
        transition: 'all 0.2s',
        position: 'relative',
        minWidth: '200px',
        maxWidth: '280px',
        flex: '1 1 200px'
      }}
    >
      <div style={{ position: 'relative' }}>
        <img 
          src={favorite.thumbnail} 
          alt={favorite.title}
          style={{ 
            width: '100%', 
            height: '140px', 
            objectFit: 'cover' 
          }}
        />
        {/* Durée */}
        <span style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {favorite.duration}
        </span>
        
        {/* Bouton Supprimer ✕ */}
        <button
          onClick={(e) => removeFavorite(favorite.video_id, e)}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            background: 'white',
            color: '#ef4444',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          title="Retirer des favoris"
        >
          ✕
        </button>
      </div>
      
      <div style={{ padding: '0.75rem' }}>
        <h3 style={{ 
          color: 'white', 
          fontSize: '0.8rem', 
          marginBottom: '0.4rem',
          lineHeight: '1.3',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {favorite.title}
        </h3>
        <p style={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.7rem',
          marginBottom: '0.25rem'
        }}>
          {favorite.channel_title}
        </p>
        <span style={{ 
          color: 'rgba(255,255,255,0.4)', 
          fontSize: '0.65rem' 
        }}>
          👁️ {formatViews(favorite.view_count)} vues
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            ❤️ Mes vidéos favorites
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            {favorites.length} vidéo{favorites.length > 1 ? 's' : ''} sauvegardée{favorites.length > 1 ? 's' : ''}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleNewSearch}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '2px solid var(--green)',
              background: 'transparent',
              color: 'var(--green)',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🔍 Chercher un tuto
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🏠 Retour accueil
          </button>
        </div>
      </div>

      {/* Player si vidéo sélectionnée */}
      {selectedVideo && (
        <div style={{ 
          marginBottom: '2rem', 
          borderRadius: '12px', 
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <iframe
            width="100%"
            height="450"
            src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          
          {/* Bouton Mettre en œuvre */}
          {selectedVideoData && (
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <button
                onClick={handleMettreEnOeuvre}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.7rem 1.25rem',
                  borderRadius: '10px',
                  border: '2px solid #10b981',
                  background: 'transparent',
                  color: '#10b981',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#10b981';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#10b981';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span>🚀</span>
                <span>Mettre en œuvre</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>
            ⏳ Chargement des favoris...
          </p>
        </div>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤷</div>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Aucune vidéo en favoris
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Recherche des tutoriels et clique sur ❤️ pour les sauvegarder !
          </p>
          <button
            onClick={handleNewSearch}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--green)',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔍 Chercher un tutoriel
          </button>
        </div>
      ) : (
        <div>
          {groupedFavorites.map((group, idx) => (
            <div key={group.query} style={{ marginBottom: '2rem' }}>
              {/* Header du groupe */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🔍</span>
                  <h2 style={{ 
                    color: 'white', 
                    fontSize: '1rem', 
                    margin: 0,
                    fontWeight: '600'
                  }}>
                    "{group.query}"
                  </h2>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '0.85rem' 
                  }}>
                    ({group.favorites.length} vidéo{group.favorites.length > 1 ? 's' : ''})
                  </span>
                </div>
                <span style={{ 
                  color: 'rgba(255,255,255,0.4)', 
                  fontSize: '0.8rem' 
                }}>
                  {formatRelativeDate(group.latestDate)}
                </span>
              </div>
              
              {/* Grille de vidéos */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                {group.favorites.map(fav => (
                  <VideoCard key={fav.id} favorite={fav} />
                ))}
              </div>
              
              {/* Séparateur entre groupes */}
              {idx < groupedFavorites.length - 1 && (
                <div style={{ 
                  marginTop: '1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)'
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal analyse vidéo */}
      {selectedVideoData && (
        <VideoAnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          video={{
            id: selectedVideoData.video_id,
            title: selectedVideoData.title,
            description: '', // Pas de description stockée dans les favoris
            thumbnail: selectedVideoData.thumbnail,
            channelTitle: selectedVideoData.channel_title,
            durationSeconds: selectedVideoData.duration_seconds
          }}
          mode={analysisMode}
        />
      )}
    </div>
  );
}

/**
 * /app/videos/favorites/page.tsx
 * Page d'affichage des vidéos favorites groupées par requête de recherche
 * 
 * @version 1.2
 * 
 * Changelog :
 * - v1.2 : Cards enrichies (likes, date, HD, chapitres) + VideoPlayerModal + synchro compteur
 * - v1.1 : Ajout bouton "Mettre en œuvre" + modal analyse vidéo
 * - v1.0 : Version initiale - Affichage groupé par search_query
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import VideoAnalysisModal from '@/app/components/VideoAnalysisModal';
import VideoPlayerModal from '@/app/components/VideoPlayerModal';

// ============================================
// TYPES
// ============================================

interface VideoChapter {
  title: string;
  start_seconds: number;
  start_formatted: string;
}

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
  // v1.2 : Nouveaux champs
  published_at: string | null;
  like_count: number | null;
  is_hd: boolean | null;
  chapters: VideoChapter[] | null;
  has_chapters: boolean | null;
  is_trusted: boolean | null;
}

interface GroupedFavorites {
  query: string;
  favorites: Favorite[];
  latestDate: string;
}

// Type adapté pour VideoPlayerModal
interface VideoForModal {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  channelTitle: string;
  viewCount: number;
  duration: string;
  durationSeconds?: number;
  isTrusted?: boolean;
  isShort?: boolean;
  publishedAt?: string;
  likeCount?: number;
  isHD?: boolean;
  hasChapters?: boolean;
  chapters?: VideoChapter[];
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function FavoritesPage() {
  const router = useRouter();
  
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedVideoData, setSelectedVideoData] = useState<Favorite | null>(null);
  
  // Modal player
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  
  // Modal analyse vidéo
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'complexe'>('simple');

  useEffect(() => {
    loadFavorites();
  }, []);

  const [searchOrigin, setSearchOrigin] = useState<{ query: string; path: string } | null>(null);
  useEffect(() => {
    // Vérifier si on vient d'une recherche
    const origin = sessionStorage.getItem('favoritesOrigin');
    if (origin) {
      try {
        const data = JSON.parse(origin);
        if (data.from === 'search') {
          setSearchOrigin({ query: data.query, path: data.path });
        }
      } catch (e) {}
    }
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
      
      // Notifier la Navbar
      window.dispatchEvent(new Event('favoritesUpdated'));
      
      // Si la vidéo supprimée était en lecture, fermer le modal
      if (selectedVideo === videoId) {
        setSelectedVideo(null);
        setSelectedVideoData(null);
        setShowPlayerModal(false);
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
    setShowPlayerModal(true);
  };

  const handleMettreEnOeuvre = () => {
    if (!selectedVideoData) return;
    setShowPlayerModal(false);
    setAnalysisMode('simple');
    setShowAnalysisModal(true);
  };

  // Convertir Favorite vers format VideoPlayerModal
  const favoriteToVideo = (fav: Favorite): VideoForModal => ({
    id: fav.video_id,
    title: fav.title,
    thumbnail: fav.thumbnail,
    channelTitle: fav.channel_title,
    viewCount: fav.view_count,
    duration: fav.duration,
    durationSeconds: fav.duration_seconds,
    publishedAt: fav.published_at || undefined,
    likeCount: fav.like_count || undefined,
    isHD: fav.is_hd || false,
    hasChapters: fav.has_chapters || false,
    chapters: fav.chapters || undefined,
    isTrusted: fav.is_trusted || false,
  });

  // ============================================
  // HELPERS
  // ============================================

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count?.toString() || '0';
  };

  const formatLikes = (count: number | null): string | null => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffYears = now.getFullYear() - date.getFullYear();
    
    if (diffYears === 0) {
      return date.toLocaleDateString('fr-FR', { month: 'short' });
    } else if (diffYears === 1) {
      return "l'an dernier";
    } else {
      return date.getFullYear().toString();
    }
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

  // ============================================
  // GROUPEMENT
  // ============================================

  const groupedFavorites: GroupedFavorites[] = favorites.reduce((groups, fav) => {
    const query = fav.search_query || 'Autres vidéos';
    const existingGroup = groups.find(g => g.query === query);
    
    if (existingGroup) {
      existingGroup.favorites.push(fav);
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

  groupedFavorites.sort((a, b) => 
    new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );

  // ============================================
  // COMPOSANT VIDEOCARD
  // ============================================

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
        transition: 'all 0.3s',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
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
        
        {/* Badge HD */}
        {favorite.is_hd && (
          <span style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '2px 5px',
            borderRadius: '3px',
            fontSize: '0.65rem',
            fontWeight: '700'
          }}>
            HD
          </span>
        )}
        
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
        
        {/* Badge chapitré */}
        {favorite.has_chapters && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(59, 130, 246, 0.9)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600'
          }}>
            📑 Chapitré
          </span>
        )}
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
        
        {/* Ligne enrichie : vues + likes + date */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'rgba(255,255,255,0.4)', 
          fontSize: '0.65rem',
          flexWrap: 'wrap'
        }}>
          <span>👁️ {formatViews(favorite.view_count)}</span>
          {favorite.like_count && favorite.like_count > 0 && (
            <span>• 👍 {formatLikes(favorite.like_count)}</span>
          )}
          {favorite.published_at && (
            <span>• 📅 {formatDate(favorite.published_at)}</span>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header sticky - style breadcrumb */}
      <div style={{
        position: 'sticky',
        top: '60px',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        marginBottom: '1.5rem',
        padding: '0.75rem 0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Contexte */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <span>❤️</span>
            <span style={{ color: 'var(--gray-light)', fontWeight: '600' }}>Mes favoris</span>
            <span style={{ 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: '0.8rem',
              marginLeft: '0.25rem'
            }}>
              ({favorites.filter(f => (f.duration_seconds || 0) > 60).length} vidéos
              {favorites.filter(f => (f.duration_seconds || 0) <= 60).length > 0 && 
                ` / ${favorites.filter(f => (f.duration_seconds || 0) <= 60).length} shorts`
              })
            </span>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Bouton Retour résultats (conditionnel) */}
            {searchOrigin && (
              <button
                onClick={() => {
                  sessionStorage.removeItem('favoritesOrigin');
                  router.push(searchOrigin.path);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(249, 115, 22, 0.5)',
                  background: 'rgba(249, 115, 22, 0.1)',
                  color: '#f97316',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f97316';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                  e.currentTarget.style.color = '#f97316';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                ⬅️ Résultats
              </button>
            )}
            
            {/* Bouton Chercher */}
            <button
              onClick={handleNewSearch}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#10b981';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                e.currentTarget.style.color = '#10b981';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🔍 Chercher
            </button>
            
            {/* Bouton Accueil */}
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🏠
            </button>
          </div>
        </div>
      </div>

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
                    {group.query.charAt(0).toUpperCase() + group.query.slice(1)}
                  </h2>
                  <span style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '0.85rem' 
                }}>
                  ({group.favorites.filter(f => (f.duration_seconds || 0) > 60).length} vidéos
                  {group.favorites.filter(f => (f.duration_seconds || 0) <= 60).length > 0 && 
                    ` / ${group.favorites.filter(f => (f.duration_seconds || 0) <= 60).length} shorts`
                  })
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
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1rem'
              }}>
                {[...group.favorites]
                  .sort((a, b) => {
                    const aIsShort = (a.duration_seconds || 0) <= 60;
                    const bIsShort = (b.duration_seconds || 0) <= 60;
                    if (aIsShort && !bIsShort) return 1;  // Shorts après
                    if (!aIsShort && bIsShort) return -1; // Vidéos avant
                    return 0;
                  })
                  .map(fav => (
                    <VideoCard key={fav.id} favorite={fav} />
                  ))
                }
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

      {/* Modal Player Vidéo */}
      <VideoPlayerModal
        video={selectedVideoData ? favoriteToVideo(selectedVideoData) : null}
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        onFavoriteToggle={() => {
          // Déjà en favoris, donc on retire
          if (selectedVideoData) {
            removeFavorite(selectedVideoData.video_id, { stopPropagation: () => {} } as React.MouseEvent);
          }
        }}
        onMettreEnOeuvre={handleMettreEnOeuvre}
        isFavorite={true} // Toujours true car on est sur la page favoris
        showFavoriteButton={true}
        showMettreEnOeuvreButton={true}
      />

      {/* Modal analyse vidéo */}
      {selectedVideoData && (
        <VideoAnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          video={{
            id: selectedVideoData.video_id,
            title: selectedVideoData.title,
            description: '',
            thumbnail: selectedVideoData.thumbnail,
            channelTitle: selectedVideoData.channel_title,
            durationSeconds: selectedVideoData.duration_seconds,
            // v1.2 : Passer les chapitres s'ils existent
            chapters: selectedVideoData.chapters || undefined,
            hasChapters: selectedVideoData.has_chapters || false
          }}
          mode={analysisMode}
        />
      )}
    </div>
  );
}

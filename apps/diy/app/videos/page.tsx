'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  viewCount: number;
  duration: string;
  durationSeconds?: number;
  isTrusted?: boolean;
}

interface SearchSettings {
  include_shorts: boolean;
  query_used: string;
}

function VideosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Video[]>([]);
  const [settings, setSettings] = useState<SearchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (query) {
      searchVideos(false);
    } else {
      setLoading(false);
    }
  }, [query]);

  const searchVideos = async (expanded: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: expanded ? query : query, // On pourra ajouter des paramètres pour élargir
          maxResults: expanded ? 15 : 9,
          expanded // Flag pour la recherche élargie
        }),
      });
      const data = await res.json();
      setVideos(data.videos || []);
      setShorts(data.shorts || []);
      setSettings(data.settings || null);
      setIsExpanded(expanded);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandSearch = () => {
    searchVideos(true);
  };

  const handleRefineSearch = () => {
    window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
      detail: { 
        pageContext: 'video_decouverte',
        welcomeMessage: `Les résultats pour "${query}" ne te conviennent pas ? Précise-moi ce que tu cherches exactement ! 🎬`
      } 
    }));
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count.toString();
  };

  const VideoCard = ({ video, isShort = false }: { video: Video; isShort?: boolean }) => (
    <div
      onClick={() => setSelectedVideo(video.id)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: selectedVideo === video.id 
          ? '2px solid var(--green)' 
          : video.isTrusted 
            ? '2px solid rgba(16, 185, 129, 0.3)'
            : '2px solid transparent',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ position: 'relative' }}>
        <img 
          src={video.thumbnail} 
          alt={video.title}
          style={{ 
            width: '100%', 
            height: isShort ? '200px' : '160px', 
            objectFit: 'cover' 
          }}
        />
        {/* Durée */}
        <span style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          background: isShort ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {isShort ? '▶ Short' : video.duration}
        </span>
        {/* Badge chaîne de confiance */}
        {video.isTrusted && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'var(--green)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600'
          }}>
            ✓ Recommandé
          </span>
        )}
      </div>
      <div style={{ padding: '0.75rem' }}>
        <h3 style={{ 
          color: 'white', 
          fontSize: '0.85rem', 
          marginBottom: '0.4rem',
          lineHeight: '1.3',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {video.title}
        </h3>
        <p style={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.75rem',
          marginBottom: '0.25rem'
        }}>
          {video.channelTitle}
        </p>
        <span style={{ 
          color: 'rgba(255,255,255,0.4)', 
          fontSize: '0.7rem' 
        }}>
          👁️ {formatViews(video.viewCount)} vues
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header avec navigation */}
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
            🎬 Tutoriels
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            Résultats pour : "{query}"
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!isExpanded && videos.length > 0 && (
            <button
              onClick={handleExpandSearch}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '2px solid var(--blue)',
                background: 'transparent',
                color: 'var(--blue)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🔍 Élargir la recherche
            </button>
          )}
          <button
            onClick={handleRefineSearch}
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
            🔄 Affiner la recherche
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'white' }}>⏳ Recherche en cours...</p>
        </div>
      ) : videos.length === 0 && shorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Aucune vidéo trouvée
          </p>
          <button
            onClick={handleRefineSearch}
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
            🔄 Reformuler ma recherche
          </button>
        </div>
      ) : (
        <>
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
            </div>
          )}

          {/* Section Vidéos */}
          {videos.length > 0 && (
            <>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <h2 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                  📺 Tutoriels vidéo
                </h2>
                <span style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '0.85rem' 
                }}>
                  ({videos.length})
                </span>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem'
              }}>
                {videos.map(video => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </>
          )}

          {/* Section Shorts */}
          {shorts.length > 0 && (
            <>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <h2 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                  ⚡ Shorts
                </h2>
                <span style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '0.85rem' 
                }}>
                  ({shorts.length})
                </span>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '1rem'
              }}>
                {shorts.map(video => (
                  <VideoCard key={video.id} video={video} isShort />
                ))}
              </div>
            </>
          )}

          {/* Message si recherche élargie */}
          {isExpanded && (
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ color: 'var(--blue)', fontSize: '0.9rem', margin: 0 }}>
                🔍 Recherche élargie - Plus de résultats affichés
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function VideosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'white' }}>⏳ Chargement...</div>}>
      <VideosContent />
    </Suspense>
  );
}

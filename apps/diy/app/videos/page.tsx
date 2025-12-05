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
}

function VideosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    if (query) {
      searchVideos();
    } else {
      setLoading(false);
    }
  }, [query]);

  const searchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults: 9 }),
      });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefineSearch = () => {
    window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
      detail: { 
        pageContext: 'video_decouverte',
        welcomeMessage: `Les résultats pour "${query}" ne te conviennent pas ? Précise-moi ce que tu cherches exactement ! 🎬`
      } 
    }));
  };

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
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
      ) : videos.length === 0 ? (
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

          {/* Grille 9 vidéos */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {videos.map(video => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video.id)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: selectedVideo === video.id 
                    ? '2px solid var(--green)' 
                    : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    style={{ width: '100%', height: '160px', objectFit: 'cover' }}
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
                    {video.duration}
                  </span>
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
                    👁️ {(video.viewCount / 1000).toFixed(0)}k vues
                  </span>
                </div>
              </div>
            ))}
          </div>
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

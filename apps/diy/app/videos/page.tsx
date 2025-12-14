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
  aiScore?: number;
}

interface SearchInfo {
  originalQuery: string;
  finalQuery: string;
  attempts: number;
  averageScore: number;
  aiEnabled: boolean;
  status: 'excellent' | 'good' | 'acceptable' | 'limited';
}

// ==================== COMPOSANT LOADING ====================
function LoadingSearch() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  
  const steps = [
    { icon: '🔍', text: 'Recherche YouTube en cours...' },
    { icon: '🤖', text: 'Analyse de la pertinence (IA)...' },
    { icon: '⭐', text: 'Sélection des meilleures vidéos...' },
    { icon: '✨', text: 'Finalisation des résultats...' },
  ];
  
  const TOTAL_DURATION = 12000; // 12 secondes
  const STEP_DURATION = TOTAL_DURATION / steps.length;
  
  useEffect(() => {
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(newProgress);
      
      const newStep = Math.min(Math.floor(elapsed / STEP_DURATION), steps.length - 1);
      
      if (newStep !== step) {
        const completedSteps = [];
        for (let i = 0; i < newStep; i++) {
          completedSteps.push(i);
        }
        setCompleted(completedSteps);
        setStep(newStep);
      }
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
    
    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div style={{ 
      padding: '3rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem'
    }}>
      {/* Progress bar */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--green), #10b981)',
          borderRadius: '3px',
          transition: 'width 0.1s linear'
        }} />
      </div>
      
      {/* Steps */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        maxWidth: '350px'
      }}>
        {steps.map((s, i) => {
          const isCompleted = completed.includes(i);
          const isCurrent = step === i;
          
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: isCurrent 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : isCompleted 
                    ? 'rgba(16, 185, 129, 0.05)'
                    : 'transparent',
                border: isCurrent 
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid transparent',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>
                {isCompleted ? '✅' : s.icon}
              </span>
              <span style={{
                color: isCompleted 
                  ? 'rgba(255,255,255,0.5)' 
                  : isCurrent 
                    ? 'var(--green)'
                    : 'rgba(255,255,255,0.4)',
                fontSize: '0.9rem',
                fontWeight: isCurrent ? '600' : '400',
                textDecoration: isCompleted ? 'line-through' : 'none'
              }}>
                {s.text}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Avatar optionnel */}
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'pulse 2s infinite'
      }}>
        <span style={{ fontSize: '1.5rem' }}>🎬</span>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

function VideosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Video[]>([]);
  const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
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
          query: query,
          maxResults: expanded ? 15 : 9,
          expanded
        }),
      });
      const data = await res.json();
      setVideos(data.videos || []);
      setShorts(data.shorts || []);
      setSearchInfo(data.searchInfo || null);
      setIsExpanded(expanded);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoreResults = () => {
    searchVideos(true);
  };

  const handleNewSearch = () => {
    window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
      detail: { 
        pageContext: 'video_decouverte',
        welcomeMessage: `Tu cherches autre chose ? Dis-moi quel tutoriel tu veux trouver ! 🎬`
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
              onClick={handleMoreResults}
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
              ➕ Plus de résultats
            </button>
          )}
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
            🔄 Nouvelle recherche
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
        <LoadingSearch />
      ) : videos.length === 0 && shorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Aucune vidéo trouvée
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
            🔄 Nouvelle recherche
          </button>
        </div>
      ) : (
        <>
          {/* Indicateur de qualité des résultats */}
          {searchInfo && searchInfo.aiEnabled && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '0.75rem 1rem',
              background: searchInfo.status === 'excellent' 
                ? 'rgba(16, 185, 129, 0.1)'
                : searchInfo.status === 'good'
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'rgba(251, 191, 36, 0.1)',
              border: `1px solid ${
                searchInfo.status === 'excellent' 
                  ? 'rgba(16, 185, 129, 0.3)'
                  : searchInfo.status === 'good'
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(251, 191, 36, 0.3)'
              }`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>
                {searchInfo.status === 'excellent' ? '⭐' : 
                 searchInfo.status === 'good' ? '✅' : '💡'}
              </span>
              <span style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.85rem' 
              }}>
                {searchInfo.status === 'excellent' 
                  ? 'Résultats très pertinents'
                  : searchInfo.status === 'good'
                    ? 'Bons résultats trouvés'
                    : 'Résultats approximatifs - essaie "Nouvelle recherche" pour préciser'}
              </span>
            </div>
          )}

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
                ➕ Plus de résultats affichés
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

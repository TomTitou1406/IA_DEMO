/**
 * /app/videos/page.tsx
 * Page d'affichage des résultats de recherche YouTube
 * 
 * @version 2.3
 * 
 * Changelog :
 * - v2.3 : Ajout bouton ❤️ favoris sur les cards + lien vers /videos/favorites
 * - v2.2 : Pagination dynamique depuis BDD (displaySettings)
 * - v2.1 : Pagination côté client avec bouton "Voir plus" centré
 * - v2.0 : Loader progressif circulaire, suppression bandeau qualité
 * - v1.0 : Version initiale avec recherche basique
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import VideoAnalysisModal from '@/app/components/VideoAnalysisModal';
import VideoPlayerModal from '@/app/components/VideoPlayerModal';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  viewCount: number;
  duration: string;
  durationSeconds: number;
  score: number;
  isTrusted: boolean;
  isShort: boolean;
  aiScore?: number;
  aiReason?: string;
  // v3.4
  publishedAt: string;
  likeCount: number;
  isHD: boolean;
  // v3.5
  hasChapters: boolean;
  chapters: Array<{
    title: string;
    start_seconds: number;
    start_formatted: string;
  }>;
}

interface SearchInfo {
  originalQuery: string;
  finalQuery: string;
  attempts: number;
  averageScore: number;
  aiEnabled: boolean;
  status: 'excellent' | 'good' | 'acceptable' | 'limited';
  totalVideos: number;
  totalShorts: number;
  displaySettings: {
    videosPerPage: number;
    shortsPerPage: number;
  };
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

  const TOTAL_DURATION = 15000;
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

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 1.5rem',
          position: 'relative'
        }}>
          <svg
            width="120"
            height="120"
            style={{
              transform: 'rotate(-90deg)',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="rgba(16, 185, 129, 0.2)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--green)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.1s linear'
              }}
            />
          </svg>
          
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem'
          }}>
            🎬
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0a0a0a',
            padding: '0 0.5rem',
            fontSize: '0.75rem',
            color: 'var(--green)',
            fontWeight: '700'
          }}>
            {Math.round(progress)}%
          </div>
        </div>

        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          color: 'var(--gray-light)',
          marginBottom: '0.5rem'
        }}>
          Recherche de tutoriels...
        </h2>

        <p style={{
          fontSize: '0.95rem',
          color: 'var(--gray)',
          marginBottom: '1.5rem'
        }}>
          L'assistant recherche et sélectionne les meilleures vidéos pour toi.
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          {steps.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                borderRadius: '8px',
                background: idx === step ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                transition: 'all 0.3s'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
              <span style={{
                fontSize: '0.85rem',
                color: idx === step ? 'var(--green)' : completed.includes(idx) ? '#10b981' : 'var(--gray)',
                fontWeight: idx === step ? '600' : '400',
                flex: 1,
                textAlign: 'left'
              }}>
                {s.text}
              </span>
              {completed.includes(idx) && <span style={{ color: '#10b981' }}>✓</span>}
              {idx === step && <span style={{ color: 'var(--green)' }}>...</span>}
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
          Cela peut prendre quelques secondes...
        </p>
      </div>
    </div>
  );
}

// ==================== COMPOSANT PRINCIPAL ====================
function VideosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Video[]>([]);
  const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedVideoData, setSelectedVideoData] = useState<Video | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  
  // Favoris
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Modal analyse vidéo
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'complexe'>('simple');
  
  // Pagination côté client
  const [videosDisplayCount, setVideosDisplayCount] = useState(9);
  const [shortsDisplayCount, setShortsDisplayCount] = useState(6);
  const [videosPerPage, setVideosPerPage] = useState(9);
  const [shortsPerPage, setShortsPerPage] = useState(6);

  // Charger les favoris au démarrage
  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (query) {
      searchVideos();
    } else {
      setLoading(false);
    }
  }, [query]);

  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/videos/favorites');
      const data = await res.json();
      if (data.favorites) {
        const ids = new Set<string>(data.favorites.map((f: any) => f.video_id));
        setFavoriteIds(ids);
        setFavoritesCount(data.count || 0);
      }
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
    }
  };

  const toggleFavorite = async (video: Video, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection de la vidéo
    
    const isFavorite = favoriteIds.has(video.id);
    
    try {
      if (isFavorite) {
        // Retirer des favoris
        await fetch(`/api/videos/favorites?video_id=${video.id}`, {
          method: 'DELETE'
        });
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(video.id);
          return next;
        });
        setFavoritesCount(prev => prev - 1);
        window.dispatchEvent(new Event('favoritesUpdated'));
      } else {
        // Ajouter aux favoris
        await fetch('/api/videos/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_title: video.channelTitle,
            duration: video.duration,
            duration_seconds: video.durationSeconds,
            view_count: video.viewCount,
            search_query: query,
            // v3.5 : Nouveaux champs
            published_at: video.publishedAt || null,
            like_count: video.likeCount || 0,
            is_hd: video.isHD || false,
            chapters: video.chapters || null,
            has_chapters: video.hasChapters || false,
            is_trusted: video.isTrusted || false
          })
        });
        setFavoriteIds(prev => new Set(prev).add(video.id));
        setFavoritesCount(prev => prev + 1);
        window.dispatchEvent(new Event('favoritesUpdated'));
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
    }
  };

  const searchVideos = async () => {
    // Vérifier le cache d'abord
    const cached = sessionStorage.getItem('lastVideoSearch');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        // Si même query et cache < 10 minutes
        if (data.query === query && Date.now() - data.timestamp < 600000) {
          console.log('📦 Résultats depuis le cache');
          setVideos(data.videos || []);
          setShorts(data.shorts || []);
          setSearchInfo(data.searchInfo || null);
          
          if (data.searchInfo?.displaySettings) {
            const { videosPerPage: vpp, shortsPerPage: spp } = data.searchInfo.displaySettings;
            setVideosPerPage(vpp);
            setShortsPerPage(spp);
            setVideosDisplayCount(vpp);
            setShortsDisplayCount(spp);
          }
          setLoading(false);
          return; // Skip l'appel API
        }
      } catch (e) {
        console.log('Cache invalide, recherche normale');
      }
    }
  
    setLoading(true);
    
    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setVideos(data.videos || []);
      setShorts(data.shorts || []);
      setSearchInfo(data.searchInfo || null);
      
      if (data.searchInfo?.displaySettings) {
        const { videosPerPage: vpp, shortsPerPage: spp } = data.searchInfo.displaySettings;
        setVideosPerPage(vpp);
        setShortsPerPage(spp);
        setVideosDisplayCount(vpp);
        setShortsDisplayCount(spp);
      }
  
      // Sauvegarder en cache
      sessionStorage.setItem('lastVideoSearch', JSON.stringify({
        query,
        videos: data.videos || [],
        shorts: data.shorts || [],
        searchInfo: data.searchInfo || null,
        timestamp: Date.now()
      }));
      console.log('💾 Résultats mis en cache');
  
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = () => {
    window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
      detail: { 
        pageContext: 'video_decouverte',
        welcomeMessage: `Tu cherches autre chose ? Dis-moi quel tutoriel tu veux trouver ! 🎬`
      } 
    }));
  };

  const handleShowMoreVideos = () => {
    setVideosDisplayCount(prev => prev + videosPerPage);
  };

  const handleShowMoreShorts = () => {
    setShortsDisplayCount(prev => prev + shortsPerPage);
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count.toString();
  };

  // Vidéos à afficher (paginées)
  const displayedVideos = videos.slice(0, videosDisplayCount);
  const remainingVideos = videos.length - videosDisplayCount;
  
  const displayedShorts = shorts.slice(0, shortsDisplayCount);
  const remainingShorts = shorts.length - shortsDisplayCount;

  const VideoCard = ({ video, isShort = false }: { video: Video; isShort?: boolean }) => {
    const isFavorite = favoriteIds.has(video.id);
    
    // Formater la date de publication
    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diffYears = now.getFullYear() - date.getFullYear();
      
      if (diffYears === 0) {
        // Cette année : afficher mois
        return date.toLocaleDateString('fr-FR', { month: 'short' });
      } else if (diffYears === 1) {
        return 'l\'an dernier';
      } else {
        return date.getFullYear().toString();
      }
    };

    // Formater les likes
    const formatLikes = (count: number) => {
      if (!count) return null;
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
      return count.toString();
    };
    
    return (
      <div
        onClick={() => {
          setSelectedVideo(video.id);
          setSelectedVideoData(video);
          setShowPlayerModal(true);
        }}
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
          
          {/* Badge HD */}
          {video.isHD && !isShort && (
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
          
          {/* Bouton Favori ❤️ */}
          <button
            onClick={(e) => toggleFavorite(video, e)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'white',
              color: isFavorite ? '#ef4444' : '#9ca3af',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              zIndex: 10
            }}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
          
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
          {/* Badge chapitré (si pas recommandé) */}
          {video.hasChapters && !video.isTrusted && (
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
          
          {/* Badge chapitré (si aussi recommandé - en dessous) */}
          {video.hasChapters && video.isTrusted && (
            <span style={{
              position: 'absolute',
              top: '32px',
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
          {/* Ligne enrichie : vues + likes + date */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '0.7rem',
            flexWrap: 'wrap'
          }}>
            <span>👁️ {formatViews(video.viewCount)}</span>
            {video.likeCount > 0 && (
              <span>• 👍 {formatLikes(video.likeCount)}</span>
            )}
            {video.publishedAt && (
              <span>• 📅 {formatDate(video.publishedAt)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Bouton "Voir plus" réutilisable
  const ShowMoreButton = ({ remaining, onClick, label }: { remaining: number; onClick: () => void; label: string }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginTop: '1.5rem',
      marginBottom: '1rem'
    }}>
      <button
        onClick={onClick}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '25px',
          border: '2px solid var(--green)',
          background: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--green)',
          fontSize: '0.9rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
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
        <span>➕</span>
        <span>Voir plus ({remaining} {label})</span>
      </button>
    </div>
  );

  return (
    
    <div style={{ padding: '2rem', paddingTop: '5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header sticky */}
      <div style={{
        position: 'fixed',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.75rem 2rem',
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
            <span>🎬</span>
            <span style={{ color: 'var(--gray-light)', fontWeight: '600' }}>Tutoriels</span>
            <span style={{ color: 'var(--gray)', opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--gray)' }}>"{query}"</span>
            <span style={{ 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: '0.8rem',
              marginLeft: '0.25rem'
            }}>
             ({videos.length} vidéos{shorts.length > 0 && ` / ${shorts.length} shorts`})
            </span>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Bouton Favoris */}
            <button
              onClick={() => {
                sessionStorage.setItem('favoritesOrigin', JSON.stringify({
                  from: 'search',
                  query: query,
                  path: `/videos?q=${encodeURIComponent(query)}`
                }));
                router.push('/videos/favorites');
              }}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ❤️ {favoritesCount > 0 ? favoritesCount : ''}
            </button>
            
            {/* Bouton Nouvelle recherche */}
            <button
              onClick={handleNewSearch}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--green)',
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
              🔄 Rechercher
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
          {/* Section Vidéos */}
          {videos.length > 0 && (
            <>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h2 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                  🎬 Vidéos longues
                </h2>
                <span style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '0.85rem' 
                }}>
                  ({displayedVideos.length}/{videos.length})
                </span>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1.25rem'
              }}>
                {displayedVideos.map(video => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>

              {/* Bouton Voir plus - Vidéos */}
              {remainingVideos > 0 && (
                <ShowMoreButton 
                  remaining={remainingVideos} 
                  onClick={handleShowMoreVideos}
                  label="vidéos"
                />
              )}
            </>
          )}

          {/* Section Shorts */}
          {shorts.length > 0 && (
            <>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '1rem',
                marginTop: '2rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h2 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                  ⚡ Shorts vidéos
                </h2>
                <span style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '0.85rem' 
                }}>
                  ({displayedShorts.length}/{shorts.length})
                </span>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '1rem'
              }}>
                {displayedShorts.map(video => (
                  <VideoCard key={video.id} video={video} isShort />
                ))}
              </div>

              {/* Bouton Voir plus - Shorts */}
              {remainingShorts > 0 && (
                <ShowMoreButton 
                  remaining={remainingShorts} 
                  onClick={handleShowMoreShorts}
                  label="shorts"
                />
              )}
            </>
          )}
        </>
      )}
      {/* Modal analyse vidéo */}
      {selectedVideoData && (
        <VideoAnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          searchQuery={query}
          video={{
            id: selectedVideoData.id,
            title: selectedVideoData.title,
            description: selectedVideoData.description || '',
            thumbnail: selectedVideoData.thumbnail,
            channelTitle: selectedVideoData.channelTitle,
            durationSeconds: selectedVideoData.durationSeconds
          }}
          mode={analysisMode}
        />
      )}
      {/* Modal Player Vidéo */}
      <VideoPlayerModal
        video={selectedVideoData}
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        onFavoriteToggle={() => {
          if (selectedVideoData) {
            toggleFavorite(selectedVideoData, new MouseEvent('click') as any);
          }
        }}
        onMettreEnOeuvre={() => {
          setShowPlayerModal(false);
          setAnalysisMode('simple');
          setShowAnalysisModal(true);
        }}
        isFavorite={selectedVideoData ? favoriteIds.has(selectedVideoData.id) : false}
      />
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

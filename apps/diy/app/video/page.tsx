'use client';

import { useSearchParams } from 'next/navigation';
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
        body: JSON.stringify({ query, maxResults: 6 }),
      });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: 'white', marginBottom: '1rem' }}>🎬 Tutoriels</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
        Résultats pour : "{query}"
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'white' }}>⏳ Recherche en cours...</p>
        </div>
      ) : videos.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Aucune vidéo trouvée</p>
      ) : (
        <>
          {selectedVideo && (
            <div style={{ marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden' }}>
              <iframe
                width="100%"
                height="400"
                src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {videos.map(video => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video.id)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',

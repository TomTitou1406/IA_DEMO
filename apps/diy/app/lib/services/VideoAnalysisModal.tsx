/**
 * /app/components/VideoAnalysisModal.tsx
 * Modal d'analyse de vidéo YouTube pour création de chantier/travail inspiré
 * 
 * @version 1.0
 * 
 * Fonctionnalités :
 * - Affiche les chapitres détectés
 * - Alerte si pas de chapitres
 * - Propose de continuer ou chercher autre vidéo
 * - Redirige vers création travail simple ou chantier
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VideoAnalysis, VideoInspiration, toVideoInspiration } from '@/app/lib/services/videoAnalyzerService';

interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    durationSeconds?: number;
  };
  mode: 'simple' | 'complexe';
}

type AnalysisStep = 'analyzing' | 'results' | 'no_chapters' | 'error';

export default function VideoAnalysisModal({ 
  isOpen, 
  onClose, 
  video,
  mode 
}: VideoAnalysisModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<AnalysisStep>('analyzing');
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen && video) {
      analyzeVideo();
    }
  }, [isOpen, video]);

  useEffect(() => {
    if (step === 'analyzing') {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [step]);

  const analyzeVideo = async () => {
    setStep('analyzing');
    setProgress(0);
    setError(null);

    try {
      const response = await fetch('/api/youtube/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: video.id,
          title: video.title,
          description: video.description || '',
          thumbnail: video.thumbnail,
          channel: video.channelTitle,
          duration_seconds: video.durationSeconds || 0
        })
      });

      const data = await response.json();
      setProgress(100);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur analyse');
      }

      setAnalysis(data.analysis);
      
      // Vérifier si chapitres disponibles
      if (data.analysis.has_chapters && data.analysis.chapters.length >= 2) {
        setStep('results');
      } else {
        setStep('no_chapters');
      }

    } catch (err: any) {
      console.error('Erreur analyse vidéo:', err);
      setError(err.message);
      setStep('error');
    }
  };

  const handleContinue = () => {
    if (!analysis) return;

    // Stocker les données en sessionStorage pour les récupérer dans la page de création
    const inspiration: VideoInspiration = toVideoInspiration(analysis);
    
    sessionStorage.setItem('videoInspiration', JSON.stringify({
      inspiration,
      mode,
      fromVideo: true
    }));

    onClose();

    // Rediriger selon le mode
    if (mode === 'simple') {
      // Ouvrir l'assistant travaux simples avec contexte vidéo
      window.dispatchEvent(new CustomEvent('openAssistantWithContext', {
        detail: {
          pageContext: 'travaux_simple_video',
          contextColor: '#2563eb',
          welcomeMessage: `Super ! Je vais t'aider à reproduire ce tuto : "${video.title}"\n\nJ'ai identifié ${analysis.chapters.length} étapes clés. Quelques questions pour adapter à ta situation...`,
          additionalContext: `VIDEO INSPIRATION:\nTitre: ${video.title}\nÉtapes clés: ${analysis.ai_analysis?.etapes_cles?.join(', ')}\n\nGénère un travail simple inspiré de cette vidéo.`
        }
      }));
    } else {
      // Rediriger vers création chantier
      router.push('/chantiers/nouveau?from=video');
    }
  };

  const handleSearchOther = () => {
    onClose();
    // Retour à la recherche
  };

  const handleContinueAnyway = () => {
    // Continuer même sans chapitres (fallback sur titre)
    handleContinue();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== ÉTAPE : ANALYSE EN COURS ==================== */}
        {step === 'analyzing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              position: 'relative'
            }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.2)"
                  strokeWidth="6"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={220}
                  strokeDashoffset={220 - (progress / 100) * 220}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🔍
              </div>
            </div>

            <h2 style={{ 
              color: 'white', 
              fontSize: '1.3rem', 
              fontWeight: '700',
              marginBottom: '0.5rem'
            }}>
              Analyse en cours...
            </h2>

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {progress < 30 && "Lecture de la vidéo..."}
              {progress >= 30 && progress < 60 && "Détection des chapitres..."}
              {progress >= 60 && progress < 90 && "Identification des étapes clés..."}
              {progress >= 90 && "Finalisation..."}
            </p>

            {/* Mini aperçu vidéo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '0.75rem',
              marginTop: '1rem'
            }}>
              <img 
                src={video.thumbnail} 
                alt=""
                style={{
                  width: '60px',
                  height: '45px',
                  borderRadius: '6px',
                  objectFit: 'cover'
                }}
              />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ 
                  color: 'white', 
                  fontSize: '0.8rem',
                  margin: 0,
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {video.title}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE : RÉSULTATS (CHAPITRES OK) ==================== */}
        {step === 'results' && analysis && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <h2 style={{ 
                color: 'white', 
                fontSize: '1.3rem', 
                fontWeight: '700',
                marginBottom: '0.25rem'
              }}>
                {analysis.chapters.length} étapes détectées !
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                Ces étapes guideront la génération de ton {mode === 'simple' ? 'travail' : 'chantier'}
              </p>
            </div>

            {/* Liste des chapitres */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {analysis.chapters.map((chapter, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderBottom: idx < analysis.chapters.length - 1 
                      ? '1px solid rgba(255,255,255,0.05)' 
                      : 'none'
                  }}
                >
                  <span style={{
                    background: 'var(--green)',
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ 
                    color: 'var(--gray-light)', 
                    fontSize: '0.85rem',
                    flex: 1
                  }}>
                    {chapter.title}
                  </span>
                  <span style={{ 
                    color: 'var(--gray)', 
                    fontSize: '0.75rem' 
                  }}>
                    {chapter.start_formatted}
                  </span>
                </div>
              ))}
            </div>

            {/* Type détecté */}
            {analysis.ai_analysis?.type_projet && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                padding: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <span>🏷️</span>
                <span style={{ color: 'var(--gray-light)', fontSize: '0.85rem' }}>
                  Type détecté : <strong style={{ color: 'var(--green)' }}>{analysis.ai_analysis.type_projet}</strong>
                </span>
              </div>
            )}

            {/* Info */}
            <p style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.8rem', 
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              💡 PapiBricole adaptera ces étapes selon les règles métier et ta situation
            </p>

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleContinue}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: mode === 'simple' ? 'var(--blue)' : 'var(--orange)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>{mode === 'simple' ? '🔧' : '🏗️'}</span>
                <span>Créer mon {mode === 'simple' ? 'travail' : 'chantier'}</span>
              </button>
            </div>
          </>
        )}

        {/* ==================== ÉTAPE : PAS DE CHAPITRES ==================== */}
        {step === 'no_chapters' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h2 style={{ 
                color: 'white', 
                fontSize: '1.3rem', 
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}>
                Chapitres non disponibles
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                Cette vidéo n'a pas de chapitres détaillés
              </p>
            </div>

            {/* Explication */}
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ 
                color: 'var(--gray-light)', 
                fontSize: '0.85rem',
                margin: 0,
                lineHeight: 1.5
              }}>
                Sans chapitres, la génération sera basée uniquement sur le <strong>titre de la vidéo</strong>. 
                Le résultat sera moins précis et pourrait nécessiter plus d'ajustements.
              </p>
            </div>

            {/* Options */}
            <p style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '0.85rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              Tu peux :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleSearchOther}
                style={{
                  padding: '0.875rem',
                  borderRadius: '12px',
                  border: '2px solid var(--green)',
                  background: 'transparent',
                  color: 'var(--green)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>🔍</span>
                <span>Chercher une autre vidéo</span>
              </button>

              <button
                onClick={handleContinueAnyway}
                style={{
                  padding: '0.875rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>Continuer malgré tout</span>
              </button>

              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
            </div>
          </>
        )}

        {/* ==================== ÉTAPE : ERREUR ==================== */}
        {step === 'error' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
              <h2 style={{ 
                color: 'white', 
                fontSize: '1.3rem', 
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}>
                Erreur d'analyse
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                {error || "Impossible d'analyser cette vidéo"}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Fermer
              </button>
              <button
                onClick={analyzeVideo}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--blue)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Réessayer
              </button>
            </div>
          </>
        )}
      </div>

      {/* Styles animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

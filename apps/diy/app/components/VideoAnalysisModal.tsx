/**
 * /app/components/VideoAnalysisModal.tsx
 * Modal d'analyse de vidéo YouTube pour création de chantier/travail inspiré
 * 
 * @version 1.2
 * 
 * Changelog :
 * - v1.2 : Classification IA intelligente (simple vs chantier) + bridage
 * - v1.1 : Accepte chapitres pré-chargés (depuis favoris)
 * - v1.0 : Version initiale
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VideoAnalysis, VideoInspiration, toVideoInspiration } from '@/app/lib/services/videoAnalyzerService';

// ============================================
// TYPES
// ============================================

interface VideoChapter {
  title: string;
  start_seconds: number;
  start_formatted: string;
}

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
    chapters?: VideoChapter[];
    hasChapters?: boolean;
  };
  searchQuery?: string; // Requête de recherche originale
}

interface ClassificationResult {
  classification: 'simple' | 'complexe';
  confiance: number;
  raisons: string[];
  risques_sensibles: string[];
  lots_potentiels: string[];
  duree_estimee: string;
  message_utilisateur: string;
}

interface ClassificationResponse {
  success: boolean;
  result: ClassificationResult;
  mode_affichage: 'simple_only' | 'complexe_only' | 'choix';
  bouton_recommande: 'simple' | 'complexe';
}

type AnalysisStep = 'analyzing' | 'classifying' | 'results' | 'no_chapters' | 'error';

// ============================================
// COMPOSANT
// ============================================

export default function VideoAnalysisModal({ 
  isOpen, 
  onClose, 
  video,
  searchQuery
}: VideoAnalysisModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<AnalysisStep>('analyzing');
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [classification, setClassification] = useState<ClassificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen && video) {
      // Reset state
      setStep('analyzing');
      setProgress(0);
      setClassification(null);
      setError(null);
      
      // Si chapitres pré-chargés, les utiliser directement
      if (video.hasChapters && video.chapters && video.chapters.length >= 2) {
        usePreloadedChapters();
      } else {
        analyzeVideo();
      }
    }
  }, [isOpen, video]);

  useEffect(() => {
    if (step === 'analyzing' || step === 'classifying') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (step === 'analyzing') return Math.min(prev + 8, 50);
          if (step === 'classifying') return Math.min(prev + 5, 95);
          return prev;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Utiliser les chapitres pré-chargés (depuis favoris)
  const usePreloadedChapters = async () => {
    setProgress(50);
    
    const preloadedAnalysis: VideoAnalysis = {
      video_id: video.id,
      title: video.title,
      description: video.description || '',
      thumbnail: video.thumbnail,
      channel: video.channelTitle,
      duration_seconds: video.durationSeconds || 0,
      has_chapters: true,
      chapters: video.chapters || [],
      ai_analysis: null,
      analyzed_at: new Date().toISOString()
    };
    
    setAnalysis(preloadedAnalysis);
    
    // Classifier le projet
    await classifyProject(preloadedAnalysis);
  };

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
      setProgress(50);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur analyse');
      }

      setAnalysis(data.analysis);
      
      // Vérifier si chapitres disponibles
      if (data.analysis.has_chapters && data.analysis.chapters.length >= 2) {
        await classifyProject(data.analysis);
      } else {
        setStep('no_chapters');
      }

    } catch (err: any) {
      console.error('Erreur analyse vidéo:', err);
      setError(err.message);
      setStep('error');
    }
  };

  const classifyProject = async (analysisData: VideoAnalysis) => {
    setStep('classifying');
    
    try {
      const chapitresTitles = analysisData.chapters?.map(c => c.title) || [];
      
      const response = await fetch('/api/ai/classify-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre_recherche: searchQuery || video.title,
          titre_video: video.title,
          chapitres: chapitresTitles.length > 0 ? chapitresTitles : undefined
        })
      });

      const data: ClassificationResponse = await response.json();
      setProgress(100);

      if (!response.ok || !data.success) {
        throw new Error('Erreur classification');
      }

      setClassification(data);
      setStep('results');

    } catch (err: any) {
      console.error('Erreur classification:', err);
      // Fallback : afficher les deux boutons
      setClassification({
        success: true,
        result: {
          classification: 'simple',
          confiance: 50,
          raisons: [],
          risques_sensibles: [],
          lots_potentiels: [],
          duree_estimee: 'À déterminer',
          message_utilisateur: 'Tu peux choisir le mode qui te convient.'
        },
        mode_affichage: 'choix',
        bouton_recommande: 'simple'
      });
      setStep('results');
    }
  };

  const handleCreate = (mode: 'simple' | 'complexe') => {
    if (!analysis) return;

    // Stocker les données en sessionStorage
    const inspiration: VideoInspiration = toVideoInspiration(analysis);
    
    sessionStorage.setItem('videoInspiration', JSON.stringify({
      inspiration,
      mode,
      fromVideo: true
    }));

    onClose();

    // Rediriger selon le mode
    if (mode === 'simple') {
      window.dispatchEvent(new CustomEvent('openAssistantWithContext', {
        detail: {
          pageContext: 'travaux_simple_video',
          contextColor: '#2563eb',
          welcomeMessage: `Super ! Je vais t'aider à reproduire ce tuto : "${video.title}"\n\nJ'ai identifié ${analysis.chapters?.length || 0} étapes clés. Quelques questions pour adapter à ta situation...`,
          additionalContext: `VIDEO INSPIRATION:\nTitre: ${video.title}\nÉtapes clés: ${analysis.ai_analysis?.etapes_cles?.join(', ')}\n\nGénère un travail simple inspiré de cette vidéo.`
        }
      }));
    } else {
      router.push('/chantiers/nouveau?from=video');
    }
  };

  const handleSearchOther = () => {
    onClose();
  };

  const handleContinueAnyway = async () => {
    // Continuer même sans chapitres
    if (!analysis) {
      const fallbackAnalysis: VideoAnalysis = {
        video_id: video.id,
        title: video.title,
        description: video.description || '',
        thumbnail: video.thumbnail,
        channel: video.channelTitle,
        duration_seconds: video.durationSeconds || 0,
        has_chapters: false,
        chapters: [],
        ai_analysis: null,
        analyzed_at: new Date().toISOString()
      };
      setAnalysis(fallbackAnalysis);
      await classifyProject(fallbackAnalysis);
    } else {
      await classifyProject(analysis);
    }
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
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== ÉTAPE : ANALYSE EN COURS ==================== */}
        {(step === 'analyzing' || step === 'classifying') && (
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
                {step === 'analyzing' ? '🔍' : '🤖'}
              </div>
            </div>

            <h2 style={{ 
              color: 'white', 
              fontSize: '1.3rem', 
              fontWeight: '700',
              marginBottom: '0.5rem'
            }}>
              {step === 'analyzing' ? 'Analyse en cours...' : 'Classification du projet...'}
            </h2>

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {step === 'analyzing' && progress < 30 && "Lecture de la vidéo..."}
              {step === 'analyzing' && progress >= 30 && "Détection des chapitres..."}
              {step === 'classifying' && "L'IA analyse le type de projet..."}
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
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <p style={{
                  color: 'white',
                  fontSize: '0.8rem',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {video.title}
                </p>
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.7rem',
                  margin: 0
                }}>
                  {video.channelTitle}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE : RÉSULTATS AVEC CLASSIFICATION ==================== */}
        {step === 'results' && analysis && classification && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.5rem'
              }}>
                ✅
              </div>
              <h2 style={{ 
                color: 'white', 
                fontSize: '1.3rem', 
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}>
                Analyse terminée !
              </h2>
              {analysis.chapters && analysis.chapters.length > 0 && (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                  {analysis.chapters.length} étapes détectées
                </p>
              )}
            </div>

            {/* Recommandation IA */}
            <div style={{
              background: classification.bouton_recommande === 'simple' 
                ? 'rgba(59, 130, 246, 0.1)' 
                : 'rgba(249, 115, 22, 0.1)',
              border: `1px solid ${classification.bouton_recommande === 'simple' 
                ? 'rgba(59, 130, 246, 0.3)' 
                : 'rgba(249, 115, 22, 0.3)'}`,
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {classification.bouton_recommande === 'simple' ? '🔨' : '🏗️'}
                </span>
                <span style={{ 
                  color: 'white', 
                  fontWeight: '600',
                  fontSize: '0.95rem'
                }}>
                  Recommandation : {classification.bouton_recommande === 'simple' 
                    ? 'Travaux simples' 
                    : 'Chantier'}
                </span>
                <span style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  {classification.result.confiance}%
                </span>
              </div>
              
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '0.85rem',
                margin: 0,
                lineHeight: 1.4
              }}>
                {classification.result.message_utilisateur}
              </p>

              {/* Raisons */}
              {classification.result.raisons.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  {classification.result.raisons.slice(0, 3).map((raison, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.6)',
                      marginTop: '0.25rem'
                    }}>
                      <span style={{ color: '#10b981' }}>✓</span>
                      <span>{raison}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Risques */}
              {classification.result.risques_sensibles.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  {classification.result.risques_sensibles.map((risque, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: 'rgba(239, 68, 68, 0.8)',
                      marginTop: '0.25rem'
                    }}>
                      <span>⚠️</span>
                      <span>{risque}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Durée estimée */}
              {classification.result.duree_estimee && (
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  <span>⏱️</span>
                  <span>Durée estimée : {classification.result.duree_estimee}</span>
                </div>
              )}
            </div>

            {/* Boutons selon mode_affichage */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* Bouton Travail simple */}
              {(classification.mode_affichage === 'simple_only' || classification.mode_affichage === 'choix') && (
                <button
                  onClick={() => handleCreate('simple')}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '12px',
                    border: classification.bouton_recommande === 'simple' 
                      ? 'none' 
                      : '1px solid rgba(59, 130, 246, 0.5)',
                    background: classification.bouton_recommande === 'simple' 
                      ? '#3b82f6' 
                      : 'rgba(59, 130, 246, 0.1)',
                    color: classification.bouton_recommande === 'simple' 
                      ? 'white' 
                      : '#3b82f6',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3b82f6';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    if (classification.bouton_recommande === 'simple') {
                      e.currentTarget.style.background = '#3b82f6';
                      e.currentTarget.style.color = 'white';
                    } else {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.color = '#3b82f6';
                    }
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span>🔨</span>
                  <span>Créer en mode Travaux simples</span>
                  {classification.bouton_recommande === 'simple' && classification.mode_affichage === 'choix' && (
                    <span style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                    }}>
                      ✓ Recommandé
                    </span>
                  )}
                </button>
              )}

              {/* Bouton Chantier */}
              {(classification.mode_affichage === 'complexe_only' || classification.mode_affichage === 'choix') && (
                <button
                  onClick={() => handleCreate('complexe')}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '12px',
                    border: classification.bouton_recommande === 'complexe' 
                      ? 'none' 
                      : '1px solid rgba(249, 115, 22, 0.5)',
                    background: classification.bouton_recommande === 'complexe' 
                      ? '#f97316' 
                      : 'rgba(249, 115, 22, 0.1)',
                    color: classification.bouton_recommande === 'complexe' 
                      ? 'white' 
                      : '#f97316',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f97316';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    if (classification.bouton_recommande === 'complexe') {
                      e.currentTarget.style.background = '#f97316';
                      e.currentTarget.style.color = 'white';
                    } else {
                      e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                      e.currentTarget.style.color = '#f97316';
                    }
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span>🏗️</span>
                  <span>Créer en mode chantier</span>
                  {classification.bouton_recommande === 'complexe' && classification.mode_affichage === 'choix' && (
                    <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '8px',
                      fontSize: '0.7rem'
                    }}>
                      Recommandé
                    </span>
                  )}
                </button>
              )}

              {/* Bouton Annuler */}
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
                L'IA analysera le <strong>titre de la vidéo</strong> pour te recommander le meilleur mode de création.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleContinueAnyway}
                style={{
                  padding: '0.875rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--green)',
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
                <span>🤖</span>
                <span>Continuer avec l'IA</span>
              </button>

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

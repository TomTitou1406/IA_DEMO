'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { getEtapesByTravail, annulerEtape, reactiverEtape, demarrerEtape, terminerEtape } from '@/app/lib/services/etapesService';
import CardButton from '@/app/components/CardButton';
import { terminerToutesLesTaches } from '@/app/lib/services/tachesService';
import { useRouter } from 'next/navigation';
import NotesButton from '@/app/components/NotesButton';
import Breadcrumb from '@/app/components/Breadcrumb';
import ParentContext from '@/app/components/ParentContext';
import { getChantierMinimal } from '@/app/lib/services/parentContextService';
import MediaButtons from '@/app/components/MediaButtons';
import PhotosModal from '@/app/components/PhotosModal';
import VideoPlayerModal from '@/app/components/VideoPlayerModal';

interface Etape {
  id: string;
  numero: number;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  duree_estimee_minutes: number;
  duree_reelle_minutes?: number;
  difficulte: string;
  outils_necessaires: string[];
  materiaux_necessaires?: any[];
  conseils_pro?: string;
  blocage_raison?: string;
  nombre_taches?: number;        
  taches_terminees?: number;
  taches_brouillon?: number;
  photos_urls?: any[];
  video_aide?: {
    video_id: string;
    titre: string;
    url: string;
    thumbnail?: string;
  } | null;
}

interface Travail {
  id: string;
  titre: string;
  description: string;
  statut: string;
  progression: number;
  duree_estimee_heures?: number;     
  duree_reelle_heures?: number;
  budget_estime?: number;
  budget_reel?: number;
  expertise?: {
    nom: string;
    code: string;
  };
  photos_urls?: any[];
  video_aide?: {
    video_id: string;
    titre: string;
    url: string;
    thumbnail?: string;
  } | null;
}

export default function TravailDetailPage() {
  const params = useParams();
  const chantierId = params.chantierId as string;
  const travailId = params.travailId as string;
  const [travail, setTravail] = useState<Travail | null>(null);
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showEnCours, setShowEnCours] = useState(true);
  const [showBloques, setShowBloques] = useState(true);
  const [showAnnulees, setShowAnnulees] = useState(false);
  const [showTerminees, setShowTerminees] = useState(false);
  const [showAVenir, setShowAVenir] = useState(true);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // NOUVEAU : État pour le chantier parent
  const [chantierParent, setChantierParent] = useState<{ titre: string } | null>(null);

  // Modales photos et vidéos
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [photosModalConfig, setPhotosModalConfig] = useState<{
    niveau: 'chantier' | 'travail' | 'etape' | 'tache';
    niveauId: string;
    niveauTitre: string;
    photos: any[];
  }>({ niveau: 'travail', niveauId: '', niveauTitre: '', photos: [] });
  
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoModalConfig, setVideoModalConfig] = useState<{
    niveau: 'chantier' | 'travail' | 'etape' | 'tache';
    niveauId: string;
    video: any;
  }>({ niveau: 'travail', niveauId: '', video: null });

  const handlePhotosChange = (niveau: string, niveauId: string, newPhotos: any[]) => {
    if (niveau === 'travail') {
      setTravail(prev => prev ? { ...prev, photos_urls: newPhotos } : null);
    } else if (niveau === 'etape') {
      setEtapes(prev => prev.map(e => 
        e.id === niveauId ? { ...e, photos_urls: newPhotos } : e
      ));
    }
  };
  
  const handleDetachVideo = async (niveau: string, niveauId: string) => {
    try {
      await fetch('/api/medias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_video',
          niveau,
          niveau_id: niveauId
        })
      });
      
      if (niveau === 'travail') {
        setTravail(prev => prev ? { ...prev, video_aide: null } : null);
      } else if (niveau === 'etape') {
        setEtapes(prev => prev.map(e => 
          e.id === niveauId ? { ...e, video_aide: null } : e
        ));
      }
      setShowVideoModal(false);
    } catch (error) {
      console.error('Erreur détachement vidéo:', error);
    }
  };

  // Détecter mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        // Charger en parallèle les étapes ET le chantier parent
        const [data, chantierData] = await Promise.all([
          getEtapesByTravail(travailId),
          getChantierMinimal(chantierId)
        ]);
        
        if (data) {
          setTravail(data.travail);
          setEtapes(data.etapes);
        }
        if (chantierData) {
          setChantierParent(chantierData);
        }
      } catch (error) {
        console.error('Error loading travail detail:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [travailId, chantierId]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Chargement...</p>
      </div>
    );
  }

  if (!travail) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>❌ Lot introuvable</h2>
        <Link href={`/chantiers/${chantierId}/travaux`} className="main-btn btn-blue" style={{ marginTop: '2rem' }}>
          ← Retour aux lots
        </Link>
      </div>
    );
  }

  // Grouper par statut
  const terminees = etapes.filter(e => e.statut === 'terminé');
  const enCours = etapes.filter(e => e.statut === 'en_cours');
  const bloquees = etapes.filter(e => e.statut === 'bloqué');
  const annulees = etapes.filter(e => e.statut === 'annulé');
  const aVenir = etapes.filter(e => e.statut === 'à_venir' || !e.statut);

  // Ajout pour éviter le reload des tâches
  const router = useRouter();

  // Calculer les stats
  const totalEtapes = etapes.length;
  const progressionAuto = totalEtapes > 0 
    ? Math.round((terminees.length / totalEtapes) * 100)
    : 0;
  const dureeReelleMinutes = etapes.reduce((sum, e) => sum + (e.duree_reelle_minutes || 0), 0);
  const dureeEstimeeMinutes = etapes.reduce((sum, e) => sum + (e.duree_estimee_minutes || 0), 0);
  const progressionHeures = dureeEstimeeMinutes > 0
    ? Math.round((dureeReelleMinutes / dureeEstimeeMinutes) * 100)
    : 0;

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'terminé': return 'var(--green)';
      case 'en_cours': return 'var(--blue)';
      case 'bloqué': return 'var(--orange)';
      case 'annulé': return 'var(--red)';
      case 'à_venir': return 'var(--purple)';
      default: return 'var(--gray)';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'terminé': return '✓';
      case 'en_cours': return '🔨';
      case 'bloqué': return '🚫';
      case 'annulé': return '🗑️';
      case 'à_venir': return '📅';
      default: return '✅';
    }
  };

  const getDifficultyColor = (difficulte: string) => {
    switch (difficulte) {
      case 'facile': return 'var(--green)';
      case 'moyen': return 'var(--yellow)';
      case 'difficile': return 'var(--red)';
      default: return 'var(--gray)';
    }
  };

  const getDifficultyIcon = (difficulte: string) => {
    switch (difficulte) {
      case 'facile': return '●○○';     // 1/3
      case 'moyen': return '●●○';      // 2/3
      case 'difficile': return '●●●';  // 3/3
      default: return '○○○';
    }
  };

  const EtapeCard = ({ etape }: { etape: Etape }) => {
    const statusColor = getStatusColor(etape.statut);
    const progressionAuto = etape.nombre_taches && etape.nombre_taches > 0
      ? Math.round(((etape.taches_terminees || 0) / etape.nombre_taches) * 100)
      : 0;
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div style={{
        background: `linear-gradient(90deg, #0d0d0d 0%, color-mix(in srgb, ${statusColor} 50%, #1a1a1a) 100%)`,
        borderRadius: '12px',
        padding: isMobile ? '0.75rem' : '1rem',
        marginBottom: '0.75rem',
        borderLeft: `4px solid ${statusColor}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        const rgba = statusColor === 'var(--blue)' ? 'rgba(37, 99, 235, 0.25)' :
                     statusColor === 'var(--orange)' ? 'rgba(255, 107, 53, 0.25)' :
                     statusColor === 'var(--green)' ? 'rgba(16, 185, 129, 0.25)' :
                     statusColor === 'var(--purple)' ? 'rgba(168, 85, 247, 0.25)' :
                     statusColor === 'var(--red)' ? 'rgba(239, 68, 68, 0.25)' :
                     'rgba(107, 114, 128, 0.25)';
        e.currentTarget.style.boxShadow = `0 4px 16px ${rgba}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      }}>
       {/* Header cliquable */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'stretch' : 'flex-start',
            marginBottom: isExpanded ? '1rem' : '0.5rem',
            gap: isMobile ? '0.75rem' : '1rem',
            cursor: 'pointer'
          }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{
                background: statusColor,
                color: 'white',
                minWidth: isMobile ? '26px' : '32px',
                height: isMobile ? '26px' : '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: isMobile ? '0.8rem' : '0.9rem'
              }}>
                {etape.numero}
              </span>
              <h3 style={{ 
                fontSize: isMobile ? '0.9rem' : '1.05rem', 
                margin: 0,
                color: 'var(--gray-light)',
                fontWeight: '700',
                lineHeight: '1.2',
                flex: 1
              }}>
                {getStatusIcon(etape.statut)} {etape.titre}
              </h3>
              <span style={{ 
                fontSize: isMobile ? '1rem' : '1.2rem',
                color: 'var(--gray)',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </div>
              
            {etape.blocage_raison && (
              <p style={{ 
                fontSize: '0.85rem', 
                color: 'var(--orange)', 
                margin: 0,
                marginTop: '0.5rem',
                marginLeft: '40px',
                fontStyle: 'italic',
                padding: '0.5rem',
                background: 'rgba(255, 107, 53, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 107, 53, 0.2)'
              }}>
                💬 {etape.blocage_raison}
              </p>
            )}
          </div>
  
         {/* Boutons selon statut - sur mobile, uniquement si expanded */}
          {etape.statut !== 'terminé' && (!isMobile || isExpanded) && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '0.5rem', 
              flexShrink: 0,
              alignItems: 'flex-start',
              justifyContent: isMobile ? 'flex-start' : 'flex-end'
            }}>
            {/* Boutons à_venir */}
            {etape.statut === 'à_venir' && (
              <>
                <CardButton
                  variant="primary"
                  color="var(--purple)"
                  icon="🚀"
                  label="Démarrer"
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Démarrer cette étape ?',
                      message: `"${etape.titre}" passera en cours.`,
                      onConfirm: async () => {
                        await demarrerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
               {/* Bouton Tâches - 3 cas : brouillon, validées, aucune */}
                {etape.taches_brouillon && etape.taches_brouillon > 0 ? (
                  // Cas 1 : Tâches en brouillon → Finaliser
                  <CardButton
                    variant="secondary"
                    color="var(--orange)"
                    icon="✏️"
                    label="Finaliser tâches"
                    count={etape.taches_brouillon}
                    onClick={() => {
                      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/mise-en-oeuvre`);
                    }}
                  />
                ) : etape.nombre_taches && etape.nombre_taches > 0 ? (
                  // Cas 2 : Tâches validées → Voir
                  <CardButton
                    variant="secondary"
                    color="var(--purple)"
                    icon="📋"
                    label="Voir tâches"
                    count={etape.nombre_taches}
                    onClick={() => {
                      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/taches`);
                    }}
                  />
                ) : (
                  // Cas 3 : Aucune tâche → Générer
                  <CardButton
                    variant="secondary"
                    color="var(--purple)"
                    icon="✨"
                    label="Générer tâches"
                    onClick={() => {
                      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/mise-en-oeuvre`);
                    }}
                  />
                )}
                <CardButton
                  variant="danger"
                  icon="🗑️"
                  label={isMobile ? "" : "Annuler"}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Annuler cette étape ?',
                      message: `"${etape.titre}" sera marquée comme annulée.`,
                      onConfirm: async () => {
                        await annulerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              </>
            )}
  
            {/* Boutons en_cours */}
            {etape.statut === 'en_cours' && (
              <>
                {/* Bouton TÂCHES - 3 cas : brouillon, validées, aucune */}
                {etape.taches_brouillon && etape.taches_brouillon > 0 ? (
                  // Cas 1 : Tâches en brouillon → Finaliser
                  <CardButton
                    variant="primary"
                    color="var(--orange)"
                    icon="✏️"
                    label="Finaliser tâches"
                    count={etape.taches_brouillon}
                    onClick={() => {
                      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/mise-en-oeuvre`);
                    }}
                  />
                ) : etape.nombre_taches && etape.nombre_taches > 0 ? (
                  // Cas 2 : Tâches validées → Voir
                  <CardButton
                    variant="primary"
                    color="var(--blue)"
                    icon="📋"
                    label="Voir tâches"
                    count={etape.nombre_taches}
                    onClick={() => {
                      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/taches`);
                    }}
                  />
                ) : (
                  // Cas 3 : Aucune tâche → Générer
                  <CardButton
                    variant="primary"
                    color="var(--blue)"
                    icon="✨"
                    label="Générer tâches"
                    onClick={() => {
                      router.push(`/chantiers/${chantierId}/travaux/${travailId}/etapes/${etape.id}/mise-en-oeuvre`);
                    }}
                  />
                )}
                
                {/* Bouton TOUT TERMINER - NOUVEAU */}
                <CardButton
                  variant="secondary"
                  color="var(--green)"
                  icon="✓✓"
                  label={isMobile ? "Terminer" : "Tout terminer"}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Tout terminer ?',
                      message: `Toutes les tâches de "${etape.titre}" seront marquées comme terminées, ainsi que l'étape elle-même.`,
                      onConfirm: async () => {
                        // 1. Terminer toutes les tâches
                        if (etape.nombre_taches && etape.nombre_taches > 0) {
                          await terminerToutesLesTaches(etape.id);
                        }
                        // 2. Terminer l'étape
                        await terminerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
                
                {/* Bouton ANNULER */}
                <CardButton
                  variant="danger"
                  icon="🗑️"
                  label={isMobile ? "" : "Annuler"}
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'Annuler cette étape ?',
                      message: `"${etape.titre}" sera marquée comme annulée.`,
                      onConfirm: async () => {
                        await annulerEtape(etape.id);
                        setModalConfig({ ...modalConfig, isOpen: false });
                        window.location.reload();
                      }
                    });
                  }}
                />
              </>
            )}
  
            {/* Bouton Débloquer (bloqué) */}
            {etape.statut === 'bloqué' && (
              <CardButton
                variant="primary"
                color="var(--orange)"
                icon="🔓"
                label="Débloquer"
                onClick={() => {
                  // TODO: Implémenter debloquerEtape()
                  console.log('Débloquer étape:', etape.id);
                }}
              />
            )}
  
            {/* Bouton Réactiver (annulé) */}
            {etape.statut === 'annulé' && (
              <CardButton
                variant="primary"
                color="var(--red)"
                icon="↻"
                label="Réactiver"
                onClick={() => {
                  setModalConfig({
                    isOpen: true,
                    title: 'Réactiver cette étape ?',
                    message: `"${etape.titre}" repassera à l'état "à venir".`,
                    onConfirm: async () => {
                      await reactiverEtape(etape.id);
                      setModalConfig({ ...modalConfig, isOpen: false });
                      window.location.reload();
                    }
                  });
                }}
              />
            )}
          </div>
          )}
        </div>
  
        {/* Barre de progression + Stats en ligne */}
        {(!isMobile || isExpanded) && etape.statut === 'en_cours' && etape.nombre_taches && etape.nombre_taches > 0 && (
          <>
            {/* Barre de progression */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressionAuto}%`,
                  height: '100%',
                  background: 'var(--blue)',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
            </div>
        
            {/* Stats en ligne - FORMAT ALIGNÉ PAGE TRAVAUX */}
            <div style={{ 
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--gray)',
              marginBottom: '0.5rem'
            }}>
              {/* % complété */}
              <span style={{ 
                color: 'var(--gray-light)', 
                fontWeight: '700'
              }}>
                {progressionAuto}% complété
              </span>
        
              {/* Durée estimée */}
              <span>⏱️ {etape.duree_estimee_minutes} min</span>
        
              {/* Tâches avec détail */}
              <span>
                ✅ {etape.taches_terminees || 0}/{etape.nombre_taches}
                {(etape.taches_terminees || 0) > 0 && (
                  <span style={{ color: 'var(--green)', marginLeft: '0.5rem', fontWeight: '600' }}>
                    • {etape.taches_terminees} terminée{(etape.taches_terminees || 0) > 1 ? 's' : ''}
                  </span>
                )}
              </span>
        
              {/* Outils */}
              {etape.outils_necessaires?.length > 0 && (
                <span>🔧 {etape.outils_necessaires.length} outil{etape.outils_necessaires.length > 1 ? 's' : ''}</span>
              )}
        
              {/* Badge difficulté */}
              <span style={{
                background: `${getDifficultyColor(etape.difficulte)}20`,
                color: getDifficultyColor(etape.difficulte),
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                lineHeight: '1'
              }}>
                {getDifficultyIcon(etape.difficulte)} {etape.difficulte}
              </span>
            </div>
          </>
        )}
          
        {/* Contenu détaillé - expandable */}
        {isExpanded && (
          <div style={{
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginLeft: '40px'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                marginBottom: '0.5rem', 
                color: 'var(--gray-light)'
              }}>
                📝 Description
              </h4>
              <p style={{ 
                color: 'var(--gray)', 
                lineHeight: '1.6', 
                margin: 0,
                fontSize: '0.9rem'
              }}>
                {etape.description}
              </p>
            </div>
  
            {etape.outils_necessaires?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem', 
                  color: 'var(--gray-light)'
                }}>
                  🔧 Outils nécessaires
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {etape.outils_necessaires.map((outil, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: `color-mix(in srgb, ${statusColor} 20%, transparent)`,
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: 'var(--gray-light)',
                        border: `1px solid color-mix(in srgb, ${statusColor} 50%, transparent)`
                      }}
                    >
                      {outil}
                    </span>
                  ))}
                </div>
              </div>
            )}
  
            {etape.conseils_pro && (
              <div style={{
                background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                border: `1px solid ${statusColor}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem'
              }}>
                <h4 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem', 
                  color: statusColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  💡 Conseil pro
                </h4>
                <p style={{ 
                  color: 'var(--gray-light)', 
                  fontSize: '0.9rem', 
                  margin: 0, 
                  lineHeight: '1.5' 
                }}>
                  {etape.conseils_pro}
                </p>
              </div>
            )}
          </div>
        )}
        {/* Boutons Photos & Vidéos */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <MediaButtons
              niveau="etape"
              niveauId={etape.id}
              niveauTitre={etape.titre}
              photosCount={etape.photos_urls?.length || 0}
              hasVideo={!!etape.video_aide?.video_id}
              videoTitre={etape.video_aide?.titre}
              compact
              onPhotoClick={() => {
                setPhotosModalConfig({
                  niveau: 'etape',
                  niveauId: etape.id,
                  niveauTitre: etape.titre,
                  photos: etape.photos_urls || []
                });
                setShowPhotosModal(true);
              }}
              onVideoClick={() => {
                if (etape.video_aide?.video_id) {
                  setVideoModalConfig({
                    niveau: 'etape',
                    niveauId: etape.id,
                    video: {
                      id: etape.video_aide.video_id,
                      title: etape.video_aide.titre,
                      thumbnail: etape.video_aide.thumbnail,
                      channelTitle: '',
                      viewCount: 0,
                      duration: ''
                    }
                  });
                  setShowVideoModal(true);
                } else {
                  sessionStorage.setItem('attachReturnUrl', window.location.href);
                  const searchQuery = encodeURIComponent(etape.titre);
                  window.location.href = `/videos?context=etape&id=${etape.id}&search=${searchQuery}`;
                }
              }}
            />
          </div>
      </div>
    );
  };

  const SectionHeader = ({ 
    title, 
    count, 
    color, 
    icon, 
    isExpanded, 
    onToggle 
  }: { 
    title: string; 
    count: number; 
    color: string; 
    icon: string;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div 
        onClick={onToggle}
        style={{ 
          fontSize: '1.15rem', 
          marginBottom: '0.75rem',
          color: color,
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          padding: '0.5rem 0',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>
          {isExpanded ? '▽' : '▶'}
        </span>
        <span>{icon} {title}</span>
        <span style={{ 
          background: `${color}88`,
          color: color,
          border: `2px solid ${color}`,
          minWidth: '28px',
          height: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontSize: '0.9rem',
          fontWeight: '700',
          padding: '0 0.35rem'
        }}>
          {count}
        </span>
      </div>
      <div style={{
        height: '2px',
        background: `linear-gradient(90deg, transparent 0%, ${color} 80%)`,
        marginBottom: '0.75rem'
      }}></div>
    </div>
  );

  return (
    <>
      {/* ========== NOUVEAU BREADCRUMB ========== */}
      <Breadcrumb 
        currentLevel="etapes" 
        chantierId={chantierId}
        travailId={travailId}
      />

      {/* CONTENU PRINCIPAL */}
      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        padding: '0.75rem 1rem',
        paddingTop: isMobile ? '55px' : '70px'
      }}>
        {/* ========== NOUVEAU PARENT CONTEXT ========== */}
        {!isMobile && (
          <ParentContext 
            chantier={chantierParent || undefined}
          />
        )}

       {/* ÉTAT DES LIEUX DU LOT */}
        <div style={{
          marginBottom: isMobile ? '0.5rem' : '1.5rem',
          paddingBottom: isMobile ? '0.5rem' : '1.0rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Header avec titre + bouton notes */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '0.5rem',
            gap: '1rem'
          }}>
            <h1 style={{ 
              fontSize: isMobile ? '1.3rem' : '1.8rem',
              margin: 0,
              color: 'var(--gray-light)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🔨 Lot : {travail.titre}
            </h1>
            
            {/* Bouton Notes du lot */}
            <NotesButton level="travail" id={travailId} />
          </div>
          {!isMobile && travail.description && (
            <p style={{ 
              fontSize: '0.95rem', 
              color: 'var(--gray)', 
              marginBottom: '1rem',
              lineHeight: '1.4'
            }}>
              {travail.description}
            </p>
          )}

          {/* Barre progression 16px */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              width: '100%',
              height: '16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressionAuto}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          </div>
        
          {/* Stats inline */}
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: isMobile ? '0.75rem' : '2rem',
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            color: 'var(--gray)'
          }}>
            <span style={{ 
              color: 'var(--gray-light)', 
              fontSize: isMobile ? '0.95rem' : '1.1rem', 
              fontWeight: '700' 
            }}>
              {progressionAuto}%
            </span>
            
            {/* Durée - version compacte sur mobile */}
            <span>
              ⏱️ {Math.round(dureeReelleMinutes / 60)}h{!isMobile && <span style={{ opacity: 0.6 }}> / {Math.round(dureeEstimeeMinutes / 60)}h</span>}
            </span>
            
            {/* Budget - masqué sur mobile */}
            {!isMobile && travail.budget_estime && (
              <span>
                💰 {(travail.budget_reel || 0).toLocaleString()}€
                <span style={{ opacity: 0.6 }}> / {travail.budget_estime.toLocaleString()}€</span>
              </span>
            )}
            
            {/* Étapes - version compacte sur mobile */}
            <span>
              ✅ {terminees.length}/{totalEtapes}
              {isMobile ? (
                <>
                  <span style={{ color: 'var(--blue)', marginLeft: '0.5rem' }}>• {enCours.length} en cours</span>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--green)', marginLeft: '0.6rem', fontWeight: '700' }}>
                    • {terminees.length} terminée{terminees.length > 1 ? 's' : ''}
                  </span>
                  <span style={{ color: 'var(--blue)', marginLeft: '0.6rem', fontWeight: '700' }}>
                    • {enCours.length} en cours
                  </span>
                  <span style={{ color: 'var(--orange)', marginLeft: '0.6rem', fontWeight: '700' }}>
                    • {bloquees.length} bloquée{bloquees.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </span>
            
            {/* Photos et Vidéos du lot */}
            <MediaButtons
              niveau="travail"
              niveauId={travailId}
              niveauTitre={travail.titre}
              photosCount={travail.photos_urls?.length || 0}
              hasVideo={!!travail.video_aide?.video_id}
              videoTitre={travail.video_aide?.titre}
              onPhotoClick={() => {
                setPhotosModalConfig({
                  niveau: 'travail',
                  niveauId: travailId,
                  niveauTitre: travail.titre,
                  photos: travail.photos_urls || []
                });
                setShowPhotosModal(true);
              }}
              onVideoClick={() => {
                if (travail.video_aide?.video_id) {
                  setVideoModalConfig({
                    niveau: 'travail',
                    niveauId: travailId,
                    video: {
                      id: travail.video_aide.video_id,
                      title: travail.video_aide.titre,
                      thumbnail: travail.video_aide.thumbnail,
                      channelTitle: '',
                      viewCount: 0,
                      duration: ''
                    }
                  });
                  setShowVideoModal(true);
                } else {
                  sessionStorage.setItem('attachReturnUrl', window.location.href);
                  const searchQuery = encodeURIComponent(travail.titre);
                  window.location.href = `/videos?context=travail&id=${travailId}&search=${searchQuery}`;
                }
              }}
            />
          </div>
        </div>

        {/* Section EN COURS */}
        {enCours.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="En cours" 
              count={enCours.length} 
              color="var(--blue)" 
              icon="🔨"
              isExpanded={showEnCours}
              onToggle={() => setShowEnCours(!showEnCours)}
            />
            {showEnCours && enCours.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section BLOQUÉES */}
        {bloquees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Bloquées" 
              count={bloquees.length} 
              color="var(--orange)" 
              icon="⚠️"
              isExpanded={showBloques}
              onToggle={() => setShowBloques(!showBloques)}
            />
            {showBloques && bloquees.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section À VENIR */}
        {aVenir.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="À venir" 
              count={aVenir.length} 
              color="var(--purple)" 
              icon="📅"
              isExpanded={showAVenir}
              onToggle={() => setShowAVenir(!showAVenir)}
            />
            {showAVenir && aVenir.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section TERMINÉES */}
        {terminees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Terminées" 
              count={terminees.length} 
              color="var(--green)" 
              icon="✅"
              isExpanded={showTerminees}
              onToggle={() => setShowTerminees(!showTerminees)}
            />
            {showTerminees && terminees.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Section ANNULÉES */}
        {annulees.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader 
              title="Annulées" 
              count={annulees.length} 
              color="var(--red)" 
              icon="🗑️"
              isExpanded={showAnnulees}
              onToggle={() => setShowAnnulees(!showAnnulees)}
            />
            {showAnnulees && annulees.map(etape => <EtapeCard key={etape.id} etape={etape} />)}
          </section>
        )}

        {/* Modal de confirmation */}
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText="Confirmer"
          cancelText="Annuler"
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
          type="warning"
        />

        {/* Modal Photos */}
        <PhotosModal
          isOpen={showPhotosModal}
          onClose={() => setShowPhotosModal(false)}
          niveau={photosModalConfig.niveau}
          niveauId={photosModalConfig.niveauId}
          niveauTitre={photosModalConfig.niveauTitre}
          photos={photosModalConfig.photos}
          onPhotosChange={(newPhotos) => {
            handlePhotosChange(photosModalConfig.niveau, photosModalConfig.niveauId, newPhotos);
            setPhotosModalConfig(prev => ({ ...prev, photos: newPhotos }));
          }}
        />
  
        {/* Modal Vidéo */}
        <VideoPlayerModal
          video={videoModalConfig.video}
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          showFavoriteButton={false}
          showMettreEnOeuvreButton={false}
          onAttach={undefined}
          attachLabel={undefined}
        />
      </div>
    </>
  );
}

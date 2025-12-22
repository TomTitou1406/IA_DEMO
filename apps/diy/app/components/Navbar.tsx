/**
 * /app/components/Navbar.tsx
 * Navigation principale avec design moderne et animations
 * 
 * @version 1.3
 * 
 * Changelog :
 * - v1.3 : Bouton "Besoin d'aide ?" rouge, modale refaite (Papi + ✨, tel 07..., WhatsApp grisé)
 * - v1.2 : Hauteur réduite, max-width, liseré, bouton "Appelez-nous" revu
 * - v1.1 : Header transparent, effet halo survol, spacer réduit
 * - v1.0 : Version initiale
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import GamificationBadge from './GamificationBadge';

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [projectsCount, setProjectsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bonsCount, setBonsCount] = useState(0);

  useEffect(() => {
    loadCounts();
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    loadCounts();
  }, [pathname]);

  const loadCounts = async () => {
    try {
      const projectsRes = await fetch('/api/chantiers?count_only=true');
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjectsCount(data.count || 0);
      }
    } catch (e) {
      console.log('Compteur projets non disponible');
    }
  };
  
  const loadFavoritesCount = async () => {
    try {
      const favRes = await fetch('/api/videos/favorites');
      if (favRes.ok) {
        const data = await favRes.json();
        setFavoritesCount(data.count || 0);
      }
    } catch (e) {
      console.log('Compteur favoris non disponible');
    }
  };
  
  useEffect(() => {
    loadCounts();
    loadFavoritesCount();
    
    const handleUpdate = () => loadFavoritesCount();
    window.addEventListener('favoritesUpdated', handleUpdate);
    
    return () => window.removeEventListener('favoritesUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('gamification');
    if (saved) {
      const data = JSON.parse(saved);
      setBonsCount(data.bons?.length || 0);
    }
  }, []);

  useEffect(() => {
    // Charger initial
    const saved = localStorage.getItem('gamification');
    if (saved) {
      const data = JSON.parse(saved);
      setBonsCount(data.bons?.length || 0);
    }
    
    // Écouter les mises à jour
    const handleBonsUpdate = (e: CustomEvent) => {
      setBonsCount(e.detail.count);
    };
    
    window.addEventListener('bonsUpdated', handleBonsUpdate as EventListener);
    return () => window.removeEventListener('bonsUpdated', handleBonsUpdate as EventListener);
  }, []);
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Accueil', path: '/', color: '#f97316' },
    { id: 'projects', icon: '📁', label: 'Mes projets', path: '/chantiers', count: projectsCount, color: '#f97316' },
    { id: 'videos', icon: '❤️', label: 'Mes vidéos', path: '/videos/favorites', count: favoritesCount, color: '#ef4444' },
  ];

  const openAssistantHelp = () => {
    setShowHelpModal(false);
    window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
      detail: { 
        pageContext: 'aide_decouverte',
        welcomeMessage: `Salut ! 👋 Comment puis-je t'aider aujourd'hui ?`
      } 
    }));
  };

  const Badge = ({ count, color }: { count: number; color: string }) => {
    if (count === 0) return null;
    return (
      <span style={{
        position: 'absolute',
        top: '-5px',
        right: '-8px',
        background: color,
        color: 'white',
        fontSize: '0.6rem',
        fontWeight: '700',
        padding: '1px 5px',
        borderRadius: '8px',
        minWidth: '16px',
        textAlign: 'center',
        boxShadow: `0 2px 8px ${color}50`,
        animation: 'badgePop 0.3s ease-out'
      }}>
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const NavItemDesktop = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.path);
    return (
      <button
        onClick={() => router.push(item.path)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.45rem 0.85rem',
          borderRadius: '10px',
          border: 'none',
          background: active ? `${item.color}25` : 'transparent',
          color: active ? item.color : 'rgba(255,255,255,0.7)',
          fontSize: '0.85rem',
          fontWeight: active ? '600' : '500',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease',
          boxShadow: active ? `0 0 15px ${item.color}30` : 'none',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <span style={{ fontSize: '1rem' }}>{item.icon}</span>
        <span>{item.label}</span>
        {item.count !== undefined && <Badge count={item.count} color={item.color} />}
      </button>
    );
  };

  const NavItemMobile = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.path);
    return (
      <button
        onClick={() => router.push(item.path)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.2rem',
          padding: '0.4rem',
          border: 'none',
          background: 'transparent',
          color: active ? item.color : 'rgba(255,255,255,0.5)',
          fontSize: '0.6rem',
          fontWeight: active ? '600' : '500',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          flex: 1,
        }}
      >
        <span style={{ 
          fontSize: '1.3rem',
          transform: active ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.2s ease',
          filter: active ? `drop-shadow(0 0 8px ${item.color})` : 'none'
        }}>
          {item.icon}
        </span>
        <span>{item.label.split(' ')[0]}</span>
        {item.count !== undefined && item.count > 0 && (
          <span style={{
            position: 'absolute',
            top: '0px',
            right: 'calc(50% - 18px)',
            background: item.color,
            color: 'white',
            fontSize: '0.5rem',
            fontWeight: '700',
            padding: '1px 3px',
            borderRadius: '6px',
            minWidth: '12px',
            textAlign: 'center',
          }}>
            {item.count > 99 ? '99+' : item.count}
          </span>
        )}
        {active && (
          <span style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '18px',
            height: '2px',
            background: item.color,
            borderRadius: '2px 2px 0 0',
            boxShadow: `0 0 8px ${item.color}`,
          }} />
        )}
      </button>
    );
  };

  const HelpButton = ({ mobile = false }: { mobile?: boolean }) => {
    return (
      <button
        onClick={() => setShowHelpModal(true)}
        style={{
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          alignItems: 'center',
          gap: mobile ? '0.2rem' : '0.4rem',
          padding: mobile ? '0.4rem' : '0.45rem 1rem',
          borderRadius: mobile ? '0' : '20px',
          border: mobile ? 'none' : '1.5px solid rgba(239, 68, 68, 0.5)',
          background: mobile ? 'transparent' : 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          fontSize: mobile ? '0.6rem' : '0.85rem',
          fontWeight: '600',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease',
          flex: mobile ? 1 : 'none',
        }}
        onMouseEnter={(e) => {
          if (!mobile) {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = '#ef4444';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!mobile) {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        <span style={{ fontSize: mobile ? '1.3rem' : '1rem' }}>📞</span>
        <span>{mobile ? 'Aide' : "Besoin d'aide ?"}</span>
      </button>
    );
  };

  const CartButton = ({ mobile = false }: { mobile?: boolean }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
      <div 
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          style={{
            display: 'flex',
            flexDirection: mobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: mobile ? '0.2rem' : '0.4rem',
            padding: mobile ? '0.4rem' : '0.5rem 0.75rem',
            borderRadius: mobile ? '0' : '10px',
            border: 'none',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            fontSize: mobile ? '0.6rem' : '0.85rem',
            fontWeight: '500',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease',
            flex: mobile ? 1 : 'unset',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
            e.currentTarget.style.color = '#10b981';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={{ 
            fontSize: mobile ? '1.3rem' : '1.1rem',
            transition: 'transform 0.2s ease'
          }}>
            🛒
          </span>
          {!mobile && <span>Panier</span>}
          {mobile && <span>Panier</span>}
        </button>

        {/* Tooltip Panier */}
        {showTooltip && !mobile && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '12px',
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98), rgba(30, 30, 30, 0.98))',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            minWidth: '240px',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(16, 185, 129, 0.3)',
          }}>
            {/* Flèche */}
            <div style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid #10b981',
            }} />

            {/* Contenu */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '2rem' }}>🛠️</span>
              <div>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#10b981',
                  fontSize: '0.9rem',
                  marginBottom: '0.25rem'
                }}>
                  Panier technique
                </div>
                <div style={{ 
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: '1.4'
                }}>
                  Votre panier technique sera bientôt disponible !
                </div>
              </div>
            </div>

            {/* Badge coming soon */}
            <div style={{
              marginTop: '0.5rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '600'
              }}>
                ✨ Bientôt disponible
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const AccountButton = ({ mobile = false }: { mobile?: boolean }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const active = isActive('/compte');
    
    return (
      <div 
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          style={{
            display: 'flex',
            flexDirection: mobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: mobile ? '0.2rem' : '0.4rem',
            padding: mobile ? '0.4rem' : '0.5rem 0.75rem',
            borderRadius: mobile ? '0' : '10px',
            border: 'none',
            background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: active ? '#3b82f6' : 'rgba(255,255,255,0.7)',
            fontSize: mobile ? '0.6rem' : '0.85rem',
            fontWeight: active ? '600' : '500',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease',
            flex: mobile ? 1 : 'unset',
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
              e.currentTarget.style.color = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <span style={{ 
            fontSize: mobile ? '1.3rem' : '1rem',
            transition: 'transform 0.2s ease'
          }}>
            👤
          </span>
          <span>{mobile ? 'Compte' : 'Mon compte'}</span>
        </button>

        {/* Pastille bons d'achat */}
        {bonsCount > 0 && (
          <span style={{
            position: 'absolute',
            top: mobile ? '0' : '-4px',
            right: mobile ? 'calc(50% - 20px)' : '-8px',
            background: '#10b981',
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: '700',
            padding: '1px 5px',
            borderRadius: '8px',
            minWidth: '16px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
          }}>
            {bonsCount}
          </span>
        )}

        {/* Tooltip Mon Compte */}
        {showTooltip && !mobile && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '12px',
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98), rgba(30, 30, 30, 0.98))',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '0.75rem',
            minWidth: '220px',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
          }}>
            {/* Flèche */}
            <div style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid #3b82f6',
            }} />

           {/* Options du menu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                cursor: 'not-allowed'
              }}>
                <span>⚙️</span>
                <span>Mes préférences</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                cursor: 'not-allowed'
              }}>
                <span>📊</span>
                <span>Mon expertise</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                cursor: 'not-allowed'
              }}>
                <span>🧰</span>
                <span>Mon matériel</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                cursor: 'not-allowed'
              }}>
                <span>🎁</span>
                <span>Mes bons d'achat</span>
              </div>
            </div>

            {/* Badge coming soon */}
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center'
            }}>
              <span style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#3b82f6',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '600'
              }}>
                ✨ Bientôt disponible
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const HelpModal = () => {
    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={() => setShowHelpModal(false)}
      >
        <div 
          style={{
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img 
              src="/images/papibricole-avatar.png" 
              alt="PapiBricole" 
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%',
                objectFit: 'cover',
                marginBottom: '0.5rem',
                animation: 'bounce 1s ease infinite',
                boxShadow: '0 8px 25px rgba(249, 115, 22, 0.3)',
                display: 'block',
                margin: '0 auto 0.5rem auto'
              }}
            />
            <h2 style={{ 
              color: 'white', 
              fontSize: '1.5rem', 
              fontWeight: '700',
              marginBottom: '0.5rem'
            }}>
              Comment puis-je t'aider ?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              Choisis ton mode d'assistance préféré
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={openAssistantHelp}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(37, 99, 235, 0.5)',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(37, 99, 235, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
                e.currentTarget.style.color = '#2563eb';
                e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>✨</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>Demander à Papi</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  Assistant IA disponible 24h/24
                </div>
              </div>
              <span style={{ marginLeft: 'auto', opacity: 0.7 }}>→</span>
            </button>

            <a
              href="tel:0761882950"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textDecoration: 'none',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#10b981';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                e.currentTarget.style.color = '#10b981';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '2rem' }}>📞</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>Appeler</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  07 61 88 29 50
                </div>
              </div>
              <span style={{ marginLeft: 'auto', opacity: 0.7 }}>→</span>
            </a>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'not-allowed',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '2rem', opacity: 0.5 }}>💬</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>WhatsApp</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  Fonctionnalité bientôt disponible
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowHelpModal(false)}
            style={{
              width: '100%',
              marginTop: '1.5rem',
              padding: '0.75rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: isScrolled ? 'rgba(10, 10, 10, 0.9)' : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.3s ease',
          display: isMobile ? 'none' : 'block',
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.2rem',
              borderRadius: '10px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.filter = 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.4))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.filter = 'none';
            }}
          >
            <img 
              src="/images/papibricole-avatar.png" 
              alt="PapiBricole"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                objectFit: 'cover'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                color: 'white', 
                fontSize: '1.1rem', 
                fontWeight: '700',
                letterSpacing: '-0.5px',
                lineHeight: '1.2'
              }}>
                Papi<span style={{ color: '#f97316' }}>Bricole</span>
              </div>
              <div style={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.8rem',
                fontWeight: '400'
              }}>
                Je t'aide pas à pas !
              </div>
            </div>
          </button>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            {navItems.map(item => (
              <NavItemDesktop key={item.id} item={item} />
            ))}
            <AccountButton />
          </nav>

          {/* Badge Gamification */}
          <GamificationBadge size={40} />

          {/* Panier */}
          <CartButton />

          <HelpButton />
        </div>
      </header>

      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0.5rem 1rem',
          background: isScrolled ? 'rgba(10, 10, 10, 0.9)' : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.3s ease',
          display: isMobile ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <img 
            src="/images/papibricole-avatar.png" 
            alt="PapiBricole"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'cover'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span style={{ color: 'white', fontSize: '1rem', fontWeight: '700' }}>
            Papi<span style={{ color: '#f97316' }}>Bricole</span>
          </span>
        </button>
      </header>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0.3rem 0.25rem',
          paddingBottom: 'calc(0.3rem + env(safe-area-inset-bottom))',
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: isMobile ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {navItems.map(item => (
          <NavItemMobile key={item.id} item={item} />
        ))}
        <AccountButton mobile />
        
        {/* Badge Gamification - Mobile */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          flex: 1
        }}>
          <GamificationBadge size={28} />
        </div>

        {/* Panier - Mobile */}
        <CartButton mobile />
        
        <HelpButton mobile />
      </nav>

      <div style={{ height: isMobile ? '42px' : '50px' }} />
      {isMobile && <div style={{ height: '65px' }} />}

      {showHelpModal && <HelpModal />}

      <style jsx global>{`
        @keyframes badgePop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </>
  );
}

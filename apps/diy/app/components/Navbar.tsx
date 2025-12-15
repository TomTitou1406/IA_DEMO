/**
 * /app/components/Navbar.tsx
 * Navigation principale avec design moderne et animations
 * 
 * @version 1.1
 * 
 * Changelog :
 * - v1.1 : Header transparent, effet halo survol, spacer réduit
 * - v1.0 : Version initiale
 * 
 * Features :
 * - Glassmorphism header transparent
 * - Badges animés avec compteurs
 * - Bottom nav mobile
 * - Bouton aide avec effet pulse + halo
 * - Logo cliquable
 * - Indicateur de page active
 * - Effet halo au survol
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Compteurs dynamiques
  const [projectsCount, setProjectsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Charger les compteurs
  useEffect(() => {
    loadCounts();
    
    // Détecter le scroll pour effet header
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    // Détecter mobile
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

  // Recharger les compteurs quand on change de page
  useEffect(() => {
    loadCounts();
  }, [pathname]);

  const loadCounts = async () => {
    try {
      // Compteur projets (chantiers actifs)
      const projectsRes = await fetch('/api/chantiers?count_only=true');
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjectsCount(data.count || 0);
      }
    } catch (e) {
      console.log('Compteur projets non disponible');
    }

    try {
      // Compteur favoris
      const favRes = await fetch('/api/videos/favorites');
      if (favRes.ok) {
        const data = await favRes.json();
        setFavoritesCount(data.count || 0);
      }
    } catch (e) {
      console.log('Compteur favoris non disponible');
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navItems = [
    { 
      id: 'home',
      icon: '🏠', 
      label: 'Accueil', 
      path: '/',
      color: '#f97316' // Orange
    },
    { 
      id: 'projects',
      icon: '📁', 
      label: 'Mes projets', 
      path: '/chantiers',
      count: projectsCount,
      color: '#f97316' // Orange
    },
    { 
      id: 'videos',
      icon: '❤️', 
      label: 'Mes vidéos', 
      path: '/videos/favorites',
      count: favoritesCount,
      color: '#ef4444' // Rouge
    },
    { 
      id: 'account',
      icon: '👤', 
      label: 'Mon compte', 
      path: '/compte',
      color: '#3b82f6' // Bleu
    },
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

  // ==================== COMPOSANT BADGE ====================
  const Badge = ({ count, color }: { count: number; color: string }) => {
    if (count === 0) return null;
    
    return (
      <span style={{
        position: 'absolute',
        top: '-6px',
        right: '-10px',
        background: color,
        color: 'white',
        fontSize: '0.65rem',
        fontWeight: '700',
        padding: '2px 6px',
        borderRadius: '10px',
        minWidth: '18px',
        textAlign: 'center',
        boxShadow: `0 2px 8px ${color}50`,
        animation: 'badgePop 0.3s ease-out'
      }}>
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  // ==================== NAV ITEM DESKTOP ====================
  const NavItemDesktop = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.path);
    
    return (
      <button
        onClick={() => router.push(item.path)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          borderRadius: '12px',
          border: 'none',
          background: active 
            ? `${item.color}25` 
            : 'transparent',
          color: active ? item.color : 'rgba(255,255,255,0.7)',
          fontSize: '0.9rem',
          fontWeight: active ? '600' : '500',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease',
          boxShadow: active ? `0 0 20px ${item.color}30` : 'none',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(255,255,255,0.2)';
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
        <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
        <span>{item.label}</span>
        {item.count !== undefined && <Badge count={item.count} color={item.color} />}
      </button>
    );
  };

  // ==================== NAV ITEM MOBILE ====================
  const NavItemMobile = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.path);
    
    return (
      <button
        onClick={() => router.push(item.path)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.5rem',
          border: 'none',
          background: 'transparent',
          color: active ? item.color : 'rgba(255,255,255,0.5)',
          fontSize: '0.65rem',
          fontWeight: active ? '600' : '500',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          flex: 1,
        }}
      >
        <span style={{ 
          fontSize: '1.4rem',
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
            top: '2px',
            right: 'calc(50% - 20px)',
            background: item.color,
            color: 'white',
            fontSize: '0.55rem',
            fontWeight: '700',
            padding: '1px 4px',
            borderRadius: '8px',
            minWidth: '14px',
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
            width: '20px',
            height: '3px',
            background: item.color,
            borderRadius: '3px 3px 0 0',
            boxShadow: `0 0 10px ${item.color}`,
          }} />
        )}
      </button>
    );
  };

  // ==================== BOUTON AIDE ====================
  const HelpButton = ({ mobile = false }: { mobile?: boolean }) => (
    <button
      onClick={() => setShowHelpModal(true)}
      style={{
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        alignItems: 'center',
        gap: mobile ? '0.25rem' : '0.5rem',
        padding: mobile ? '0.5rem' : '0.6rem 1.2rem',
        borderRadius: mobile ? '0' : '25px',
        border: 'none',
        background: mobile ? 'transparent' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: mobile ? '#10b981' : 'white',
        fontSize: mobile ? '0.65rem' : '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.3s ease',
        boxShadow: mobile ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)',
        flex: mobile ? 1 : 'none',
      }}
      onMouseEnter={(e) => {
        if (!mobile) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.6), 0 6px 20px rgba(16, 185, 129, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!mobile) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
        }
      }}
    >
      <span style={{ 
        fontSize: mobile ? '1.4rem' : '1.1rem',
        animation: 'pulse 2s infinite'
      }}>
        📞
      </span>
      <span>{mobile ? 'Aide' : "Besoin d'aide ?"}</span>
      
      {/* Effet pulse */}
      {!mobile && (
        <span style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '25px',
          border: '2px solid #10b981',
          animation: 'helpPulse 2s infinite',
          pointerEvents: 'none'
        }} />
      )}
    </button>
  );

  // ==================== MODAL AIDE ====================
  const HelpModal = () => (
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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '0.5rem',
            animation: 'bounce 1s ease infinite'
          }}>
            🛠️
          </div>
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

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Option 1 : Assistant IA */}
          <button
            onClick={openAssistantHelp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '16px',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.transform = 'translateX(5px)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '2rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>Demander à Papi</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                Assistant IA disponible 24h/24
              </div>
            </div>
            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>→</span>
          </button>

          {/* Option 2 : Téléphone */}
          <a
            href="tel:+33800123456"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '16px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textDecoration: 'none',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateX(5px)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '2rem' }}>📞</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>Appeler</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                08 00 12 34 56 (gratuit)
              </div>
            </div>
            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>→</span>
          </a>

          {/* Option 3 : WhatsApp */}
          <a
            href="https://wa.me/33612345678?text=Bonjour%20PapiBricole%20!"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '16px',
              border: '2px solid rgba(37, 211, 102, 0.3)',
              background: 'rgba(37, 211, 102, 0.1)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textDecoration: 'none',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)';
              e.currentTarget.style.borderColor = '#25d366';
              e.currentTarget.style.transform = 'translateX(5px)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(37, 211, 102, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.3)';
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '2rem' }}>💬</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1rem' }}>WhatsApp</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                Réponse rapide par message
              </div>
            </div>
            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>→</span>
          </a>
        </div>

        {/* Bouton fermer */}
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

  return (
    <>
      {/* ==================== HEADER DESKTOP ==================== */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0.6rem 2rem',
          background: isScrolled 
            ? 'rgba(10, 10, 10, 0.85)' 
            : 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: isScrolled 
            ? '1px solid rgba(255,255,255,0.08)' 
            : '1px solid transparent',
          transition: 'all 0.3s ease',
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '12px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.filter = 'drop-shadow(0 0 15px rgba(249, 115, 22, 0.4))';
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
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              objectFit: 'cover'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ 
              color: 'white', 
              fontSize: '1.15rem', 
              fontWeight: '700',
              letterSpacing: '-0.5px'
            }}>
              Papi<span style={{ color: '#f97316' }}>Bricole</span>
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.65rem',
              fontWeight: '400'
            }}>
              Je t'aide pas à pas !
            </div>
          </div>
        </button>

        {/* Navigation centrale - TRANSPARENT */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.3rem',
          borderRadius: '16px'
        }}>
          {navItems.map(item => (
            <NavItemDesktop key={item.id} item={item} />
          ))}
        </nav>

        {/* Bouton Aide */}
        <HelpButton />
      </header>

      {/* ==================== HEADER MOBILE (minimal) ==================== */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0.6rem 1rem',
          background: isScrolled 
            ? 'rgba(10, 10, 10, 0.9)' 
            : 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: isScrolled 
            ? '1px solid rgba(255,255,255,0.08)' 
            : '1px solid transparent',
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
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <img 
            src="/images/papibricole-avatar.png" 
            alt="PapiBricole"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              objectFit: 'cover'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span style={{ 
            color: 'white', 
            fontSize: '1.05rem', 
            fontWeight: '700' 
          }}>
            Papi<span style={{ color: '#f97316' }}>Bricole</span>
          </span>
        </button>
      </header>

      {/* ==================== BOTTOM NAV MOBILE ==================== */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0.4rem 0.25rem',
          paddingBottom: 'calc(0.4rem + env(safe-area-inset-bottom))',
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
        <HelpButton mobile />
      </nav>

      {/* ==================== SPACER TOP ==================== */}
      <div style={{ height: isMobile ? '54px' : '62px' }} />
      
      {/* ==================== SPACER BOTTOM (mobile only) ==================== */}
      {isMobile && <div style={{ height: '75px' }} />}

      {/* ==================== MODAL AIDE ==================== */}
      {showHelpModal && <HelpModal />}

      {/* ==================== STYLES CSS ==================== */}
      <style jsx global>{`
        @keyframes badgePop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        @keyframes helpPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
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
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </>
  );
}

'use client';

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero-section fade-in">
       <h1>
          Et si on mettait tes <span className="color-orange">rêves</span> en œuvre ?
       </h1>
      </section>

      {/* Navigation Cards */}
      <div className="hub-grid">
        {/* Card 1 : Mes Projets - ACTIVE */}
        <Link href="/chantiers" className="main-card card-orange">
          <div className="card-illu">
            <img src="/images/chantiers.webp" alt="Mes projets" />
          </div>
          <div className="card-content">
            <h3>Travaux et Chantiers</h3>
            <p>Crée et pilote tes chantiers</p>
          </div>
          <span className="main-btn btn-orange">
            Accéder à mes projets
          </span>
        </Link>

        {/* Card 2 : Assistance - ACTIVE */}
        <div 
          className="main-card card-blue"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
              detail: { 
                pageContext: 'aide_decouverte',
                welcomeMessage: "Salut ! Dis-moi ce qui te bloque ou ce que tu veux savoir faire. Je vais comprendre ton besoin et te mettre en relation avec le bon expert ! 🔧"
              } 
            }));
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-illu">
            <img src="/images/assistance.webp" alt="Besoin d'aide" />
          </div>
          <div className="card-content">
            <h3>J'ai besoin d'aide</h3>
            <p>Coup de pouce précis et rapide</p>
          </div>
          <button className="main-btn btn-blue">
            Bricolons ensemble
          </button>
        </div>

        {/* Card 3 : Tutos - ACTIVE */}
        <div 
          className="main-card card-green"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('openAssistantWithContext', { 
              detail: { 
                pageContext: 'video_decouverte',
                welcomeMessage: "Salut ! Tu cherches un tutoriel vidéo ? Dis-moi ce que tu veux apprendre à faire ! 🎬"
              } 
            }));
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="card-illu">
            <img src="/images/tutos.webp" alt="Tous les tutos utiles" />
          </div>
          <div className="card-content">
            <h3>Tutos & Astuces</h3>
            <p>Guides vidéos illustrés</p>
          </div>
          <button className="main-btn btn-green">
            Chercher une vidéo
          </button>
        </div>
      </div>
    </div>
  );
}


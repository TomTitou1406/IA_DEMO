import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero-section fade-in">
        <h1>
          Tes projets deviennent <span className="color-orange">réalité</span> !
        </h1>
        <h2>Je t'aide pas à pas et à chaque étape !</h2>
      </section>

      {/* Navigation Cards */}
      <div className="hub-grid">
        {/* Card 1 : Mes Projets - ACTIVE */}
        <div className="main-card card-orange fade-in">
          <div className="card-illu">
            <img src="/images/chantiers.webp" alt="Mes projets" />
          </div>
          <h3>Mes projets</h3>
          <p>Crée et pilote tous tes chantiers ici !</p>
          <Link href="/chantiers" className="main-btn btn-orange">
            Accéder à mes projets
          </Link>
        </div>

        {/* Card 2 : Assistance - DISABLED */}
        <div className="main-card card-blue fade-in">
          <div className="card-illu">
            <img src="/images/assistance.webp" alt="Besoin d'aide" />
          </div>
          <h3>J'ai besoin d'aide</h3>
          <p>Besoin d'un coup de main précis et ultra rapide ?</p>
          <button className="main-btn btn-disabled" disabled>
            Bientôt disponible 🔒
          </button>
        </div>

        {/* Card 3 : Tutos - DISABLED */}
        <div className="main-card card-green fade-in">
          <div className="card-illu">
            <img src="/images/tutos.webp" alt="Tous les tutos utiles" />
          </div>
          <h3>Tutos & Astuces</h3>
          <p>Tous les guides vidéos illustrés sont ici !</p>
          <button className="main-btn btn-disabled" disabled>
            Bientôt disponible 🔒
          </button>
        </div>
      </div>
    </div>
  );
}

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
            <div
              style={{
                width: "200px",
                height: "200px",
                margin: "0 auto",
                background: "linear-gradient(135deg, #FDD8A8 0%, #FF6B35 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4rem",
              }}
            >
              🏗️
            </div>
          </div>
          <h3>Mes projets</h3>
          <p>Crée et pilote tous tes chantiers ici !</p>
          <Link href="/chantiers" className="main-btn btn-orange">
            Accéder →
          </Link>
        </div>

        {/* Card 2 : Assistance - DISABLED */}
        <div className="main-card card-blue fade-in disabled">
          <div className="card-illu">
            <div
              style={{
                width: "200px",
                height: "200px",
                margin: "0 auto",
                background: "linear-gradient(135deg, #EFF6FF 0%, #2563EB 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4rem",
              }}
            >
              💡
            </div>
          </div>
          <h3>J'ai besoin d'aide</h3>
          <p>Besoin d'un coup de main précis et ultra rapide ?</p>
          <button className="main-btn btn-disabled" disabled>
            Bientôt disponible 🔒
          </button>
        </div>

        {/* Card 3 : Tutos - DISABLED */}
        <div className="main-card card-green fade-in disabled">
          <div className="card-illu">
            <div
              style={{
                width: "200px",
                height: "200px",
                margin: "0 auto",
                background: "linear-gradient(135deg, #ECFDF5 0%, #10B981 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4rem",
              }}
            >
              📚
            </div>
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

import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  image?: string;
  color?: string; // pour la bordure haute colorée personnalisable
};

export function Card({
  className = "",
  style = {},
  image,
  color = "var(--nc-blue)", // Couleur par défaut de la bordure haute
  children,
  ...props
}: CardProps) {
  // Image : 321x214px / Carte : 321x428px (2x image)
  return (
    <div
      className={`bg-brand.white rounded-xl shadow-card border border-gray-200 flex flex-col overflow-hidden items-center relative ${className}`}
      style={{
        width: "321px",
        height: "428px",
        minWidth: "321px",
        minHeight: "428px",
        maxWidth: "321px",
        maxHeight: "428px",
        ...style,
      }}
      {...props}
    >
      {/* Bordure de couleur arrondie en top, en overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "12px", // épaisseur
          width: "100%",
          background: color,
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
          zIndex: 2,
        }}
      />
      {image && (
        <div className="w-full flex justify-center items-start px-3 pt-3 pb-0 relative z-10">
          <img
            src={image}
            alt=""
            width={321}
            height={214}
            className="rounded-t-xl border border-gray-300"
            style={{
              width: "100%",
              height: "214px",
              maxWidth: "100%",
              objectFit: "cover",
              aspectRatio: "3 / 2",
              backgroundColor: "#eef3f7"
            }}
            loading="lazy"
          />
        </div>
      )}
      {/* Bloc titre + texte immédiatement sous l'image, collé */}
      <div className="flex flex-col justify-start items-center flex-1 px-4 pt-2 pb-4 text-center w-full">
        {children}
      </div>
    </div>
  );
}

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-2 w-full text-center font-bold text-lg ${className}`} {...props} />
  );
}

export function CardContent({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  // MASQUE le surplus par `overflow-hidden`, texte sur max 3 lignes
  return (
    <div
      className={`w-full text-center leading-snug overflow-hidden ${className}`}
      style={{
        display: "box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        lineClamp: 3,
        boxOrient: "vertical",
        maxHeight: "4.5em", // ~3 lignes
        ...style,
      }}
      {...props}
    />
  );
}

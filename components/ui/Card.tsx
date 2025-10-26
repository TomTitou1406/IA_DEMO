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
  return (
    <div
      className={`
        relative overflow-hidden 
        bg-white                    // ← Fond blanc opaque
        rounded-2xl 
        border border-[var(--nc-gray)] 
        shadow-[0_6px_18px_rgba(0,0,0,0.06)] 
        hover:border-[var(--nc-gray)] 
        hover:shadow-2xl 
        hover:-translate-y-2 
        transition-all duration-200 
        w-80 
        flex flex-col
        ${className}
      `}
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
          height: "4px", // épaisseur
          width: "100%",
          background: color,
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
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
    <div className={`mb-2 mt-2 w-full text-center font-bold text-lg ${className}`} {...props} />
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
        WebkitLineClamp: 5,
        WebkitBoxOrient: "vertical",
        lineClamp: 5,
        boxOrient: "vertical",
        maxHeight: "7.5em", // ~5 lignes
        ...style,
      }}
      {...props}
    />
  );
}

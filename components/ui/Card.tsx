// components/ui/Card.tsx
import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  image?: string;
};

export function Card({
  className = "",
  style = {},
  image,
  children,
  ...props
}: CardProps) {
  // Dimensions fixes : largeur 320px, hauteur 320px (ratio carré 1/1 ajustable)
  // Image prend 50% de la hauteur, ratio image strict 3/2 (largeur 100%, hauteur auto avec aspect-ratio)
  return (
    <div
      className={`bg-brand.white rounded-xl shadow-card border border-gray-200 flex flex-col overflow-hidden items-center ${className}`}
      style={{
        width: "320px",
        height: "320px",
        minWidth: "320px",
        minHeight: "320px",
        maxWidth: "320px",
        maxHeight: "320px",
        ...style,
      }}
      {...props}
    >
      {image && (
        <div
          className="w-full px-3 pt-3 pb-0"
          style={{
            height: "50%",
            boxSizing: "border-box"
          }}
        >
          <img
            src={image}
            alt=""
            className="w-full h-full rounded-t-xl border border-gray-300 object-cover"
            style={{
              aspectRatio: "3 / 2",
              display: "block",
              objectFit: "cover",
              objectPosition: "center"
            }}
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-col justify-center items-center flex-1 px-4 pb-4 pt-3 text-center w-full">
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
    <div className={`mb-2 w-full text-center ${className}`} {...props} />
  );
}

export function CardContent({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  // Zone texte scrollable si trop long, pour garder la taille compacte
  return (
    <div
      className={`w-full text-center overflow-y-auto ${className}`}
      style={{
        maxHeight: "4.5rem", // limite la hauteur (environ 3 lignes)
        ...style,
      }}
      {...props}
    />
  );
}

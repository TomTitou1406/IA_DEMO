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
  return (
    <div
      className={`bg-brand.white rounded-xl shadow-card border border-gray-200 flex flex-col overflow-hidden items-center ${className}`}
      style={{
        width: "321px",
        height: "428px", // 2 x 214px
        minWidth: "321px",
        minHeight: "428px",
        maxWidth: "321px",
        maxHeight: "428px",
        ...style,
      }}
      {...props}
    >
      {image && (
        <div className="w-full flex justify-center items-start px-3 pt-3">
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
  // Texte scrollable si trop long
  return (
    <div
      className={`w-full text-center overflow-y-auto ${className}`}
      style={{
        maxHeight: "54px", // 3 lignes environ
        ...style,
      }}
      {...props}
    />
  );
}

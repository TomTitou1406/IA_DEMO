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
  return (
    <div
      className={`bg-brand.white rounded-xl shadow-card border border-gray-200 flex flex-col overflow-hidden ${className}`}
      style={{ minHeight: "20rem", maxHeight: "20rem", ...style }}
      {...props}
    >
      {image && (
        <div className="relative w-full h-1/2 overflow-hidden">
          <img
            src={image}
            alt=""
            className="object-cover w-full h-full rounded-t-xl border border-gray-300 mx-2 my-2"
            style={{ aspectRatio: "2 / 3" }}
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-col justify-center items-center flex-1 px-4 text-center py-3">
        {children}
      </div>
    </div>
  );
}

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-2 ${className}`} {...props} />;
}

export function CardContent({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={className}
      style={{ overflowY: "auto", maxHeight: "calc(10rem)", ...style }}
      {...props}
    />
  );
}

// components/ui/Card.tsx
import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  image?: string; // nouvelle prop
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
      className={`bg-brand.white rounded-xl shadow-card border border-gray-200 ${className}`}
      style={{ minHeight: "20rem", maxHeight: "20rem", overflow: "hidden", ...style }}
      {...props}
    >
      {image && (
        <div className="mb-5 flex justify-center">
          <img
            src={image}
            alt=""
            className="w-24 h-24 object-cover rounded-full shadow-sm mt-6"
            style={{ backgroundColor: "#e5e7eb" }}
            loading="lazy"
          />
        </div>
      )}
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 pt-4 pb-2 ${className}`} {...props} />;
}

export function CardContent({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-4 pb-4 ${className}`}
      style={{ overflowY: "auto", maxHeight: "calc(20rem - 3rem)", ...style }}
      {...props}
    />
  );
}

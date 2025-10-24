// components/ui/Card.tsx
import * as React from "react";

export function Card({
  className = "",
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-brand.white rounded-xl shadow-card border border-gray-200 ${className}`}
      style={{ minHeight: "20rem", maxHeight: "20rem", overflow: "hidden", ...style }}
      {...props}
    />
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

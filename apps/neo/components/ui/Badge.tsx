// components/ui/Badge.tsx
import * as React from "react";

type BadgeColor = "cyan" | "green" | "orange" | "red";

export function Badge({
  color = "cyan",
  children,
}: {
  color?: BadgeColor;
  children: React.ReactNode;
}) {
  const map = {
    cyan: "bg-brand.cyan/15 text-brand.cyan",
    green: "bg-brand.green/15 text-brand.green",
    orange: "bg-brand.orange/20 text-brand.orange",
    red: "bg-brand.red/15 text-brand.red",
  } as const;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[color]}`}
    >
      {children}
    </span>
  );
}

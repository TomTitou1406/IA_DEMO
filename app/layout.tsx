// /app/layout.tsx

import "../styles/globals.css";
//... imports polices éventuels

export const metadata = {
  title: "NeoRecrut",
  description: "La nouvelle ère du recrutement",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}


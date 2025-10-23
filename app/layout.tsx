import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";

// 🔹 Importe les polices
import { Inter, JetBrains_Mono } from "next/font/google";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "600", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono", // cohérent avec tailwind.config.js
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "NeoRecrut",
  description: "La nouvelle ère du recrutement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="">
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans`}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";

import { GithubIcon, HeyGenLogo } from "./Icons";

export default function NavBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-800">
      <div className="flex items-center max-w-5xl mx-auto px-4 h-14">
        <Link href="https://app.heygen.com/" target="_blank">
          <HeyGenLogo />
        </Link>
      </div>
      <div className="bg-gradient-to-br from-sky-300 to-indigo-500 bg-clip-text">
        <p className="text-xl font-semibold text-transparent">
          Test Avatar interactif - Op'Team-IA v0.0
        </p>
      </div>
    </div>
  );
}

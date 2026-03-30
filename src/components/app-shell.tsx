"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FileSearch, Files, Home, MessageSquareText, PlayCircle, ScrollText } from "lucide-react";
import { HeaderContext } from "@/components/header-context";
import { NavLink } from "@/components/nav-link";

const navigation = [
  { href: "/workspace", label: "Workspace", icon: Home },
  { href: "/upload", label: "Upload", icon: FileSearch },
  { href: "/pipeline", label: "Pipeline", icon: PlayCircle },
  { href: "/artifacts", label: "Artifacts", icon: Files },
  { href: "/reports", label: "Reports", icon: ScrollText },
  { href: "/agent", label: "Agent", icon: MessageSquareText }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 h-16 border-b border-slate-800 bg-slate-900 text-white">
        <div className="flex h-full items-center justify-between pl-4 pr-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link href="/workspace" className="brand-lockup">
              <span className="brand-mark">S</span>
              <div>
                <p className="text-lg font-bold tracking-tight text-white">Sales Data OS</p>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <HeaderContext />
        </div>
      </header>

      <main className="relative min-h-[calc(100vh-4rem)] overflow-auto bg-slate-50">
        <div className="pointer-events-none absolute inset-0 bg-grid z-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[24rem] bg-[radial-gradient(circle_at_top_right,_rgba(224,242,254,0.9),_transparent_32%)]" />
        <div className="relative z-10 mx-auto max-w-[1400px] px-8 py-10">
          <nav className="mb-6 flex flex-wrap gap-2 md:hidden">
            {navigation.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          {children}
        </div>
      </main>
    </div>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function NavLink({
  href,
  icon: Icon,
  children
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = pathname === href;
  const companyKey = searchParams.get("company")?.trim();
  const targetHref = companyKey ? `${href}?company=${encodeURIComponent(companyKey)}` : href;

  return (
    <Link
      href={targetHref}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-slate-800 font-bold text-white"
          : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

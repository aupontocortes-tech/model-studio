"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/personagens", label: "Personagens" },
  { href: "/roupas", label: "Roupas" },
  { href: "/cenarios", label: "Cenários" },
];

export function LibraryTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex flex-wrap gap-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                : "text-[var(--muted)] hover:bg-[var(--panel-elevated)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

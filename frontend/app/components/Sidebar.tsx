"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/customers", label: "Customers" },
  { href: "/bookings", label: "Bookings" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/notifications", label: "Notifications" },
  { href: "/reports", label: "Reports" },
  { href: "/coupon", label: "Coupons" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <aside className="w-64 min-h-screen border-r border-amber-900/15 bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(248,239,224,0.95))] p-6 text-zinc-900">
      <h2 className="mb-2 text-2xl font-bold font-[family-name:var(--font-playfair)] text-zinc-900">Fleet App</h2>
      <p className="mb-8 text-xs uppercase tracking-[0.18em] text-zinc-600">Operations Console</p>

      <nav className="space-y-3">
        {links.map((link, index) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{ "--anim-delay": `${index * 70}ms` } as CSSProperties}
              className={`animate-nav-item block rounded-xl px-4 py-2.5 transition ${
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[0_10px_24px_-12px_rgba(245,191,98,0.7)]"
                  : "bg-white/75 text-zinc-700 hover:-translate-y-0.5 hover:bg-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-10 w-full rounded-xl border border-red-300/40 bg-red-500/80 px-4 py-2.5 font-semibold transition hover:bg-red-500"
      >
        Logout
      </button>
    </aside>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsAuthorized(false);
      setIsCheckingAuth(false);
      router.replace("/login");
      return;
    }

    setIsAuthorized(true);
    setIsCheckingAuth(false);
  }, [router]);

  if (isCheckingAuth || !isAuthorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen admin-shell-bg text-[var(--color-paper)]">
      <Sidebar />
      <div className="flex-1 animate-stagger" style={{ "--anim-delay": "40ms" } as React.CSSProperties}>
        <Header />
        <div className="p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}
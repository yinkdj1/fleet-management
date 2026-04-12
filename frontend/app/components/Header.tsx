"use client";

import { useState } from "react";

type User = {
  name?: string;
};

function readStoredUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = localStorage.getItem("user");

  if (!storedUser || storedUser === "undefined" || storedUser === "null") {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export default function Header() {
  const [user] = useState<User | null>(() => readStoredUser());

  return (
    <header className="sticky top-0 z-20 border-b border-amber-900/15 bg-[rgba(255,248,237,0.85)] px-6 py-4 backdrop-blur-xl md:px-8 animate-stagger" style={{ "--anim-delay": "30ms" } as React.CSSProperties}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Fleet Management</h1>
        <p className="text-sm text-zinc-600">
          Signed in as {user?.name || "User"}
        </p>
      </div>
    </header>
  );
}
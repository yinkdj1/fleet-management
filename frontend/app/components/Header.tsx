"use client";

import { useEffect, useState } from "react";

type User = {
  name?: string;
};

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">Fleet Management</h1>
      <p className="text-sm text-gray-600">
        Signed in as {user?.name || "User"}
      </p>
    </header>
  );
}
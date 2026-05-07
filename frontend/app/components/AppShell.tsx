"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen"
      style={{
        backgroundImage: "url('/Newhero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* dark overlay so content stays readable */}
      <div className="flex min-h-screen w-full bg-black/45">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
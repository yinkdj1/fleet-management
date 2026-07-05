import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ChatWidget from "./components/ChatWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.carsgidi.com"),
  title: "Carsgidi",
  description: "Carsgidi car rental platform",
  alternates: {
    canonical: "/",
  },
  icons: [
    { rel: "icon", url: "/Favi.png", type: "image/png" },
    { rel: "apple-touch-icon", url: "/Favi.png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mt-auto border-t border-zinc-200 bg-white px-4 py-4 text-center text-zinc-600">
          <p className="text-sm">Carsgidi is operated by Dekaz LLC</p>
          <p className="text-xs">2026 &reg;</p>
        </footer>
        <ChatWidget />
      </body>
    </html>
  );
}

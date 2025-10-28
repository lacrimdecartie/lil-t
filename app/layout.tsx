import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "lil-T",
  description: "Mindmap/Concept Map Editor with N:N relations",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

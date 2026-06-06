import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TPC Sawgrass — Hole 17",
  description: "Broadcast-quality 3D model of TPC Sawgrass Stadium Course, hole 17 (island green)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

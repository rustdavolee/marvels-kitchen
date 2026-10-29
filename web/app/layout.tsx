import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marvel’s Kitchen | Cooked with Love, Inspired by Tradition",
  description:
    "Discover Nigerian meals inspired by tradition, prepared with care, and served with love.",
  icons: {
    icon: "/assets/marvels-kitchen-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#123d2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

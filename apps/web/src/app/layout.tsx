import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkCraft",
  description: "Secure, high-performance URL shortener and analytics platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#050505] text-slate-100">{children}</body>
    </html>
  );
}

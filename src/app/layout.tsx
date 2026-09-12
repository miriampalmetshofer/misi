import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Misi",
  description: "Private Haushalts-App für gemeinsame Alltagsplanung.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`h-full antialiased ${geist.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

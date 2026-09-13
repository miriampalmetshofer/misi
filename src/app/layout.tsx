import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";

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
    // next-themes sets the theme class on <html> before hydration, so the
    // server and client markup differ here by design.
    <html
      lang="de"
      className={`h-full antialiased ${geist.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

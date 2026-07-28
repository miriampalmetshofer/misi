import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Misi",
  description: "Private household app for shared everyday planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

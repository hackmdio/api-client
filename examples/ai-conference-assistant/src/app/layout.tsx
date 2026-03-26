import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackMD Conference Assistant",
  description: "AI-powered collaborative note generator for conferences using HackMD API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

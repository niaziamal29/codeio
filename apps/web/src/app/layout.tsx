import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Codeio — Vibe Coding in Your Browser",
  description: "Build apps by describing what you want. Codeio handles the code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-brand-bg text-brand-text min-h-screen`}>
        {children}
      </body>
    </html>
  );
}

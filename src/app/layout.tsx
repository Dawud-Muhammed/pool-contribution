import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poolhouse | Shared contribution pools",
  description: "Transparent community lending pools with private receipt verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">P</span><span>poolhouse</span></Link><nav><Link href="/pools">Explore pools</Link></nav><span className="header-note">Transparent by default</span></header>{children}<footer className="site-footer"><span>poolhouse / community finance</span><span>Public ledger. Private identities.</span></footer></body>
    </html>
  );
}

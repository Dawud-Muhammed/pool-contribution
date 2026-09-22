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
  description: "Simple, transparent community goals with private payment verification.",
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
      <body className="min-h-full flex flex-col"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">P</span><span>poolhouse</span></Link><nav><Link href="/pools">Explore goals</Link></nav><span className="header-note">Clear progress, private people</span></header>{children}<footer className="site-footer"><span>poolhouse / community goals</span><span>Shared progress. Private identities.</span></footer></body>
    </html>
  );
}

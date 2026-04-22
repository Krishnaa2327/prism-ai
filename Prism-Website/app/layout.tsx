import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://useprism.ai"),
  title: { default: "Prism — AI Onboarding Agent for SaaS", template: "%s — Prism" },
  description: "Embed an AI agent in your SaaS in 2 lines of code. Prism guides users through onboarding, executes actions in your UI, and shows you exactly where they get stuck.",
  openGraph: {
    type: "website",
    siteName: "Prism",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", site: "@useprism" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-slate-900 antialiased">
        <div id="scroll-progress" style={{ width: "0%" }} />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

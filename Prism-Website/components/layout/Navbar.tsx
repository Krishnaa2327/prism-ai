"use client";
import { useState, useEffect, useRef } from "react";
import { DASHBOARD_URL } from "../../lib/config";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Product", href: "/product" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docH > 0 ? (y / docH) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${progress}%`;
    }
  }, [progress]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Progress bar */}
      <div
        ref={barRef}
        className={`fixed top-0 left-0 h-[2px] bg-gradient-to-r from-brand to-purple-500 z-[9999] transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}
      />

      <header
        className={`fixed top-0 left-0 right-0 z-[100] h-16 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-md bg-white/80 border-b border-slate-200/60 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-brand-sm group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg text-brand tracking-tight">Prism</span>
              <span className={`text-[10px] font-medium tracking-wide transition-colors ${scrolled ? "text-slate-400" : "text-slate-400"}`}>AI Onboarding</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:text-brand ${
                  scrolled ? "text-slate-600 hover:bg-slate-100" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href={`${DASHBOARD_URL}/login`}
              className={`text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-brand" : "text-slate-200 hover:text-white"}`}
            >
              Sign in
            </Link>
            <Link
              href={`${DASHBOARD_URL}/register`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-brand-sm hover:shadow-brand hover:scale-[1.02]"
            >
              Start free
              <span className="text-brand-light">→</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"}`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-[#0a0a0f] flex flex-col"
          >
            <div className="h-16" />
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-3xl font-bold text-white hover:text-brand transition-colors py-2"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: navLinks.length * 0.07 + 0.1 }}
                className="mt-8 flex flex-col items-center gap-4"
              >
                <Link
                  href={`${DASHBOARD_URL}/login`}
                  onClick={() => setMobileOpen(false)}
                  className="text-slate-300 hover:text-white transition-colors text-lg"
                >
                  Sign in
                </Link>
                <Link
                  href={`${DASHBOARD_URL}/register`}
                  onClick={() => setMobileOpen(false)}
                  className="px-8 py-3 bg-brand hover:bg-brand-dark text-white font-bold text-lg rounded-xl transition-all shadow-brand"
                >
                  Start for free →
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

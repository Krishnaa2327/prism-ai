'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
              O
            </div>
            <span className="font-bold text-white text-lg">OnboardAI</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <a href="#docs" className="text-sm text-zinc-400 hover:text-white transition-colors">Docs</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000/login'}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </a>
            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000/register'}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Start free
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden py-4 flex flex-col gap-4 border-t border-white/10">
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>How it works</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>Pricing</a>
            <a href="#docs" className="text-sm text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>Docs</a>
            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000/register'}
              className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white text-center"
            >
              Start free
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}

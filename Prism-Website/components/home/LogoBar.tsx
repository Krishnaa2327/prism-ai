"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/* Company names with their brand initial colors */
const logos = [
  { name: "Vercel", color: "#000000" },
  { name: "Linear", color: "#5E6AD2" },
  { name: "Notion", color: "#000000" },
  { name: "Stripe", color: "#635BFF" },
  { name: "Figma", color: "#F24E1E" },
  { name: "Loom", color: "#625DF5" },
  { name: "Retool", color: "#3D63DD" },
  { name: "Intercom", color: "#1F8DED" },
  // duplicated for infinite marquee
  { name: "Vercel", color: "#000000" },
  { name: "Linear", color: "#5E6AD2" },
  { name: "Notion", color: "#000000" },
  { name: "Stripe", color: "#635BFF" },
  { name: "Figma", color: "#F24E1E" },
  { name: "Loom", color: "#625DF5" },
  { name: "Retool", color: "#3D63DD" },
  { name: "Intercom", color: "#1F8DED" },
];

const testimonials = [
  {
    quote: "We found the bug in our onboarding in 20 minutes. Users were being asked for a field we'd already deleted. The Failure Inbox caught it.",
    name: "James K.",
    role: "Founder, B2B SaaS · YC W24",
  },
  {
    quote: "We went from 23% to 41% activation rate in 11 days. The AI guides users through our most complex setup step all by itself.",
    name: "Priya M.",
    role: "Head of Growth, infrastructure SaaS",
  },
];

export default function LogoBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="py-16 bg-white border-y border-slate-100 overflow-hidden">
      {/* Label */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-8"
      >
        Trusted by teams at
      </motion.p>

      {/* Marquee */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="marquee-container">
          <div className="flex gap-14 animate-marquee whitespace-nowrap">
            {logos.map((logo, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-default select-none group"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm"
                  style={{ backgroundColor: logo.color }}
                >
                  {logo.name[0]}
                </div>
                <span className="text-base font-semibold tracking-tight">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonial pull quotes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto px-6"
      >
        {testimonials.map((t, i) => (
          <div key={i} className="bg-[#fafbfc] border border-slate-100 rounded-2xl p-6">
            <p className="text-slate-700 leading-relaxed text-sm mb-4 italic">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <p className="text-slate-900 font-semibold text-sm">{t.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">{t.role}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

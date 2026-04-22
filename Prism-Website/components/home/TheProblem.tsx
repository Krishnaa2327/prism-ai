"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import CountUp from "react-countup";

const stats = [
  { value: 60, suffix: "%", label: "of users never complete onboarding", sub: "industry average" },
  { value: 72, suffix: "%", label: "of SaaS churn happens in the first 30 days", sub: "" },
  { value: 25000, prefix: "$", label: "average cost of replacing one churned customer", sub: "" },
];

export default function TheProblem() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-28 bg-[#06060f] relative overflow-hidden" ref={ref}>
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-64 bg-brand/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-purple-700/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-400 text-xs font-medium tracking-widest uppercase mb-6">
            The problem with onboarding today
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
            Most users never finish onboarding.
            <br />
            <span className="text-slate-600">You don&apos;t know why. Neither do they.</span>
          </h2>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.12 }}
              className="bg-[#0a0a1a] p-10 flex flex-col items-center text-center hover:bg-[#0d0d20] transition-colors group"
            >
              {/* Big number */}
              <div className="text-6xl md:text-7xl font-black mb-3 bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent tabular-nums">
                {stat.prefix || ""}
                {inView ? (
                  <CountUp end={stat.value} duration={2.5} separator="," delay={0.4 + i * 0.15} />
                ) : "0"}
                {stat.suffix || ""}
              </div>
              <p className="text-slate-300 font-semibold leading-snug text-lg mb-1">{stat.label}</p>
              {stat.sub && <p className="text-slate-600 text-sm mt-1">{stat.sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* Punchline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="text-center text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mt-14"
        >
          You have analytics. You have heatmaps. You have support tickets.
          None of them tell you what a confused user <em className="text-slate-300">actually said</em> right
          before they left. <strong className="text-white">Prism does.</strong>
        </motion.p>
      </div>
    </section>
  );
}

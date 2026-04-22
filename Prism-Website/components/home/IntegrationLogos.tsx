"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const frameworks = [
  "React", "Next.js", "Vue", "Angular", "Svelte",
  "Webflow", "Bubble", "Framer", "WordPress", "Any HTML",
];

const snippet = `<script>
  window.PrismConfig = { apiKey: "YOUR_KEY", userId: "{{user.id}}" };
</script>
<script src="https://cdn.useprism.ai/widget.js" async></script>`;

export default function IntegrationLogos() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 bg-white border-t border-slate-100" ref={ref}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-slate-400 text-sm font-medium tracking-widest uppercase mb-5"
        >
          Works with your stack
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-4xl font-black text-slate-900 mb-10"
        >
          2 lines of code. Any framework.
        </motion.h2>

        {/* Framework pill badges */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2.5 mb-12"
        >
          {frameworks.map((tech, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.25 + i * 0.04, type: "spring", stiffness: 220 }}
              whileHover={{ scale: 1.06, y: -2 }}
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-sm font-semibold cursor-default select-none transition-colors"
            >
              {tech}
            </motion.span>
          ))}
        </motion.div>

        {/* Code snippet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.65 }}
          className="code-block text-left max-w-lg mx-auto"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400/60" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <span className="w-3 h-3 rounded-full bg-green-400/60" />
            </div>
            <span className="text-slate-600 text-xs">index.html</span>
          </div>
          <pre className="p-5 text-sm text-slate-300 overflow-x-auto"><code>{snippet}</code></pre>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="text-slate-400 text-sm mt-6"
        >
          And anything else that runs JavaScript.
        </motion.p>
      </div>
    </section>
  );
}

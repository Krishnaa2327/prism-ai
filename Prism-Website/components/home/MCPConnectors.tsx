"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Database, Settings, BarChart2, Link, FolderOpen, Plus } from "lucide-react";

const connectors = [
  { icon: Database, name: "Your Database", desc: "MySQL, Postgres, MongoDB" },
  { icon: Settings, name: "Your API", desc: "REST, GraphQL, gRPC" },
  { icon: BarChart2, name: "CRM", desc: "Salesforce, HubSpot" },
  { icon: Link, name: "Webhooks", desc: "Event-driven triggers" },
  { icon: FolderOpen, name: "Internal Tools", desc: "Retool, custom admin" },
  { icon: Plus, name: "Add your own", desc: "Configure custom connector", custom: true },
];

export default function MCPConnectors() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0f] relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="eyebrow mb-4">
            Connect Everything
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-bold text-white mb-6">
            Give the AI tools, not just prompts.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            MCP (Model Context Protocol) connectors let the agent call your internal APIs, check database state, and take real actions during onboarding. Verify a user&apos;s integration is live. Create a resource on their behalf.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {connectors.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.08 }}
              className={`group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                c.custom
                  ? "border-dashed border-white/15 hover:border-brand/50 bg-transparent"
                  : "border-white/5 bg-white/3 hover:bg-white/6 hover:border-brand/30"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${c.custom ? "bg-white/5" : "bg-brand/10 group-hover:bg-brand/20 transition-colors"}`}>
                <c.icon className={`w-5 h-5 ${c.custom ? "text-brand/50" : "text-brand"}`} />
              </div>
              <h3 className={`font-semibold mb-1 ${c.custom ? "text-slate-500" : "text-white"}`}>{c.name}</h3>
              <p className={`text-sm ${c.custom ? "text-slate-600" : "text-slate-400"}`}>{c.desc}</p>
              {c.custom && (
                <div className="mt-4">
                  <span className="text-brand text-sm font-medium group-hover:text-brand-light transition-colors">→ Configure</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

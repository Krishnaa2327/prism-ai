import Link from "next/link";
import { Zap } from "lucide-react";

function ComingSoon({ title, desc, href }: { title: string; desc: string; href?: string }) {
  return (
    <div className="pt-16 min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
      <div className="relative z-10 text-center max-w-lg mx-auto px-6">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-8 h-8 text-brand" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-400 text-sm mb-6">
          Coming soon
        </div>
        <h1 className="text-4xl font-black text-white mb-4">{title}</h1>
        <p className="text-slate-400 text-lg mb-8">{desc}</p>
        <Link href="/" className="inline-flex items-center gap-2 text-brand hover:text-brand-light transition-colors">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default ComingSoon;

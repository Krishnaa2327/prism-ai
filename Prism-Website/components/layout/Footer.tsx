import Link from "next/link";
import { Zap, ExternalLink, Mail } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Product", href: "/product" },
    { label: "Use Cases", href: "/use-cases" },
    { label: "Pricing", href: "/pricing" },
    { label: "Integrations", href: "/integrations" },
    { label: "Changelog", href: "/changelog" },
  ],
  Resources: [
    { label: "Docs", href: "/docs" },
    { label: "Blog", href: "/blog" },
    { label: "Case Studies", href: "/case-studies" },
    { label: "Status", href: "/status" },
    { label: "Security", href: "/security" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Affiliate", href: "/affiliate" },
    { label: "Twitter / X", href: "https://twitter.com/useprism", external: true },
    { label: "GitHub", href: "https://github.com/useprism", external: true },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0f] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold text-lg text-white">Prism</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              The AI onboarding layer for B2B SaaS. 2 lines of code. Real results.
            </p>
            <div className="flex items-center gap-3">
              <Link href="https://twitter.com/useprism" target="_blank" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-brand/20 flex items-center justify-center text-slate-400 hover:text-brand transition-all" title="Twitter/X">
                <span className="text-sm font-black">𝕏</span>
              </Link>
              <Link href="https://github.com/useprism" target="_blank" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-brand/20 flex items-center justify-center text-slate-400 hover:text-brand transition-all" title="GitHub">
                <ExternalLink className="w-4 h-4" />
              </Link>
              <Link href="mailto:hello@useprism.ai" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-brand/20 flex items-center justify-center text-slate-400 hover:text-brand transition-all" title="Email">
                <Mail className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={(link as { external?: boolean }).external ? "_blank" : undefined}
                      className="text-slate-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © 2026 Prism ·{" "}
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
            {" · "}
            <Link href="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
          </p>
          <p className="text-slate-600 text-xs">
            Prism is not affiliated with Tandem.
          </p>
        </div>
      </div>
    </footer>
  );
}

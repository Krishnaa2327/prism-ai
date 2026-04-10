export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                O
              </div>
              <span className="font-bold text-white text-lg">OnboardAI</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              AI-powered onboarding for SaaS. Detect drop-offs, trigger conversations, convert users.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">Docs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="mailto:hello@onboardai.com" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="/legal/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/legal/terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="mailto:security@onboardai.com" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <p>© {new Date().getFullYear()} OnboardAI. All rights reserved.</p>
          <p>Powered by Claude — Anthropic</p>
        </div>
      </div>
    </footer>
  );
}

"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

const INSTALL_CODE = `<script>
  window.PrismConfig = {
    apiKey: "YOUR_API_KEY",
    userId: "{{current_user_id}}",   // your logged-in user's ID
    metadata: {
      name: "{{user.name}}",
      email: "{{user.email}}",
      plan: "{{user.plan}}"
    }
  };
</script>
<script src="https://cdn.useprism.ai/widget.js" async></script>`;

const frameworks = [
  { label: "React", code: `// In your App.jsx or index.html\n// Add to your public/index.html <head>:\n${INSTALL_CODE}` },
  { label: "Next.js", code: `// In app/layout.tsx:\nimport Script from 'next/script';\n// Inside <body>:\n<Script id="prism-config">\n  {{\`window.PrismConfig = { apiKey: "YOUR_KEY", userId: user.id };\`}}\n</Script>\n<Script src="https://cdn.useprism.ai/widget.js" async />` },
  { label: "Vue", code: `// In index.html <head>:\n${INSTALL_CODE}` },
  { label: "Webflow", code: `// Add to Site Settings → Custom Code → Head Code:\n${INSTALL_CODE}` },
  { label: "Plain HTML", code: `<!-- Add before </head>: -->\n${INSTALL_CODE}` },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block relative">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400/60" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/60" />
          <span className="w-3 h-3 rounded-full bg-green-400/60" />
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors"
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>
      <pre className="p-5 text-sm text-slate-300 overflow-x-auto leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

export default function QuickstartPage() {
  const [activeFrame, setActiveFrame] = useState(0);

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
        <Link href="/docs" className="hover:text-slate-600 transition-colors">Docs</Link>
        <span>/</span>
        <span className="text-slate-700">Quickstart</span>
      </div>

      <h1 className="text-4xl font-black text-slate-900 mb-4">Quickstart</h1>
      <p className="text-xl text-slate-500 mb-12">Get Prism running in under 5 minutes.</p>

      {/* Steps */}
      <div className="space-y-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">1</span>
            Create your account
          </h2>
          <p className="text-slate-600 mb-4">Sign up at <Link href="https://app.useprism.ai" className="text-brand hover:underline" target="_blank">app.useprism.ai</Link>. No credit card required.</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">2</span>
            Create a flow
          </h2>
          <p className="text-slate-600 mb-4">In the dashboard, go to <strong>Flows → New Flow</strong>. Name it &ldquo;Main Onboarding&rdquo;. Add your first step with a title, description, and optional AI prompt.</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">3</span>
            Install the widget
          </h2>
          <p className="text-slate-600 mb-4">Copy your API key from <strong>Settings → General</strong>. Add this to your app before <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">&lt;/head&gt;</code>:</p>

          {/* Framework tabs */}
          <div className="flex gap-1 mb-2 flex-wrap">
            {frameworks.map((fw, i) => (
              <button key={fw.label} onClick={() => setActiveFrame(i)} className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${activeFrame === i ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                {fw.label}
              </button>
            ))}
          </div>
          <CodeBlock code={frameworks[activeFrame].code} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">4</span>
            See your first session
          </h2>
          <p className="text-slate-600 mb-4">Open your app in a browser. The Prism panel will appear on the right. Go to <strong>dashboard → Sessions</strong> to see the session appear in real time.</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <p className="font-semibold text-slate-700 mb-2">What happens next</p>
            <p className="text-slate-600 text-sm leading-relaxed">The widget calls your backend on every page load. If a flow is active, it shows the panel. If the user is mid-flow, it resumes from where they left off.</p>
          </div>
        </div>
      </div>

      {/* Next step */}
      <div className="mt-12 p-6 bg-brand/5 border border-brand/20 rounded-2xl flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">Next</p>
          <p className="text-slate-500 text-sm">Build your first flow →</p>
        </div>
        <Link href="/docs/first-flow" className="px-5 py-2.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors">
          Continue →
        </Link>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';

const SNIPPET_PLAIN = (apiKey: string) => `<script>
  window.Prism=window.Prism||function(){(window.Prism.q=window.Prism.q||[]).push(arguments)};
</script>
<script src="https://cdn.useprism.ai/widget.js" async></script>
<script>
  Prism('init', {
    apiKey: '${apiKey}',
    userId: 'user_123',           // your user's ID
    metadata: {
      name:    'Jane Smith',
      email:   'jane@example.com',
      plan:    'pro',
    },
  });
</script>`;

const SNIPPET_REACT = (apiKey: string) => `// Install: npm install (no package needed — load via CDN)
// Add to your root layout or _app.tsx:

useEffect(() => {
  const s = document.createElement('script');
  s.src = 'https://cdn.useprism.ai/widget.js';
  s.async = true;
  s.onload = () => {
    window.Prism('init', {
      apiKey: '${apiKey}',
      userId: user.id,
      metadata: {
        name:    user.name,
        email:   user.email,
        plan:    user.plan,
        company: user.company,
      },
    });
  };
  document.head.appendChild(s);
}, [user]);`;

const SNIPPET_NEXTJS = (apiKey: string) => `// app/layout.tsx — add inside <body>
import Script from 'next/script';

<Script
  src="https://cdn.useprism.ai/widget.js"
  strategy="afterInteractive"
  onLoad={() => {
    window.Prism('init', {
      apiKey: '${apiKey}',
      userId: session?.user?.id ?? 'anonymous',
      metadata: {
        email: session?.user?.email,
        name:  session?.user?.name,
      },
    });
  }}
/>`;

const SNIPPET_WEBFLOW = (apiKey: string) => `<!-- Add to Webflow: Project Settings → Custom Code → Footer Code -->
<script src="https://cdn.useprism.ai/widget.js" async
  onload="Prism('init',{apiKey:'${apiKey}',userId:Webflow.env('userId')??'guest'})">
</script>`;

type Tab = 'html' | 'react' | 'nextjs' | 'webflow';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-5 text-xs leading-relaxed overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function DocsPage() {
  const { org } = useAuthStore();
  const apiKey = org?.apiKey ?? 'YOUR_API_KEY';
  const [tab, setTab] = useState<Tab>('html');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'html',    label: 'Plain HTML' },
    { id: 'react',   label: 'React' },
    { id: 'nextjs',  label: 'Next.js' },
    { id: 'webflow', label: 'Webflow' },
  ];

  const snippets: Record<Tab, string> = {
    html:    SNIPPET_PLAIN(apiKey),
    react:   SNIPPET_REACT(apiKey),
    nextjs:  SNIPPET_NEXTJS(apiKey),
    webflow: SNIPPET_WEBFLOW(apiKey),
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Deploy in 5 minutes</h1>
      <p className="text-slate-500 text-sm mb-8">
        Paste one snippet and your AI copilot is live. No backend changes needed.
      </p>

      {/* Step 1 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">1</div>
          <h2 className="text-base font-semibold text-slate-900">Add the snippet to your app</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CodeBlock code={snippets[tab]} />
      </div>

      {/* Step 2 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">2</div>
          <h2 className="text-base font-semibold text-slate-900">Create a flow in the dashboard</h2>
        </div>
        <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-700 space-y-2">
          <p>Go to <strong>Flows → New Flow</strong> and add steps for each stage of your onboarding.</p>
          <p>Each step gets a <strong>title</strong>, optional <strong>AI instructions</strong>, and an optional pre-configured <strong>page action</strong> (fill a form, click a button, navigate).</p>
          <p>Mark one step as the <strong>First Value Milestone</strong> — this is your "aha moment".</p>
        </div>
      </div>

      {/* Step 3 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">3</div>
          <h2 className="text-base font-semibold text-slate-900">Verify it works</h2>
        </div>
        <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-700 space-y-2">
          <p>Open your app in a browser. The Prism sidebar should appear on the right side.</p>
          <p>The AI will guide you through the steps you configured. Check <strong>Sessions</strong> in the dashboard to see the live session appear.</p>
          <p>Use <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-xs">testMode: true</code> in the init call to test without recording real sessions.</p>
        </div>
      </div>

      {/* Metadata reference */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Metadata fields (optional but recommended)</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Field</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Type</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Used for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['name',      'string', 'Personalise AI greetings and form pre-fill'],
                ['firstName', 'string', 'Auto-fill first name fields'],
                ['lastName',  'string', 'Auto-fill last name fields'],
                ['email',     'string', 'Auto-fill email fields'],
                ['company',   'string', 'Auto-fill company/org fields'],
                ['role',      'string', 'Tailor AI depth (technical vs non-technical)'],
                ['plan',      'string', 'Contextualise guidance to current plan'],
              ].map(([field, type, desc]) => (
                <tr key={field}>
                  <td className="px-4 py-2 font-mono text-xs text-brand-700">{field}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{type}</td>
                  <td className="px-4 py-2 text-slate-600 text-xs">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your API key */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-brand-700 mb-1">Your API key</p>
        <code className="text-sm text-brand-900 font-mono break-all">{apiKey}</code>
        <p className="text-xs text-brand-600 mt-2">Keep this secret — it authenticates all widget sessions to your account.</p>
      </div>
    </div>
  );
}

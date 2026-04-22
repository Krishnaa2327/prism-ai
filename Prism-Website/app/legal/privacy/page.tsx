import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Prism",
  description: "How Prism collects, uses, and protects your data and your users' data.",
};

const sections = [
  {
    id: "overview",
    title: "1. Overview",
    content: `Prism Inc. ("Prism", "we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information in connection with the Prism platform ("Service").

This policy applies to:
- Customers (companies that use Prism to build onboarding flows)
- End Users (end users of Customer applications who interact with Prism-powered experiences)
- Website visitors (people who visit useprism.ai)`,
  },
  {
    id: "what-we-collect",
    title: "2. What We Collect",
    content: `Account data: When you sign up, we collect your email address, name, and company information.

Usage data: How you interact with the Prism dashboard — pages visited, features used, configuration changes made.

Billing data: Payment method details are collected and processed by Stripe. We do not store raw card numbers.

Session transcript data: The AI conversations your end users have with Prism-powered agents, including messages exchanged, actions executed, and steps completed or failed. This data is stored encrypted and accessible only to your account.

Metadata you configure: Any additional context you pass via the PrismConfig object (e.g., userId, planName) — you control what is sent.`,
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Data",
    content: `We use the data we collect to:

- Provide and operate the Service (session replay, failure inbox, analytics)
- Send product and account communications (release notes, billing alerts)
- Investigate security incidents and enforce our Terms of Service
- Improve our product — aggregated and anonymized usage patterns only

We do NOT:
- Sell your data or your end users' data to any third party
- Use session transcripts or end user conversations to train AI models
- Share personally identifiable data with advertisers`,
  },
  {
    id: "data-sharing",
    title: "4. Data Sharing",
    content: `We share data only in the following circumstances:

Service providers: Third-party vendors who help us operate the Service (AWS for hosting, Stripe for billing, Resend for transactional email). Each vendor is bound by a Data Processing Agreement.

Legal compliance: If required by law, court order, or governmental authority.

Business transfers: In connection with a merger, acquisition, or sale of assets, with advance notice to affected customers.

Aggregated analytics: Non-identifiable, aggregate statistics may be used publicly (e.g., "X sessions guided this month").`,
  },
  {
    id: "retention",
    title: "5. Data Retention",
    content: `Session transcript data: Retained for 90 days by default. Enterprise customers may configure custom retention periods.

Account data: Retained for the life of your account plus 30 days after termination.

Billing records: Retained for 7 years for accounting and legal compliance.

Free tier inactivity: Accounts inactive for 180 days will receive a deletion warning. Data deleted 30 days after warning if no response.

You may request deletion of all Customer Data at any time from Settings → Data, or by emailing privacy@useprism.ai.`,
  },
  {
    id: "security",
    title: "6. Security",
    content: `We implement industry-standard security measures:

- All data encrypted at rest using AES-256
- All data encrypted in transit using TLS 1.3
- Session transcripts stored in isolated, per-tenant storage
- API keys hashed with bcrypt — never stored in plaintext
- Annual third-party penetration testing

For a full description of our security practices, see our Security page.`,
  },
  {
    id: "cookies",
    title: "7. Cookies",
    content: `We use cookies and similar technologies to:

- Keep you authenticated in the dashboard (session cookies)
- Remember your preferences (e.g., dark/light mode)
- Understand how visitors use useprism.ai (analytics)

We use Plausible Analytics (a privacy-first, GDPR-compliant analytics provider) — no cross-site tracking or fingerprinting. You may disable analytics cookies in your browser without affecting Service functionality.`,
  },
  {
    id: "gdpr",
    title: "8. GDPR & International Transfers",
    content: `If you are located in the European Economic Area (EEA), you have the following rights:

- Right of access — request a copy of your personal data
- Right to rectification — request correction of inaccurate data
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object to processing

To exercise these rights, contact privacy@useprism.ai. We will respond within 30 days.

For transfers of personal data from the EEA to the US, we rely on Standard Contractual Clauses (SCCs). A Data Processing Agreement (DPA) is available on request for GDPR-covered customers.`,
  },
  {
    id: "ccpa",
    title: "9. California Privacy Rights (CCPA)",
    content: `If you are a California resident, you have the right to:

- Know what personal information we collect and how it is used
- Request deletion of your personal information
- Opt out of the sale of personal information (we do not sell personal information)

To exercise these rights, contact privacy@useprism.ai or use the data deletion option in your account settings.`,
  },
  {
    id: "children",
    title: "10. Children's Privacy",
    content: `The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children under 16. If you believe we have collected data from a child under 16, please contact us immediately at privacy@useprism.ai.`,
  },
  {
    id: "changes",
    title: "11. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. For material changes, we will notify you by email or dashboard notification at least 30 days before the changes take effect. Continued use of the Service after the effective date constitutes your acceptance of the updated policy.`,
  },
  {
    id: "contact",
    title: "12. Contact",
    content: `Privacy-related questions and data requests:

Email: privacy@useprism.ai
Response time: Within 30 days for formal GDPR/CCPA requests, within 5 business days for general inquiries.

For security disclosures: security@useprism.ai
For general questions: hello@useprism.ai`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="pt-16 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 bg-[#fafbfc]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <p className="eyebrow mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Privacy Policy</h1>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-500">
            <span>Last updated: April 1, 2026</span>
            <span>Effective: April 1, 2026</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">

          {/* Sidebar TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-slate-500 hover:text-brand py-1 transition-colors leading-snug"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
                <Link href="/legal/terms" className="block text-sm text-brand hover:text-brand-dark font-medium transition-colors">
                  Terms of Service →
                </Link>
                <Link href="/security" className="block text-sm text-brand hover:text-brand-dark font-medium transition-colors">
                  Security →
                </Link>
                <a href="mailto:privacy@useprism.ai" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors">
                  privacy@useprism.ai
                </a>
              </div>
            </div>
          </aside>

          {/* Body */}
          <article>
            <p className="text-lg text-slate-500 leading-relaxed mb-12 border-l-4 border-brand/30 pl-4">
              Your data belongs to you. This policy explains exactly what we collect, why, and what you can do about it.
            </p>

            {sections.map((section) => (
              <div key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                <h2 className="text-xl font-black text-slate-900 mb-4">{section.title}</h2>
                <div className="space-y-3">
                  {section.content.split("\n\n").map((para, i) => {
                    const lines = para.split("\n");
                    const isList = lines.some((l) => l.startsWith("- "));
                    if (isList) {
                      return (
                        <ul key={i} className="space-y-1.5">
                          {lines.map((line, j) =>
                            line.startsWith("- ") ? (
                              <li key={j} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                                {line.slice(2)}
                              </li>
                            ) : line.trim() ? (
                              <p key={j} className="text-slate-600 text-sm leading-relaxed font-semibold">{line}</p>
                            ) : null
                          )}
                        </ul>
                      );
                    }
                    return (
                      <p key={i} className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                        {para}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-16 pt-10 border-t border-slate-100">
              <p className="text-sm text-slate-400 text-center">
                © {new Date().getFullYear()} Prism Inc. — All rights reserved.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

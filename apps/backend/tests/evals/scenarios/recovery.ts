import { EvalScenario } from '../runner';

export const recoveryScenarios: EvalScenario[] = [
  {
    id: 'recovery-wrong-page',
    description: 'Agent must navigate when page context does not match goal',
    goal: 'Set up GST filing by entering the GSTIN number',
    mockDom: {
      url: 'https://app.example.com/dashboard',
      title: 'Dashboard',
      headings: ['Welcome back', 'Recent Activity'],
      elements: [
        { tag: 'a', selector: 'a[href="/settings/gst"]', text: 'GST Settings' },
        { tag: 'a', selector: 'a[href="/reports"]', text: 'Reports' },
      ],
      semanticSummary: 'Dashboard page. No GST input fields visible. Navigation link to GST Settings present.',
    },
    expectedActions: ['execute_page_action'],
    maxTurns: 3,
    tags: ['recovery', 'wrong-page'],
  },

  {
    id: 'recovery-repeated-failure-degrades',
    description: 'After 3 observe turns agent must call degrade_to_manual not escalate_to_human',
    goal: 'Fill in the company PAN number',
    mockDom: {
      url: 'https://app.example.com/compliance',
      title: 'Compliance Setup',
      headings: ['Compliance Setup', 'PAN Details'],
      elements: [
        { tag: 'input', selector: 'input[name="pan_number"]', text: 'PAN Number', type: 'text', value: '' },
      ],
      semanticSummary: 'Compliance Setup page. PAN Number input field visible and empty.',
    },
    expectedActions: ['degrade_to_manual'],
    maxTurns: 4,
    tags: ['recovery', 'degrade'],
    seedTurnHistory: [
      { role: 'observe', content: 'Action fill_form attempted on selector "input[name=pan_number]" but page did not change.' },
      { role: 'observe', content: 'Action fill_form attempted on selector "input[name=pan_number]" but page did not change.' },
      { role: 'observe', content: 'Action fill_form attempted on selector "input[name=pan_number]" but page did not change.' },
    ],
  },

  {
    id: 'recovery-stale-selector-replans',
    description: 'Agent replans with alternative selector strategy after first failure',
    goal: 'Click the Save button to submit the payroll form',
    mockDom: {
      url: 'https://app.example.com/payroll/settings',
      title: 'Payroll Settings',
      headings: ['Payroll Settings', 'Save Changes'],
      elements: [
        { tag: 'button', selector: 'button[data-action="save-payroll"]', text: 'Save Changes', type: 'button' },
        { tag: 'input', selector: 'input#company-name', text: 'Company Name', type: 'text', value: 'Acme Corp' },
      ],
      semanticSummary: 'Payroll Settings page. Save Changes button visible. Primary action to save the form.',
    },
    expectedActions: ['execute_page_action'],
    maxTurns: 3,
    tags: ['recovery', 'stale-selector'],
    seedTurnHistory: [
      { role: 'observe', content: 'Action click attempted on selector "button.save-btn" but page did not change. Selector may be stale.' },
    ],
  },

  // ── Phase 4 new scenarios ──────────────────────────────────────────────────

  {
    id: 'recovery-escalation-intercepted',
    description: 'Escalation guard must redirect escalate_to_human → degrade_to_manual when degrade not yet shown',
    goal: 'Enable two-factor authentication',
    mockDom: {
      url: 'https://app.example.com/security',
      title: 'Security Settings',
      headings: ['Security Settings', 'Two-Factor Authentication'],
      elements: [
        { tag: 'button', selector: 'button[aria-label="Enable 2FA"]', text: 'Enable 2FA', type: 'button' },
        { tag: 'input', selector: 'input[name="phone"]', text: 'Phone number', type: 'tel', value: '' },
      ],
      semanticSummary: 'Security Settings page. Enable 2FA button present. Phone number input field empty.',
    },
    // We expect degrade_to_manual, NOT escalate_to_human, because degrade hasn't fired yet
    expectedActions: ['degrade_to_manual'],
    forbiddenActions: ['escalate_to_human'],
    maxTurns: 2,
    tags: ['recovery', 'escalation-guard'],
    seedTurnHistory: [
      { role: 'observe', content: 'Action click attempted on selector "button[data-cy=2fa-toggle]" but page did not change.' },
      { role: 'observe', content: 'Action click attempted on selector "button.enable-2fa" but page did not change.' },
      { role: 'observe', content: 'Action click attempted on selector "input[type=checkbox]" but page did not change.' },
    ],
  },

  {
    id: 'recovery-wrong-page-replan',
    description: 'Agent detects it navigated to wrong page and replans to find the correct destination',
    goal: 'Configure the Razorpay payment gateway credentials',
    mockDom: {
      url: 'https://app.example.com/integrations/email',
      title: 'Email Settings',
      headings: ['Email Settings', 'SMTP Configuration'],
      elements: [
        { tag: 'input', selector: 'input[name="smtp_host"]', text: 'SMTP Host', type: 'text', value: '' },
        { tag: 'a', selector: 'a[href="/integrations/payments"]', text: 'Payment Integrations' },
      ],
      semanticSummary: 'Email Settings page. Wrong page for payment gateway configuration. Link to Payment Integrations is present.',
    },
    // Agent should navigate to the correct page
    expectedActions: ['execute_page_action'],
    maxTurns: 2,
    tags: ['recovery', 'wrong-page', 'replan'],
    seedTurnHistory: [
      {
        role: 'assistant',
        content: 'Executed navigate action: Navigate to /integrations/payments',
      },
    ],
  },
];

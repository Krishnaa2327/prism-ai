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
      { role: 'observe', content: 'Action attempted on selector "input[name=pan_number]" but page did not change.' },
      { role: 'observe', content: 'Action attempted on selector "input[name=pan_number]" but page did not change.' },
      { role: 'observe', content: 'Action attempted on selector "input[name=pan_number]" but page did not change.' },
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
      { role: 'observe', content: 'Action attempted on selector "button.save-btn" but page did not change. Selector may be stale.' },
    ],
  },
];

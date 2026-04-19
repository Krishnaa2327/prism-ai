import { EvalScenario } from '../runner';

export const paymentsScenarios: EvalScenario[] = [
  {
    id: 'payments-kyc-start',
    description: 'Agent asks about business type for KYC',
    goal: 'Complete business KYC for payment gateway',
    mockDom: {
      url: '/kyc/business',
      title: 'Business KYC',
      headings: ['Business Verification'],
      elements: [
        { tag: 'select', selector: '#business-type-select', text: 'Business Type', type: undefined },
        { tag: 'input', selector: '#business-pan', text: 'Business PAN', type: 'text' },
        { tag: 'button', selector: '#submit-kyc', text: 'Submit KYC' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): Business Type, Business PAN\nPRIMARY ACTION: "Submit KYC" (disabled)\nERRORS: None',
    },
    expectedActions: ['execute_page_action', 'ask_clarification'],
    maxTurns: 3,
    tags: ['payments', 'kyc', 'india'],
  },
  {
    id: 'payments-bank-verify',
    description: 'Agent highlights bank account field for settlement setup',
    goal: 'Add bank account for settlements',
    mockDom: {
      url: '/settings/bank',
      title: 'Bank Account',
      headings: ['Settlement Account'],
      elements: [
        { tag: 'input', selector: '#account-number', text: 'Account Number', type: 'text' },
        { tag: 'input', selector: '#ifsc-code', text: 'IFSC Code', type: 'text' },
        { tag: 'button', selector: '#verify-bank', text: 'Verify Account' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): Account Number, IFSC Code\nPRIMARY ACTION: "Verify Account" (disabled)\nERRORS: None',
    },
    expectedActions: ['execute_page_action', 'ask_clarification'],
    maxTurns: 3,
    tags: ['payments', 'bank', 'india'],
  },
  {
    id: 'payments-already-done',
    description: 'Agent recognizes setup is complete and calls goal_complete',
    goal: 'Set up payment processing',
    mockDom: {
      url: '/dashboard',
      title: 'Payments Dashboard',
      headings: ['Payment Overview'],
      elements: [
        { tag: 'button', selector: '#create-payment-link', text: 'Create Payment Link' },
        { tag: 'button', selector: '#view-settlements', text: 'View Settlements' },
      ],
      semanticSummary: 'PAGE TYPE: Dashboard\nFILLED: Status="Active", Account Verified="Yes"\nPRIMARY ACTION: "Create Payment Link" (enabled)\nERRORS: None',
    },
    expectedActions: ['goal_complete'],
    maxTurns: 2,
    tags: ['payments', 'complete'],
  },
];

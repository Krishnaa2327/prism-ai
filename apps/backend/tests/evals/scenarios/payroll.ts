import { EvalScenario } from '../runner';

export const payrollScenarios: EvalScenario[] = [
  {
    id: 'payroll-pan-entry',
    description: 'Agent highlights PAN field when user wants to set up payroll',
    goal: 'Help me set up payroll for my company',
    mockDom: {
      url: '/settings/payroll',
      title: 'Payroll Setup',
      headings: ['Company Details', 'Statutory Configuration'],
      elements: [
        { tag: 'input', selector: '#company-pan', text: 'Company PAN', type: 'text' },
        { tag: 'input', selector: '#company-tan', text: 'TAN Number', type: 'text' },
        { tag: 'button', selector: '#save-company', text: 'Save & Continue' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): Company PAN, TAN Number\nPRIMARY ACTION: "Save & Continue" (disabled)\nERRORS: None',
    },
    expectedActions: ['execute_page_action', 'ask_clarification'],
    maxTurns: 3,
    tags: ['payroll', 'india'],
  },
  {
    id: 'payroll-pf-config',
    description: 'Agent asks about PF registration when PF section is visible',
    goal: 'Configure PF and ESI for payroll',
    mockDom: {
      url: '/settings/payroll/statutory',
      title: 'Statutory Setup',
      headings: ['PF Configuration', 'ESI Configuration'],
      elements: [
        { tag: 'input', selector: '#pf-registration-number', text: 'PF Registration Number', type: 'text' },
        { tag: 'input', selector: '#esi-code', text: 'ESI Code', type: 'text' },
        { tag: 'button', selector: '#save-statutory', text: 'Save' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): PF Registration Number, ESI Code\nPRIMARY ACTION: "Save" (disabled)\nERRORS: None',
    },
    expectedActions: ['ask_clarification'],
    maxTurns: 2,
    tags: ['payroll', 'india', 'statutory'],
  },
  {
    id: 'payroll-complete',
    description: 'Agent completes goal when all payroll fields are filled',
    goal: 'Finish payroll setup',
    mockDom: {
      url: '/settings/payroll',
      title: 'Payroll Setup',
      headings: ['Payroll Configuration'],
      elements: [
        { tag: 'input', selector: '#company-pan', text: 'Company PAN', type: 'text', value: 'AADCB2230M' },
        { tag: 'input', selector: '#company-tan', text: 'TAN Number', type: 'text', value: 'MUMH12345F' },
        { tag: 'button', selector: '#save-company', text: 'Save & Continue' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nFILLED: Company PAN="AADCB2230M", TAN Number="MUMH12345F"\nPRIMARY ACTION: "Save & Continue" (enabled)\nERRORS: None',
    },
    expectedActions: ['execute_page_action'],
    maxTurns: 2,
    tags: ['payroll', 'india'],
  },
];

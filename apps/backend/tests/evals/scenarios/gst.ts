import { EvalScenario } from '../runner';

export const gstScenarios: EvalScenario[] = [
  {
    id: 'gst-gstin-entry',
    description: 'Agent highlights GSTIN field and asks for number',
    goal: 'Set up GST filing for my business',
    mockDom: {
      url: '/tax/gst',
      title: 'GST Setup',
      headings: ['GST Configuration', 'GSTIN Verification'],
      elements: [
        { tag: 'input', selector: '#gstin-input', text: 'GSTIN', type: 'text' },
        { tag: 'button', selector: '#verify-gstin', text: 'Verify GSTIN' },
        { tag: 'button', selector: '#save-gst', text: 'Save' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): GSTIN\nPRIMARY ACTION: "Verify GSTIN" (enabled)\nERRORS: None',
    },
    expectedActions: ['execute_page_action', 'ask_clarification'],
    maxTurns: 3,
    tags: ['gst', 'india', 'tax'],
  },
  {
    id: 'gst-invoice-setup',
    description: 'Agent asks about HSN/SAC codes for invoice template',
    goal: 'Configure invoice template with GST rates',
    mockDom: {
      url: '/tax/gst/invoice',
      title: 'Invoice Template',
      headings: ['GST Invoice Settings'],
      elements: [
        { tag: 'select', selector: '#gst-rate', text: 'GST Rate', type: undefined },
        { tag: 'input', selector: '#hsn-code', text: 'HSN/SAC Code', type: 'text' },
        { tag: 'button', selector: '#save-invoice', text: 'Save Template' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): GST Rate, HSN/SAC Code\nPRIMARY ACTION: "Save Template" (disabled)\nERRORS: None',
    },
    expectedActions: ['ask_clarification'],
    maxTurns: 2,
    tags: ['gst', 'india', 'invoice'],
  },
  {
    id: 'gst-gstin-error',
    description: 'Agent detects GSTIN validation error and guides correction',
    goal: 'Fix GSTIN validation error',
    mockDom: {
      url: '/tax/gst',
      title: 'GST Setup',
      headings: ['GST Configuration'],
      elements: [
        { tag: 'input', selector: '#gstin-input', text: 'GSTIN', type: 'text', value: 'INVALID123' },
        { tag: 'button', selector: '#verify-gstin', text: 'Verify GSTIN' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nFILLED: GSTIN="INVALID123"\nPRIMARY ACTION: "Verify GSTIN" (enabled)\nERRORS: Invalid GSTIN format. Must be 15 characters.',
    },
    expectedActions: ['ask_clarification', 'execute_page_action'],
    maxTurns: 3,
    tags: ['gst', 'india', 'error-recovery'],
  },
];

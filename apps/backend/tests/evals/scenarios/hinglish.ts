import { EvalScenario } from '../runner';

export const hinglishScenarios: EvalScenario[] = [
  {
    id: 'hinglish-business-profile',
    description: 'Agent responds appropriately to Hinglish goal',
    goal: 'Mujhe apna business setup karna hai',
    mockDom: {
      url: '/setup',
      title: 'Business Setup',
      headings: ['Business Profile'],
      elements: [
        { tag: 'input', selector: '#business-name', text: 'Business Name', type: 'text' },
        { tag: 'input', selector: '#business-city', text: 'City', type: 'text' },
        { tag: 'button', selector: '#save-profile', text: 'Save' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): Business Name, City\nPRIMARY ACTION: "Save" (disabled)\nERRORS: None',
    },
    expectedActions: ['execute_page_action', 'ask_clarification'],
    maxTurns: 3,
    tags: ['hinglish', 'india', 'msme'],
  },
  {
    id: 'hinglish-invoice',
    description: 'Agent handles Hinglish invoice creation request',
    goal: 'Invoice banana hai apne customer ke liye',
    mockDom: {
      url: '/invoices/new',
      title: 'New Invoice',
      headings: ['Create Invoice'],
      elements: [
        { tag: 'input', selector: '#invoice-customer', text: 'Customer Name', type: 'text' },
        { tag: 'input', selector: '#invoice-amount', text: 'Amount', type: 'number' },
        { tag: 'button', selector: '#create-invoice', text: 'Create Invoice' },
      ],
      semanticSummary: 'PAGE TYPE: Form\nREQUIRED (empty): Customer Name, Amount\nPRIMARY ACTION: "Create Invoice" (disabled)\nERRORS: None',
    },
    expectedActions: ['execute_page_action', 'ask_clarification'],
    maxTurns: 3,
    tags: ['hinglish', 'india', 'invoice'],
  },
];

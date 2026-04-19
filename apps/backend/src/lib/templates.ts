// ─── Built-in onboarding flow templates ──────────────────────────────────────
// Each template is a proven starting point for a SaaS vertical.
// Customers pick one and get a working flow in one click instead of blank canvas.

export interface TemplateStep {
  order: number;
  title: string;
  intent: string;
  description: string;
  aiPrompt: string;
  smartQuestions: string[];
  actionType: string | null;
  actionConfig: Record<string, unknown>;
  completionEvent: string | null;
  isMilestone: boolean;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  benchmarkTimeToValueMins: number; // industry average for this vertical
  steps: TemplateStep[];
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'analytics-saas',
    name: 'Analytics SaaS',
    description: 'Guide users from data connection to their first chart and insight.',
    category: 'Analytics',
    icon: '📊',
    benchmarkTimeToValueMins: 8,
    steps: [
      {
        order: 0,
        title: 'Connect your data source',
        intent: 'data_connection',
        description: "We'll link your data so the dashboard has real numbers to show.",
        aiPrompt:
          'Ask the user what their primary data source is (Google Analytics, Mixpanel, CSV, or custom API). ' +
          'Once they answer, confirm you will set up the connection. ' +
          'If they say CSV, use execute_page_action with type=highlight on the upload button. ' +
          'After confirming the source, complete the step.',
        smartQuestions: ["What's your main data source? (e.g. Google Analytics, Mixpanel, CSV)"],
        actionType: 'highlight',
        actionConfig: { selector: '#data-source-upload' },
        completionEvent: 'data_connected',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Create your first dashboard',
        intent: 'dashboard_creation',
        description: "Pick the metric that matters most — we'll build the chart automatically.",
        aiPrompt:
          'Ask the user what they want to track first (signups, revenue, churn, page views, etc). ' +
          'Once they answer, use execute_page_action with type=fill_form to fill the dashboard name field. ' +
          'Then complete the step immediately.',
        smartQuestions: ['What do you want to track first? (e.g. signups, revenue, churn)'],
        actionType: 'fill_form',
        actionConfig: { fields: { '#dashboard-name': '' } },
        completionEvent: 'dashboard_created',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'See your first insight',
        intent: 'first_insight',
        description: "Your data is ready — let's look at what it's telling you.",
        aiPrompt:
          'The user has connected data and created a dashboard. ' +
          'Congratulate them warmly and immediately call celebrate_milestone. ' +
          'Headline: "Your first insight is live!" ' +
          'Insight: reference the metric they said they wanted to track from collectedData.',
        smartQuestions: [],
        actionType: null,
        actionConfig: {},
        completionEvent: 'insight_viewed',
        isMilestone: true,
      },
    ],
  },

  {
    id: 'no-code-tool',
    name: 'No-code / Automation Tool',
    description: 'Get users to build and run their first automation without reading the docs.',
    category: 'No-code',
    icon: '⚡',
    benchmarkTimeToValueMins: 12,
    steps: [
      {
        order: 0,
        title: 'Build your first automation',
        intent: 'automation_creation',
        description: "Tell us what you want to automate — we'll set it up for you.",
        aiPrompt:
          'Ask the user what repetitive task they want to automate. ' +
          'Common answers: send Slack message when form submitted, sync data between apps, auto-email new signups. ' +
          'Once they describe it, highlight the relevant template or trigger in the UI. ' +
          'Complete the step after they pick a trigger.',
        smartQuestions: ['What would you like to automate? (describe the task in plain English)'],
        actionType: 'highlight',
        actionConfig: { selector: '#trigger-selector' },
        completionEvent: 'trigger_selected',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Connect your apps',
        intent: 'app_connection',
        description: "Link the two apps involved in your automation.",
        aiPrompt:
          'The user has selected a trigger. Now they need to connect the source and destination apps. ' +
          'Ask which apps they want to connect. ' +
          'Use execute_page_action with type=highlight to point them at the app connector. ' +
          'Complete the step once both apps are connected.',
        smartQuestions: ['Which apps do you want to connect? (e.g. Gmail → Slack, Typeform → Notion)'],
        actionType: 'highlight',
        actionConfig: { selector: '#app-connector' },
        completionEvent: 'apps_connected',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'Run your first workflow',
        intent: 'first_run',
        description: "Let's test it — one click to run your automation for the first time.",
        aiPrompt:
          'The user has built their automation. Encourage them to click the Run/Test button. ' +
          'Use execute_page_action with type=click on the run button. ' +
          'Then call celebrate_milestone. ' +
          'Headline: "Your first automation is live!" ' +
          'Insight: "It will now run automatically every time the trigger fires."',
        smartQuestions: [],
        actionType: 'click',
        actionConfig: { selector: '#run-workflow-btn' },
        completionEvent: 'workflow_run',
        isMilestone: true,
      },
    ],
  },

  {
    id: 'crm',
    name: 'CRM',
    description: 'Guide sales reps from importing contacts to logging their first deal.',
    category: 'CRM',
    icon: '💰',
    benchmarkTimeToValueMins: 6,
    steps: [
      {
        order: 0,
        title: 'Import your contacts',
        intent: 'contact_import',
        description: "Bring your existing contacts in — CSV, Google Contacts, or LinkedIn.",
        aiPrompt:
          'Ask the user where their contacts currently live. ' +
          'If CSV: use execute_page_action type=highlight on the import button. ' +
          'If Google Contacts or LinkedIn: navigate to the integration page. ' +
          'Complete the step after import starts.',
        smartQuestions: ['Where are your contacts right now? (CSV, Google Contacts, LinkedIn, or another CRM?)'],
        actionType: 'highlight',
        actionConfig: { selector: '#import-contacts-btn' },
        completionEvent: 'contacts_imported',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Log your first deal',
        intent: 'deal_creation',
        description: "Add one real deal you're working on right now.",
        aiPrompt:
          'Ask the user to name one deal they are currently working on. ' +
          'Use execute_page_action type=fill_form to pre-fill the deal name field with what they said. ' +
          'Then complete the step.',
        smartQuestions: ["What's one deal you're currently working on? (company name is fine)"],
        actionType: 'fill_form',
        actionConfig: { fields: { '#deal-name': '' } },
        completionEvent: 'deal_created',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'Set your first follow-up',
        intent: 'followup_scheduled',
        description: "Schedule a reminder so this deal never goes cold.",
        aiPrompt:
          'The user has a deal logged. Ask when they want to follow up. ' +
          'Use execute_page_action type=fill_form to set the follow-up date. ' +
          'Then call celebrate_milestone. ' +
          'Headline: "Your pipeline is live!" ' +
          'Insight: "You will get a reminder on the date you set. No deal will go cold again."',
        smartQuestions: ['When do you want to follow up on this deal? (e.g. next Monday, in 3 days)'],
        actionType: 'fill_form',
        actionConfig: { fields: { '#followup-date': '' } },
        completionEvent: 'followup_set',
        isMilestone: true,
      },
    ],
  },

  {
    id: 'dev-tool',
    name: 'Developer Tool / API',
    description: 'Get developers from signup to a working API integration in one session.',
    category: 'Dev Tools',
    icon: '🛠️',
    benchmarkTimeToValueMins: 5,
    steps: [
      {
        order: 0,
        title: 'Get your API key',
        intent: 'api_key',
        description: "Your API key is ready — copy it to get started.",
        aiPrompt:
          'Tell the user their API key is on this page. ' +
          'Use execute_page_action type=highlight on the API key field. ' +
          'Ask which language or framework they are using. Complete the step immediately.',
        smartQuestions: ['Which language are you using? (JavaScript, Python, Ruby, Go, etc.)'],
        actionType: 'highlight',
        actionConfig: { selector: '#api-key' },
        completionEvent: 'api_key_copied',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Send your first API call',
        intent: 'first_api_call',
        description: "Copy the snippet for your language and make your first request.",
        aiPrompt:
          'Based on the language the user said, show them the correct code snippet. ' +
          'Navigate to the right quickstart page for their language. ' +
          'Complete the step after they confirm they ran the code.',
        smartQuestions: [],
        actionType: 'navigate',
        actionConfig: { url: '/docs/quickstart' },
        completionEvent: 'first_api_call',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'See your first response',
        intent: 'first_response',
        description: "Your request went through — here's what came back.",
        aiPrompt:
          'The user has made their first API call. Call celebrate_milestone. ' +
          'Headline: "You are integrated!" ' +
          'Insight: "Your first API call succeeded. The response is logged in your dashboard."',
        smartQuestions: [],
        actionType: null,
        actionConfig: {},
        completionEvent: 'response_viewed',
        isMilestone: true,
      },
    ],
  },

  // ─── India-specific templates ────────────────────────────────────────────────

  {
    id: 'india-payroll-setup',
    name: 'HR & Payroll Setup (India)',
    description: 'Guide users through statutory compliance — PF, ESI, PT, TDS, leave policies. Built for Keka, GreytHR, Zoho Payroll-type products.',
    category: 'India — HR & Payroll',
    icon: '🇮🇳',
    benchmarkTimeToValueMins: 15,
    steps: [
      {
        order: 0,
        title: 'Company & statutory details',
        intent: 'company_setup',
        description: 'Set up your company PAN, TAN, and registered address for payroll compliance.',
        aiPrompt:
          'Ask the user for their company PAN and TAN. Explain why these are needed for TDS filing. ' +
          'If they do not have TAN yet, tell them to apply on tin.nsdl.com and come back. ' +
          'Use execute_page_action type=highlight on the PAN input field. ' +
          'Once they confirm entering the details, complete the step.',
        smartQuestions: ['Do you have your company PAN and TAN handy?'],
        actionType: 'highlight',
        actionConfig: { selector: '#company-pan' },
        completionEvent: 'company_details_saved',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'PF & ESI configuration',
        intent: 'pf_esi_setup',
        description: 'Configure Provident Fund and ESI registration numbers.',
        aiPrompt:
          'Ask if the company is registered for PF (mandatory above 20 employees) and ESI (mandatory above 10 employees). ' +
          'If yes, ask for the PF registration number (22-digit) and ESI code. ' +
          'Explain that PF contribution is 12% employee + 12% employer on basic salary. ' +
          'ESI is 0.75% employee + 3.25% employer on gross salary up to ₹21,000/month. ' +
          'Complete the step after they save both numbers.',
        smartQuestions: [
          'Is your company registered for PF? How many employees do you have?',
          'Do you have your PF registration number?',
        ],
        actionType: 'highlight',
        actionConfig: { selector: '#pf-registration-number' },
        completionEvent: 'pf_esi_configured',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'Leave policy setup',
        intent: 'leave_policy',
        description: 'Configure Casual Leave, Sick Leave, and Earned Leave as per Shops & Establishment Act.',
        aiPrompt:
          'Guide the user to set up leave types. Defaults per most state Shops Acts: ' +
          'CL: 12 days/year, SL: 12 days/year, EL: 1 day per 20 days worked. ' +
          'Ask which state they operate in to confirm the right defaults. ' +
          'Complete after they save the leave policy.',
        smartQuestions: ['Which state is your primary office in?'],
        actionType: 'fill_form',
        actionConfig: { fields: { '#casual-leave': '12', '#sick-leave': '12' } },
        completionEvent: 'leave_policy_saved',
        isMilestone: false,
      },
      {
        order: 3,
        title: 'Run first payroll',
        intent: 'first_payroll',
        description: 'Add one employee and run a test payroll to verify all deductions.',
        aiPrompt:
          'Tell the user to add one employee as a test. Walk them through CTC breakup: Basic (40-50% of CTC), HRA (40-50% of Basic), Special Allowance (remaining). ' +
          'After they run the test payroll, call celebrate_milestone. ' +
          'Headline: "Payroll is live!" ' +
          'Insight: Show them the net take-home and deductions summary.',
        smartQuestions: ['Have you added at least one employee to test with?'],
        actionType: null,
        actionConfig: {},
        completionEvent: 'first_payroll_run',
        isMilestone: true,
      },
    ],
  },

  {
    id: 'india-gst-setup',
    name: 'GST Filing Setup (India)',
    description: 'Guide first-time GST users through GSTIN verification, invoice setup, and first return filing. Built for Cleartax, Zoho Books, Vyapar-type products.',
    category: 'India — Tax & Compliance',
    icon: '📋',
    benchmarkTimeToValueMins: 10,
    steps: [
      {
        order: 0,
        title: 'Verify GSTIN',
        intent: 'gstin_verification',
        description: 'Enter and verify your GST Identification Number.',
        aiPrompt:
          'Ask the user for their 15-digit GSTIN. Explain the format: 2-digit state code + 10-digit PAN + entity number + Z + check digit. ' +
          'If they do not have GSTIN, tell them to register at gst.gov.in — it takes 3-7 working days. ' +
          'Once they enter it, use execute_page_action type=highlight on the verify button. ' +
          'Complete the step after GSTIN is verified.',
        smartQuestions: ['Do you have your GSTIN ready? It is a 15-character alphanumeric code.'],
        actionType: 'highlight',
        actionConfig: { selector: '#gstin-input' },
        completionEvent: 'gstin_verified',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Set up invoice template',
        intent: 'invoice_setup',
        description: 'Configure your GST-compliant invoice with HSN/SAC codes.',
        aiPrompt:
          'Ask whether they sell goods (HSN code needed) or services (SAC code needed). ' +
          'For common software/SaaS: SAC code 998314 (IT services) or 998313 (software). ' +
          'Help them pick the right GST rate: 0%, 5%, 12%, 18%, or 28%. Most SaaS is 18%. ' +
          'Complete after they save their invoice template.',
        smartQuestions: [
          'Do you sell goods or services?',
          'What is your primary product or service category?',
        ],
        actionType: null,
        actionConfig: {},
        completionEvent: 'invoice_template_saved',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'File first GSTR-1',
        intent: 'first_gstr1',
        description: 'File your first outward supplies return.',
        aiPrompt:
          'Explain GSTR-1 is due by the 11th of every month (quarterly for <₹5Cr turnover — QRMP scheme). ' +
          'Walk them through adding their first invoice to the return. ' +
          'After they file or save as draft, call celebrate_milestone. ' +
          'Headline: "GST filing is set up!" ' +
          'Insight: "Your first GSTR-1 is filed. GSTR-3B is due by the 20th for tax payment."',
        smartQuestions: ['Is your annual turnover above or below ₹5 crore?'],
        actionType: null,
        actionConfig: {},
        completionEvent: 'gstr1_filed',
        isMilestone: true,
      },
    ],
  },

  {
    id: 'india-loan-origination',
    name: 'Loan Origination Onboarding (NBFC)',
    description: 'Guide lenders and borrowers through KYC, bureau pull, underwriting setup. Built for Perfios, Roopya, Leadsquared NBFC-type products.',
    category: 'India — Fintech & Lending',
    icon: '🏦',
    benchmarkTimeToValueMins: 12,
    steps: [
      {
        order: 0,
        title: 'KYC document upload',
        intent: 'kyc_upload',
        description: 'Collect Aadhaar, PAN, and address proof from the borrower.',
        aiPrompt:
          'Ask the user (lender admin) to upload KYC documents for the test borrower: Aadhaar (identity + address), PAN (income tax). ' +
          'Explain RBI KYC norms require Officially Valid Documents (OVDs). ' +
          'Use execute_page_action type=highlight on the Aadhaar upload field. ' +
          'Complete after both documents are uploaded.',
        smartQuestions: ['Do you have the borrower\'s Aadhaar and PAN documents ready to upload?'],
        actionType: 'highlight',
        actionConfig: { selector: '#aadhaar-upload' },
        completionEvent: 'kyc_documents_uploaded',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Bureau pull & credit score',
        intent: 'bureau_pull',
        description: 'Pull CIBIL / Experian credit report for the borrower.',
        aiPrompt:
          'Explain that a bureau pull requires the borrower\'s PAN and consent. ' +
          'Ask if they have connected their bureau integration (CIBIL, Experian, CRIF, Equifax). ' +
          'If not, guide them to the integrations page. ' +
          'After they initiate the bureau pull, complete the step.',
        smartQuestions: ['Which credit bureau are you integrated with — CIBIL, Experian, CRIF, or Equifax?'],
        actionType: 'navigate',
        actionConfig: { url: '/settings/integrations/bureau' },
        completionEvent: 'bureau_report_pulled',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'Underwriting rule setup',
        intent: 'underwriting_config',
        description: 'Set minimum CIBIL score, FOIR, and LTV thresholds.',
        aiPrompt:
          'Guide the user to set underwriting rules: minimum CIBIL score (RBI recommends 650+ for retail lending), ' +
          'Fixed Obligation to Income Ratio (FOIR) — typically 40-50% max, ' +
          'Loan to Value (LTV) — depends on product (home loan max 90%, personal loan N/A). ' +
          'Complete after they save at least one rule.',
        smartQuestions: [
          'What type of loan product are you setting up? (Personal, Home, Business, BNPL)',
          'What minimum CIBIL score do you want to require?',
        ],
        actionType: null,
        actionConfig: {},
        completionEvent: 'underwriting_rules_saved',
        isMilestone: false,
      },
      {
        order: 3,
        title: 'Disburse first test loan',
        intent: 'first_disbursement',
        description: 'Run a test loan through the full origination pipeline.',
        aiPrompt:
          'Walk the user through sanctioning and disbursing a test loan. ' +
          'After the test disbursal is triggered, call celebrate_milestone. ' +
          'Headline: "Loan origination pipeline is live!" ' +
          'Insight: "Your first loan went through KYC → Bureau → Underwriting → Disbursal. You are ready to go live."',
        smartQuestions: ['Is this a test disbursal or will you go live immediately?'],
        actionType: null,
        actionConfig: {},
        completionEvent: 'first_loan_disbursed',
        isMilestone: true,
      },
    ],
  },

  {
    id: 'india-payments-activation',
    name: 'Payments Dashboard Activation (Razorpay-type)',
    description: 'Guide merchants through business KYC, first payment link, and settlement setup. Built for payment gateway / neobanking dashboards.',
    category: 'India — Payments & Fintech',
    icon: '💳',
    benchmarkTimeToValueMins: 8,
    steps: [
      {
        order: 0,
        title: 'Business KYC',
        intent: 'business_kyc',
        description: 'Verify GST, business PAN, and bank account for settlements.',
        aiPrompt:
          'Ask for the merchant\'s business type: Proprietorship, Partnership, Private Ltd, or LLP. ' +
          'Based on answer, tell them which documents are needed. For Private Ltd: COI, MoA, board resolution, business PAN, GST. ' +
          'Use execute_page_action type=highlight on the business type selector. ' +
          'Complete after they submit KYC documents.',
        smartQuestions: ['What is your business type? (Proprietorship / Partnership / Private Ltd / LLP)'],
        actionType: 'highlight',
        actionConfig: { selector: '#business-type-select' },
        completionEvent: 'business_kyc_submitted',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Create first payment link',
        intent: 'first_payment_link',
        description: 'Create a payment link and collect your first test payment.',
        aiPrompt:
          'Guide the user to create a payment link for ₹1 (test amount). ' +
          'Use execute_page_action type=fill_form to pre-fill amount as 1 and description as "Test payment". ' +
          'Ask them to share it with themselves and complete the payment. ' +
          'Complete the step once they confirm the test payment succeeded.',
        smartQuestions: ['Have you received the test payment confirmation on your registered email?'],
        actionType: 'fill_form',
        actionConfig: { fields: { '#payment-amount': '1', '#payment-description': 'Test payment' } },
        completionEvent: 'first_payment_received',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'Settlement account setup',
        intent: 'settlement_setup',
        description: 'Link your bank account for next-day settlements.',
        aiPrompt:
          'Ask for their settlement bank account (must be in the business name). ' +
          'Explain T+1 settlement cycle — payments received today settle tomorrow. ' +
          'After they add and verify the bank account, call celebrate_milestone. ' +
          'Headline: "Your payment stack is live!" ' +
          'Insight: "You can now accept UPI, cards, netbanking, and wallets. Settlements go to your account by next business day."',
        smartQuestions: ['Is your bank account in the same business name as your KYC?'],
        actionType: null,
        actionConfig: {},
        completionEvent: 'settlement_account_verified',
        isMilestone: true,
      },
    ],
  },

  {
    id: 'india-msme-accounting',
    name: 'MSME Accounting Setup (Hinglish)',
    description: 'Simple guided setup for non-technical MSME owners in Hinglish. Built for Vyapar, Khatabook, OkCredit-type products.',
    category: 'India — MSME & SMB',
    icon: '🏪',
    benchmarkTimeToValueMins: 6,
    steps: [
      {
        order: 0,
        title: 'Business profile banao',
        intent: 'business_profile',
        description: 'Apna business name, city, aur type enter karo.',
        aiPrompt:
          'Greet in Hinglish: "Namaste! Aapka swagat hai. Chaliye shuru karte hain — seedha simple steps mein." ' +
          'Ask: "Aapka business ka naam kya hai? Aur aap kya bechte hain — goods ya services?" ' +
          'Keep language friendly and simple — no jargon. ' +
          'Use execute_page_action type=highlight on business name field. ' +
          'Complete after they save their business profile.',
        smartQuestions: [
          'Aapka business ka naam kya hai?',
          'Aap kya bechte hain? (Kapda / Kirana / Electronics / Services — kuch bhi)',
        ],
        actionType: 'highlight',
        actionConfig: { selector: '#business-name' },
        completionEvent: 'business_profile_saved',
        isMilestone: false,
      },
      {
        order: 1,
        title: 'Pehla invoice banao',
        intent: 'first_invoice',
        description: 'Apne customer ke liye pehla invoice create karo.',
        aiPrompt:
          'Say: "Ab aapka pehla invoice banate hain — bahut easy hai!" ' +
          'Walk them through: customer name, item/service, amount, GST (agar applicable ho). ' +
          'Use execute_page_action type=fill_form to pre-fill a sample invoice. ' +
          'Complete after they create and save the invoice.',
        smartQuestions: [
          'Kya aap GST registered hain? (Haan / Nahi)',
          'Apne ek customer ka naam batao jiske liye test invoice banana hai.',
        ],
        actionType: 'fill_form',
        actionConfig: { fields: { '#invoice-customer': 'Test Customer', '#invoice-amount': '1000' } },
        completionEvent: 'first_invoice_created',
        isMilestone: false,
      },
      {
        order: 2,
        title: 'Paise track karo',
        intent: 'payment_tracking',
        description: 'Dekho kaun sa payment pending hai aur kaun sa aa gaya.',
        aiPrompt:
          'Say: "Ab aap dekhenge ki kaun sa payment mila aur kaun sa baaki hai — yahi hai accounting ka sabse bada faida!" ' +
          'Show them the receivables dashboard. ' +
          'After they view it, call celebrate_milestone. ' +
          'Headline: "Badhai ho! Aapka accounting shuru ho gaya!" ' +
          'Insight: "Ab aap apne saare invoices aur payments ek jagah dekh sakte ho."',
        smartQuestions: [],
        actionType: null,
        actionConfig: {},
        completionEvent: 'receivables_viewed',
        isMilestone: true,
      },
    ],
  },
];

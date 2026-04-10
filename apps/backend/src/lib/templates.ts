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
];

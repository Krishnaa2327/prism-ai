import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test organization
  const apiKey = 'org_' + crypto.randomBytes(32).toString('hex');

  const org = await prisma.organization.upsert({
    where: { apiKey },
    update: {},
    create: {
      name: 'Test Company',
      apiKey,
      planType: 'free',
      customInstructions: 'Be extra friendly and use simple language.',
    },
  });

  console.log(`Organization: ${org.name}`);
  console.log(`API Key: ${org.apiKey}`);

  // Create a test admin user
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Admin User',
      passwordHash,
      role: 'owner',
      organizationId: org.id,
    },
  });

  console.log(`User: ${user.email} / password123`);

  // Create a sample end user and conversation
  const endUser = await prisma.endUser.upsert({
    where: {
      organizationId_externalId: {
        organizationId: org.id,
        externalId: 'demo_user_1',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      externalId: 'demo_user_1',
      metadata: { plan: 'trial', page: '/onboarding/step-2' },
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      endUserId: endUser.id,
      organizationId: org.id,
      triggeredBy: 'idle',
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: "Hi! I noticed you've been on this step for a while. Can I help you get set up?",
      },
      {
        conversationId: conversation.id,
        role: 'user',
        content: "I'm confused about the payment step",
      },
    ],
  });

  // ─── Demo onboarding flow: Analytics SaaS ───────────────────────────────────
  // Delete existing flow for idempotency
  await prisma.onboardingFlow.deleteMany({ where: { organizationId: org.id, name: 'Analytics SaaS Onboarding' } });

  const flow = await prisma.onboardingFlow.create({
    data: {
      organizationId: org.id,
      name: 'Analytics SaaS Onboarding',
      description: 'Guide new users from signup to their first dashboard insight.',
      isActive: true,
    },
  });

  await prisma.onboardingStep.createMany({
    data: [
      {
        flowId: flow.id,
        order: 0,
        title: 'Connect your data source',
        intent: 'data_connection',
        description: "We'll link your data so the dashboard has something to show.",
        aiPrompt:
          'Ask the user what their primary data source is (Google Analytics, Mixpanel, CSV, or custom API). ' +
          'Once they answer, tell them you will set up the connection and mark the step complete. ' +
          'If they say CSV, use execute_page_action with type=highlight to point them at the upload button.',
        smartQuestions: ["What's your main data source? (e.g. Google Analytics, Mixpanel, CSV)"],
        actionType: 'highlight',
        actionConfig: { selector: '#data-source-upload' },
        completionEvent: 'data_connected',
        isMilestone: false,
      },
      {
        flowId: flow.id,
        order: 1,
        title: 'Create your first dashboard',
        intent: 'dashboard_creation',
        description: "Pick the metric you care about most — we'll build the chart for you.",
        aiPrompt:
          'Ask the user what they want to track first (signups, revenue, churn, page views, etc). ' +
          'Once they answer, use execute_page_action with type=fill_form to fill the dashboard name field ' +
          'with their metric name, then mark the step complete.',
        smartQuestions: ['What do you want to track first? (e.g. signups, revenue, churn)'],
        actionType: 'fill_form',
        actionConfig: { fields: { '#dashboard-name': '' } }, // widget fills dynamically
        completionEvent: 'dashboard_created',
        isMilestone: false,
      },
      {
        flowId: flow.id,
        order: 2,
        title: 'See your first insight',
        intent: 'first_insight',
        description: "Your data is ready — here's what it's telling you.",
        aiPrompt:
          'The user has connected data and created a dashboard. ' +
          'Congratulate them warmly and call celebrate_milestone. ' +
          'The headline should be "Your first insight is live!" and the insight should reference ' +
          'what they said they wanted to track (from collectedData).',
        smartQuestions: [],
        actionType: null,
        actionConfig: {},
        completionEvent: 'insight_viewed',
        isMilestone: true,
      },
    ],
  });

  console.log(`Onboarding flow: "${flow.name}" (3 steps)`);

  console.log('Seed complete!');
  console.log('\n--- Copy these for testing ---');
  console.log(`API Key: ${org.apiKey}`);
  console.log('Dashboard login: admin@test.com / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

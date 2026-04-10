import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OnboardAI — Stop Losing Users at the Critical Moment',
  description:
    'Embed one script tag. OnboardAI detects when users get stuck and triggers an AI-powered guide that converts hesitation into action.',
  openGraph: {
    title: 'OnboardAI — AI Onboarding That Converts',
    description: 'Detect drop-offs. Trigger AI guides. Watch conversions climb.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import LogoBar from "@/components/home/LogoBar";
import TheProblem from "@/components/home/TheProblem";
import HowItWorks from "@/components/home/HowItWorks";
import AgentContext from "@/components/home/AgentContext";
import FeatureBento from "@/components/home/FeatureBento";
import PricingTeaser from "@/components/home/PricingTeaser";
import IntegrationLogos from "@/components/home/IntegrationLogos";
import FinalCTA from "@/components/home/FinalCTA";

export const metadata: Metadata = {
  title: "Prism — AI Onboarding Agent for SaaS",
  description: "Embed an AI agent in your SaaS in 2 lines of code. Guides users through onboarding, executes actions in your UI, shows you where they get stuck.",
  openGraph: {
    title: "Prism — AI Onboarding Agent for SaaS",
    description: "Embed an AI agent in your SaaS in 2 lines of code.",
    url: "https://useprism.ai",
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoBar />
      <TheProblem />
      <HowItWorks />
      <AgentContext />
      <FeatureBento />
      <IntegrationLogos />
      <PricingTeaser />
      <FinalCTA />
    </>
  );
}

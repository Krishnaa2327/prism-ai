import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Demo — Prism",
  description:
    "Book a 20-minute product demo, email us directly, or start for free. We're pretty responsive.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

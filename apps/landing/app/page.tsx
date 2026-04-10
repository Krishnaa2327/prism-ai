import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import LogoBar from '@/components/LogoBar';
import HowItWorks from '@/components/HowItWorks';
import UseCases from '@/components/UseCases';
import Pricing from '@/components/Pricing';
import Testimonials from '@/components/Testimonials';
import DocsCTA from '@/components/DocsCTA';
import Footer from '@/components/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <LogoBar />
      <HowItWorks />
      <UseCases />
      <Testimonials />
      <Pricing />
      <DocsCTA />
      <Footer />
    </main>
  );
}

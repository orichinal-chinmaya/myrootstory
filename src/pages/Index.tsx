import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhatWeDo from "@/components/WhatWeDo";
import HowItWorks from "@/components/HowItWorks";
import WhoWeServe from "@/components/WhoWeServe";
import Evidence from "@/components/Evidence";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <WhatWeDo />
      <HowItWorks />
      <WhoWeServe />
      <Evidence />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;

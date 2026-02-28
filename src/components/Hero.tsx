import heroBg from "@/assets/hero-bg.jpg";

const STATS = [
  { value: "12+", label: "Languages" },
  { value: "40K+", label: "Narratives captured" },
  { value: "28", label: "Countries" },
  { value: "97%", label: "Validation rate" },
];

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Community conversation"
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-6 pt-32 pb-24">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 mb-8 opacity-0 animate-fade-up animation-delay-100">
            <div className="w-6 h-px bg-amber" />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-amber/90">
              Narrative Intelligence Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-cream text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] mb-8 text-balance opacity-0 animate-fade-up animation-delay-200">
            Change is best understood through{" "}
            <em className="not-italic text-gradient-amber">the lives</em>{" "}
            that experience it.
          </h1>

          {/* Subhead */}
          <p className="font-body text-cream/70 text-lg md:text-xl leading-relaxed max-w-xl mb-12 opacity-0 animate-fade-up animation-delay-300">
            We help governments, foundations, and organisations listen at scale —
            turning thousands of first-person accounts into structured, analysable evidence.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 opacity-0 animate-fade-up animation-delay-400">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 font-body font-medium bg-amber text-forest-deep px-7 py-3.5 rounded-sm hover:bg-amber/90 transition-colors duration-200 text-sm"
            >
              Request a Demo
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 font-body font-medium border border-cream/30 text-cream px-7 py-3.5 rounded-sm hover:bg-cream/10 transition-colors duration-200 text-sm"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-20 pt-10 border-t border-cream/15 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-0 animate-fade-up animation-delay-600">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-3xl font-semibold text-cream mb-1">
                {stat.value}
              </div>
              <div className="font-body text-xs tracking-wide text-cream/50 uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <div className="w-px h-12 bg-cream/40 animate-float" />
      </div>
    </section>
  );
};

export default Hero;

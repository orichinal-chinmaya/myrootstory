const CTA = () => {
  return (
    <section id="contact" className="py-28" style={{ background: "hsl(var(--forest-deep))" }}>
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-6 h-px bg-amber" />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-amber/80">
              Get Started
            </span>
            <div className="w-6 h-px bg-amber" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-cream leading-tight mb-8">
            Ready to listen at scale?
          </h2>
          <p className="font-body text-cream/75 text-lg leading-relaxed mb-12 max-w-xl mx-auto">
            We work with governments, foundations, and research organisations.
            Tell us about your project and we'll design a listening study that fits your evidence needs.
          </p>

          {/* Contact form */}
          <div
            className="rounded-sm p-10 text-left"
            style={{ background: "hsl(var(--forest-mid))" }}
          >
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block font-body text-xs tracking-[0.1em] uppercase text-cream/75 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Your full name"
                  className="w-full bg-forest-deep/60 border border-cream/10 rounded-sm px-4 py-3 font-body text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-amber/50 transition-colors"
                />
              </div>
              <div>
                <label className="block font-body text-xs tracking-[0.1em] uppercase text-cream/75 mb-2">
                  Organisation
                </label>
                <input
                  type="text"
                  placeholder="Your organisation"
                  className="w-full bg-forest-deep/60 border border-cream/10 rounded-sm px-4 py-3 font-body text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-amber/50 transition-colors"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block font-body text-xs tracking-[0.1em] uppercase text-cream/75 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="you@organisation.org"
                className="w-full bg-forest-deep/60 border border-cream/10 rounded-sm px-4 py-3 font-body text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-amber/50 transition-colors"
              />
            </div>
            <div className="mb-8">
              <label className="block font-body text-xs tracking-[0.1em] uppercase text-cream/75 mb-2">
                Tell us about your project
              </label>
              <textarea
                rows={4}
                placeholder="What are you trying to understand? What populations? What's the timeline?"
                className="w-full bg-forest-deep/60 border border-cream/10 rounded-sm px-4 py-3 font-body text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-amber/50 transition-colors resize-none"
              />
            </div>
            <button className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-amber text-forest-deep font-body font-medium text-sm px-10 py-3.5 rounded-sm hover:bg-amber/90 transition-colors duration-200">
              Send Enquiry
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;

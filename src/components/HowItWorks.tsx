const STEPS = [
  {
    phase: "Capture",
    title: "Guided Conversations",
    body: "Participants engage in respectful, adaptive AI interviews conducted in their local language. Questions follow the natural flow of each person's account.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 20V8a2 2 0 012-2h16a2 2 0 012 2v8a2 2 0 01-2 2H9l-5 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 12h10M9 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    phase: "Structure",
    title: "Tagging & Coding",
    body: "Narratives are automatically tagged across dozens of thematic dimensions — then reviewed by human validators to ensure accuracy and sensitivity.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="4" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 10h10M9 14h10M9 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="21" cy="7" r="3" fill="hsl(var(--amber))" stroke="none"/>
      </svg>
    ),
  },
  {
    phase: "Validate",
    title: "Human Review",
    body: "Trained analysts check every narrative. Our validation layer ensures the dataset meets the standards expected of quantitative evidence.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 14l3.5 3.5L19 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    phase: "Analyse",
    title: "Integrated Dataset",
    body: "The structured narrative dataset is delivered alongside your quantitative data — queryable, filterable, and ready for mixed-methods analysis.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 22V8M8 22V14M12 22V10M16 22V6M20 22V12M24 22V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const HowItWorks = () => {
  return (
    <section
      id="how-it-works-detail"
      className="py-28"
      style={{ background: "hsl(var(--forest-deep))" }}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mb-20">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-6 h-px bg-amber" />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-amber/80">
              The Process
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-medium text-cream leading-tight mb-6">
            From conversation to evidence — four steps.
          </h2>
          <p className="font-body text-cream/75 text-lg leading-relaxed">
            Adaptive AI interviews paired with rigorous human validation create datasets
            that are both measurable and meaningful.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-cream/10 rounded-sm overflow-hidden">
          {STEPS.map((step, i) => (
            <div
              key={step.phase}
              className="bg-forest-deep p-8 hover:bg-forest-mid transition-colors duration-300 group"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="text-cream/80 group-hover:text-amber transition-colors duration-300">
                  {step.icon}
                </div>
                <span className="font-body text-xs tracking-[0.15em] uppercase text-amber/75">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="font-body text-xs tracking-[0.15em] uppercase text-amber mb-3">
                {step.phase}
              </div>
              <h3 className="font-display text-lg font-semibold text-cream mb-4">
                {step.title}
              </h3>
              <p className="font-body text-cream/75 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        {/* Machine-readable summary for crawlers + LLMs */}
        <div className="mt-16 border-t border-cream/10 pt-12">
          <h3 className="font-display text-xl font-medium text-cream mb-8">
            How RootStory Works
          </h3>
          <ol className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Capture narratives",
                body: "Guided interviews collect lived experiences from beneficiaries, citizens, or frontline workers.",
              },
              {
                title: "Attach metadata",
                body: "Demographic, geographic, and program information is recorded alongside each story.",
              },
              {
                title: "AI-assisted coding",
                body: "Machine learning models classify themes, outcomes, and patterns across narratives.",
              },
              {
                title: "Generate datasets",
                body: "Thousands of narratives become analyzable datasets for policy evaluation and research.",
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="font-body text-xs tracking-[0.15em] uppercase text-amber mt-0.5 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-body text-sm font-semibold text-cream mb-1">{step.title}</p>
                  <p className="font-body text-cream/70 text-sm leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

const QUOTE = {
  text: "These are not testimonials. They are evidence — grounded in lived reality and structured so they can be analysed alongside quantitative data.",
  context: "Rootstory Manifesto",
};

const EVIDENCE_POINTS = [
  "Structured micro-narratives with verified metadata",
  "Cross-referenced across demographic and geographic tags",
  "Exportable in formats compatible with major analysis tools",
  "Longitudinal capability — track the same community over time",
  "Ethically collected with informed consent at every step",
];

const Evidence = () => {
  return (
    <section id="evidence" className="py-28" style={{ background: "hsl(var(--cream-dark))" }}>
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Quote */}
          <div>
            <div
              className="relative p-12 rounded-sm"
              style={{ background: "hsl(var(--forest-deep))" }}
            >
              <div
                className="absolute top-8 left-10 font-display text-8xl leading-none"
                style={{ color: "hsl(var(--amber) / 0.2)" }}
              >
                "
              </div>
              <blockquote className="relative z-10 font-display text-xl md:text-2xl font-medium italic text-cream leading-relaxed mb-8">
                {QUOTE.text}
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-amber" />
                <span className="font-body text-xs tracking-[0.15em] uppercase text-amber/85">
                  {QUOTE.context}
                </span>
              </div>
            </div>
          </div>

          {/* Evidence points */}
          <div>
            <div className="inline-flex items-center gap-2.5 mb-6">
              <div className="w-6 h-px bg-accent" />
              <span className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">
                The Standard
              </span>
            </div>
            <h2 className="font-display text-4xl font-medium text-foreground leading-tight mb-10">
              Research-grade narrative datasets.
            </h2>
            <ul className="space-y-5">
              {EVIDENCE_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-body text-foreground/80 leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Evidence;

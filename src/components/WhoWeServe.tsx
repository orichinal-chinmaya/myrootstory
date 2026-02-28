const CLIENTS = [
  {
    type: "Governments",
    description:
      "Monitor how policies travel from legislation into daily life. Understand adoption, resistance, and unintended consequences at household level.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M4 28V14L16 4l12 10v14H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="12" y="20" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    type: "Foundations",
    description:
      "Demonstrate impact beyond output metrics. Capture the texture of change — how dignity, aspiration, and agency shift over the life of a programme.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 8v8l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    type: "Development Organisations",
    description:
      "Complement your quantitative baseline with structured narrative datasets. Hear directly how economic shifts are experienced within communities.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 26c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 26c0-3.866 2.686-7 6-7M30 26c0-3.866-2.686-7-6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const WhoWeServe = () => {
  return (
    <section id="who-we-serve" className="py-28 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-start">
          {/* Left */}
          <div className="lg:sticky lg:top-32">
            <div className="inline-flex items-center gap-2.5 mb-6">
              <div className="w-6 h-px bg-accent" />
              <span className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">
                Who We Serve
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-medium text-foreground leading-tight mb-6">
              Built for those who shape systems.
            </h2>
            <p className="font-body text-muted-foreground leading-relaxed">
              Rootstory does not replace surveys or statistics. It fills the space they
              cannot reach.
            </p>
          </div>

          {/* Right — client types */}
          <div className="space-y-px border border-border rounded-sm overflow-hidden">
            {CLIENTS.map((client) => (
              <div
                key={client.type}
                className="flex gap-8 p-10 bg-card hover:bg-secondary/50 transition-colors duration-300 group cursor-default"
              >
                <div className="flex-shrink-0 text-accent/60 group-hover:text-accent transition-colors duration-300 mt-1">
                  {client.icon}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                    {client.type}
                  </h3>
                  <p className="font-body text-muted-foreground text-sm leading-relaxed">
                    {client.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhoWeServe;

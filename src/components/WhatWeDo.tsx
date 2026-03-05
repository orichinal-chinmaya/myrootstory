const PILLARS = [
  {
    number: "01",
    title: "Listen at Scale",
    description:
      "Adaptive AI interviews in local languages capture structured, first-person accounts from thousands of participants simultaneously — without losing context or dignity.",
    tag: "AI-guided conversations",
  },
  {
    number: "02",
    title: "Structure the Story",
    description:
      "Every narrative is tagged, validated, and structured by trained analysts. What emerges is not just testimony — it is evidence, grounded in lived reality.",
    tag: "Rigorous tagging & validation",
  },
  {
    number: "03",
    title: "Analyse Alongside Data",
    description:
      "Rootstory datasets integrate with quantitative research. Policymakers can see not only what changed, but how change moved through households and communities.",
    tag: "Quantitative integration",
  },
];

const WhatWeDo = () => {
  return (
    <section id="how-it-works" className="py-28 bg-background">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="max-w-2xl mb-20">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-6 h-px bg-accent" />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">
              What We Do
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-medium text-foreground leading-tight mb-6">
            Making listening a form of infrastructure.
          </h2>
          <p className="font-body text-muted-foreground text-lg leading-relaxed">
            Rootstory fills the space surveys cannot reach: how stability feels, how money
            circulates, how decisions change inside a home, how dignity or risk shifts over time.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid md:grid-cols-3 gap-0 border border-border rounded-sm overflow-hidden">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.number}
              className={`p-10 group hover:bg-forest-deep hover:text-primary-foreground transition-colors duration-400 cursor-default ${
                i < PILLARS.length - 1 ? "border-r border-border" : ""
              }`}
              style={{ transition: "background-color 0.4s ease, color 0.4s ease" }}
            >
              <div className="font-display text-5xl font-medium text-accent/70 group-hover:text-amber/80 mb-8 transition-colors duration-400">
                {pillar.number}
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary-foreground mb-4 transition-colors duration-400">
                {pillar.title}
              </h3>
              <p className="font-body text-muted-foreground group-hover:text-primary-foreground/70 text-sm leading-relaxed mb-8 transition-colors duration-400">
                {pillar.description}
              </p>
              <span className="inline-block font-body text-xs tracking-wide uppercase border border-border group-hover:border-cream/30 text-muted-foreground group-hover:text-cream/70 px-3 py-1.5 rounded-full transition-colors duration-400">
                {pillar.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatWeDo;

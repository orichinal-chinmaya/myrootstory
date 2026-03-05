import { Link } from "react-router-dom";

const Blog = () => {
  return (
    <div className="min-h-screen bg-cream relative overflow-x-hidden">
      {/* Horizontal stripe texture */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, hsl(var(--forest-deep) / 0.04) 0px, hsl(var(--forest-deep) / 0.04) 1px, transparent 1px, transparent 10px)",
        }}
      />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-12 py-5 bg-cream/92 backdrop-blur-md border-b border-amber-muted/30">
        <Link to="/" className="font-display text-xl font-semibold text-foreground">
          root<span className="text-accent">story</span>
        </Link>
        <span className="font-body text-xs tracking-[0.2em] uppercase text-amber-muted">
          Story &amp; Philosophy
        </span>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-[820px] mx-auto px-12 pb-32">
        {/* Hero */}
        <div className="pt-20 pb-16">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-10 opacity-0 animate-fade-up animation-delay-100">
            <span className="font-body text-[10.5px] tracking-[0.24em] uppercase text-accent">
              On Bhajju Shyam, the Gond gaze &amp; the evidence in lived experience
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, hsl(var(--accent)), transparent)" }} />
          </div>

          {/* Title */}
          <h1
            className="font-display font-light leading-[0.97] tracking-tight text-foreground mb-6 opacity-0 animate-fade-up animation-delay-200"
            style={{ fontSize: "clamp(52px, 9vw, 96px)" }}
          >
            <span className="block italic text-amber-muted font-light">The</span>
            <span className="block font-bold not-italic text-foreground">Rootstory</span>
            <span className="block italic font-light text-accent">of the</span>
            <span className="block font-bold text-foreground" style={{ WebkitTextStroke: "0.5px hsl(var(--foreground))" }}>Rooster</span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg italic text-amber-muted max-w-xl leading-relaxed mb-0 opacity-0 animate-fade-up animation-delay-300">
            How a Gond artist from central India painted the philosophy behind Rootstory — before we had words for it.
          </p>

          {/* Feather colour band */}
          <div className="flex gap-1.5 mt-11 mb-16 opacity-0 animate-fade-up animation-delay-400">
            {[
              "hsl(var(--accent))",
              "hsl(var(--forest-mid))",
              "hsl(152 25% 35%)",
              "hsl(var(--amber-muted))",
              "hsl(var(--forest-deep))",
              "hsl(var(--accent) / 0.5)",
            ].map((c, i) => (
              <div key={i} className="h-[3px] flex-1 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>

        {/* Attribution chip */}
        <div className="inline-flex items-center gap-2.5 border border-amber-muted/40 px-4 py-3 mb-14 opacity-0 animate-fade-up animation-delay-500">
          <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
          <p className="font-body text-[11.5px] leading-relaxed text-amber-muted m-0">
            The image above is <strong className="text-accent">Big Ben as Rooster</strong> from{" "}
            <em>The London Jungle Book</em> (Tara Books, 2004) by Pardhan Gond artist{" "}
            <strong className="text-accent">Bhajju Shyam</strong>. In his world, a rooster announces time. In London,
            a clock tower does. He merged them — not as a metaphor, but as a statement about whose knowledge counts.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-0 opacity-0 animate-fade-up" style={{ animationDelay: "0.85s" }}>
          <p className="text-xl leading-[1.78] text-foreground mb-8" style={{ fontSize: "20px", lineHeight: "1.78" }}>
            In 2002, Bhajju Shyam — a Pardhan Gond artist from the forests of central India — was commissioned to paint
            the walls of an Indian restaurant in London.
          </p>
          <p className="mb-8" style={{ fontSize: "20px", lineHeight: "1.78", color: "hsl(var(--foreground))" }}>
            The book that followed, published by Tara Books, became a classic.
          </p>
        </div>

        {/* Section break */}
        <SectionBreak label="The reversal of the gaze" delay="1.05s" />

        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "1.1s" }}>
          <p className="mb-8" style={{ fontSize: "20px", lineHeight: "1.78", color: "hsl(var(--foreground))" }}>
            What made <em className="text-accent">The London Jungle Book</em> genuinely radical was who got to tell the
            story. For centuries, the Gond had been the subjects of someone else's account — studied, recorded, reported
            on by outsiders. Bhajju's own grandfather had been a servant to the British anthropologist Verrier Elwin,
            who spent his career writing about Gond life. Now Bhajju reversed the lens. He became the anthropologist.
            London became the exotic jungle. English people, who come out at night and disappear by day, are bats. The
            Underground is a worm in the earth's belly.
          </p>
          <p className="mb-8" style={{ fontSize: "20px", lineHeight: "1.78", color: "hsl(var(--foreground))" }}>
            Bhajju told the book's editor: "Elwin sahib wrote about my tribe. Now it is my turn to write about his."
            In the Gond tradition, scale is not realistic. What is important gets more space. A train journey might be
            painted with a small train, because the train is not the point — the emotion of travelling is the point.
          </p>
        </div>

        {/* Section break */}
        <SectionBreak label="Why this is also Rootstory's philosophy" delay="1.2s" />

        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "1.25s" }}>
          <p className="mb-8" style={{ fontSize: "20px", lineHeight: "1.78", color: "hsl(var(--foreground))" }}>
            Rootstory is built on a simple belief: change is best understood through the lives that experience it — not
            just the numbers that report it. When a government programme reaches a household, something happens that the
            data cannot fully capture. The way a transfer felt when it arrived. The conversation it started between
            partners. The decision it made possible — or the form-filling humiliation that came attached to it. Whether
            your neighbour knew about it before you did, and what that told you about your standing in the community.
          </p>
          <p className="mb-8" style={{ fontSize: "20px", lineHeight: "1.78", color: "hsl(var(--foreground))" }}>
            What happens when a policy reaches its last mile has never been visible in a reliable way, at scale, in the
            language people think in, without distorting them through someone else's lens.
          </p>
        </div>

        {/* Pull quote */}
        <blockquote
          className="border-l-[3px] border-accent pl-8 py-2 my-12 relative opacity-0 animate-fade-up"
          style={{ animationDelay: "1.35s" }}
        >
          <span
            className="font-display absolute -top-6 left-1 text-[90px] leading-none opacity-40"
            style={{ color: "hsl(var(--amber-muted))" }}
          >
            "
          </span>
          <p
            className="font-display text-2xl italic font-normal leading-snug text-foreground m-0"
            style={{ fontSize: "25px", lineHeight: "1.48" }}
          >
            A survey can tell you whether someone received a transfer. It cannot tell you what the transfer meant inside
            the home. It cannot tell you what the support meant from their lens.
          </p>
        </blockquote>

        {/* Section break */}
        <SectionBreak label="Two ways of knowing — neither enough alone" delay="1.48s" />

        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "1.52s" }}>
          <p className="mb-8" style={{ fontSize: "20px", lineHeight: "1.78", color: "hsl(var(--foreground))" }}>
            When Bhajju added the rooster, it did not replace Big Ben. Precision and organic knowledge are not opposites
            in this painting — they help us see the full picture. They are two languages that, when spoken together,
            describe something neither can say alone.
          </p>
          <p className="mb-8" style={{ fontSize: "20px", lineHeight: "1.78", color: "hsl(var(--foreground))" }}>
            This is how Rootstory works. We do not replace surveys or statistics. We fill the space they cannot reach:
            how stability feels, how money circulates, how decisions change inside a home, how dignity or risk shifts
            over time. Our technology conducts guided, respectful conversations in local languages — turning thousands of
            individual experiences into verified micro-narratives that can sit alongside quantitative data. The rooster's
            voice, structured so it can be read next to the clock's numbers. Both forms of evidence. Both necessary.{" "}
            <strong className="font-semibold text-amber-muted">The difference is who gets to speak.</strong>
          </p>
        </div>

        {/* Closing dark panel */}
        <div
          className="relative overflow-hidden mt-18 px-14 py-16 opacity-0 animate-fade-up"
          style={{
            background: "hsl(var(--forest-deep))",
            margin: "72px -24px 0",
            animationDelay: "1.65s",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 10px)",
            }}
          />
          <div className="relative z-10">
            <div className="w-9 h-0.5 bg-accent mb-8" />
            <p style={{ fontSize: "19.5px", lineHeight: "1.74", color: "hsl(var(--cream) / 0.85)", marginBottom: "24px" }}>
              The grassroots gaze is not a softer version of the institutional view.{" "}
              <span className="italic text-amber-muted">It is a different kind of rigour</span> — one that captures what
              actually happened inside a life when a policy passed through it. It is the difference between knowing a
              programme reached a household and knowing what the household did with it, and why, and how it felt, and
              what it changed.
            </p>
            <p style={{ fontSize: "19.5px", lineHeight: "1.74", color: "hsl(var(--cream) / 0.85)", marginBottom: "24px" }}>
              Bhajju Shyam did not need an institution to validate his reading of London. He brought his own system of
              knowledge — one refined over generations, rich with its own precision — and applied it to a new place. The
              result was not a naïve view. It was a more complete one.
            </p>
            <p style={{ fontSize: "19.5px", lineHeight: "1.74", color: "hsl(var(--cream) / 0.85)", marginBottom: "24px" }}>
              The rooster crows at dawn because that is its nature, its time, its signal. It does not wait for the clock
              to authorise it.
            </p>
            <p style={{ fontSize: "19.5px", lineHeight: "1.74", color: "hsl(var(--cream) / 0.85)", marginBottom: "0" }}>
              <strong style={{ color: "hsl(var(--cream))", fontWeight: 500 }}>
                Our goal is to make listening a form of infrastructure.
              </strong>
            </p>
            <p
              className="font-display italic font-light"
              style={{
                fontSize: "clamp(26px, 4vw, 38px)",
                lineHeight: "1.25",
                color: "hsl(var(--amber-muted))",
                marginTop: "44px",
                paddingTop: "36px",
                borderTop: "1px solid hsl(var(--accent) / 0.25)",
              }}
            >
              Change is best understood through the lives that experience it.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-18 flex items-center justify-between opacity-0 animate-fade-up" style={{ animationDelay: "2.2s", marginTop: "72px" }}>
          <div className="font-body text-[10.5px] tracking-[0.26em] uppercase text-amber-muted/60 leading-loose">
            <div>rootstory</div>
            <div>rootstory.io</div>
          </div>
          <div className="w-5 h-5 border border-amber-muted/30 rounded-full" />
        </div>
      </div>
    </div>
  );
};

const SectionBreak = ({ label, delay }: { label: string; delay: string }) => (
  <div
    className="flex items-center gap-3.5 my-14 opacity-0 animate-fade-up"
    style={{ animationDelay: delay }}
  >
    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
    <span className="font-body text-[10.5px] tracking-[0.24em] uppercase text-accent">{label}</span>
    <div
      className="flex-1 h-px"
      style={{ background: "linear-gradient(to right, hsl(var(--accent) / 0.3), transparent)" }}
    />
  </div>
);

export default Blog;

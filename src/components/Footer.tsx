const Footer = () => {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="font-display text-lg font-semibold text-foreground">
            Root<span className="text-accent">story</span>
          </span>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Narrative intelligence for social systems.
          </p>
        </div>
        <div className="flex gap-8">
          {["Privacy", "Ethics Policy", "Contact"].map((link) => (
            <a
              key={link}
              href="#"
              className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
        <p className="font-body text-xs text-muted-foreground">
          © {new Date().getFullYear()} Rootstory. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

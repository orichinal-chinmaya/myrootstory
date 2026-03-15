import rootstoryIcon from "@/assets/rootstory-icon.png";

const Footer = () => {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <img src={rootstoryIcon} alt="Rootstory" className="w-7 h-7 rounded-md" />
            <span className="font-display text-lg font-semibold text-foreground">
              root<span className="text-accent">story</span>
            </span>
          </div>
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
          © {new Date().getFullYear()} Orichinal Labs Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

import { useState, useEffect } from "react";

const NAV_LINKS = ["How It Works", "Who We Serve", "Evidence", "About"];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-forest-deep/95 backdrop-blur-md border-b border-primary/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between py-5 px-6">
        <span className="font-display text-cream text-xl font-semibold tracking-tight">
          root<span className="text-amber">story</span>
        </span>
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
              className="font-body text-sm text-cream/70 hover:text-cream transition-colors duration-200"
            >
              {link}
            </a>
          ))}
        </div>
        <a
          href="#contact"
          className="hidden md:inline-flex items-center gap-2 font-body text-sm font-medium bg-amber text-forest-deep px-5 py-2.5 rounded-sm hover:bg-amber/90 transition-colors duration-200"
        >
          Request a Demo
        </a>
      </div>
    </nav>
  );
};

export default Navbar;

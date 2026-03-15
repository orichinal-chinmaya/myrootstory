import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import rootstoryIcon from "@/assets/rootstory-icon.png";

const NAV_LINKS = ["How It Works", "Who We Serve", "Evidence", "About"];


const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close menu on scroll
  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrolled]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled || menuOpen
            ? "bg-forest-deep/95 backdrop-blur-md border-b border-primary/20"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between py-5 px-6">
          <div className="flex items-center gap-2">
            <img src={rootstoryIcon} alt="Rootstory" className="w-7 h-7 rounded-md" />
            <span className="font-display text-cream text-[22px] font-semibold tracking-tight">
              root<span className="text-amber">story</span>
            </span>
          </div>

          {/* Desktop links */}
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
            <Link
              to="/blog/rootstory-of-the-rooster"
              className="font-body text-sm text-cream/70 hover:text-cream transition-colors duration-200"
            >
              Journal
            </Link>
            <Link
              to="/demo"
              className="font-body text-sm text-cream/70 hover:text-cream transition-colors duration-200"
            >
              Demo
            </Link>
          </div>

          <a
            href="#contact"
            className="hidden md:inline-flex items-center gap-2 font-body text-sm font-medium bg-amber text-forest-deep px-5 py-2.5 rounded-sm hover:bg-amber/90 transition-colors duration-200"
          >
            Request a Demo
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-cream p-1"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-forest-deep/98 border-t border-primary/20 px-6 pb-6 flex flex-col gap-5">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
                className="font-body text-sm text-cream/70 hover:text-cream transition-colors duration-200"
                onClick={() => setMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <Link
              to="/blog/rootstory-of-the-rooster"
              className="font-body text-sm text-cream/70 hover:text-cream transition-colors duration-200"
              onClick={() => setMenuOpen(false)}
            >
              Journal
            </Link>
            <Link
              to="/demo"
              className="font-body text-sm text-cream/70 hover:text-cream transition-colors duration-200"
              onClick={() => setMenuOpen(false)}
            >
              Demo
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center font-body text-sm font-medium bg-amber text-forest-deep px-5 py-2.5 rounded-sm hover:bg-amber/90 transition-colors duration-200 mt-2"
              onClick={() => setMenuOpen(false)}
            >
              Request a Demo
            </a>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;

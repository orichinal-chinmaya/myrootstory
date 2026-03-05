import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface FormData {
  name: string;
  organisation: string;
  email: string;
  message: string;
}

const CTA = () => {
  const [form, setForm] = useState<FormData>({
    name: "",
    organisation: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({
        title: "Please fill in the required fields",
        description: "Name, email, and project description are required.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({
        title: "Invalid email address",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: form.name.trim(),
          organisation: form.organisation.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        },
      });

      if (error) throw error;

      setSubmitted(true);
    } catch (err) {
      console.error("Submission error:", err);
      toast({
        title: "Something went wrong",
        description: "Your enquiry couldn't be sent. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-28 bg-background">
      <Toaster />
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-6 h-px bg-amber" />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-amber/80">
              Get Started
            </span>
            <div className="w-6 h-px bg-amber" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium text-foreground leading-tight mb-8">
            Ready to listen at scale?
          </h2>
          <p className="font-body text-foreground/65 text-lg leading-relaxed mb-12 max-w-xl mx-auto">
            We work with governments, foundations, and research organisations.
            Tell us about your project and we'll design a listening study that fits your evidence needs.
          </p>

          {submitted ? (
            <div className="rounded-sm p-12 text-center border border-border bg-card">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "hsl(var(--amber) / 0.15)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-amber">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="font-display text-2xl font-medium text-foreground mb-3">Enquiry sent</h3>
              <p className="font-body text-foreground/65 text-base leading-relaxed max-w-sm mx-auto">
                Thank you for reaching out. We'll be in touch shortly.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-sm p-10 text-left border border-border bg-card"
            >
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block font-body text-xs tracking-[0.1em] uppercase text-foreground/60 mb-2">
                    Name <span className="text-amber">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                    className="w-full bg-background border border-border rounded-sm px-4 py-3 font-body text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-amber/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-body text-xs tracking-[0.1em] uppercase text-foreground/60 mb-2">
                    Organisation
                  </label>
                  <input
                    type="text"
                    name="organisation"
                    value={form.organisation}
                    onChange={handleChange}
                    placeholder="Your organisation"
                    className="w-full bg-background border border-border rounded-sm px-4 py-3 font-body text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-amber/60 transition-colors"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block font-body text-xs tracking-[0.1em] uppercase text-foreground/60 mb-2">
                  Email <span className="text-amber">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@organisation.org"
                  required
                  className="w-full bg-background border border-border rounded-sm px-4 py-3 font-body text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-amber/60 transition-colors"
                />
              </div>
              <div className="mb-8">
                <label className="block font-body text-xs tracking-[0.1em] uppercase text-foreground/60 mb-2">
                  Tell us about your project <span className="text-amber">*</span>
                </label>
                <textarea
                  rows={4}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="What are you trying to understand? What populations? What's the timeline?"
                  required
                  className="w-full bg-background border border-border rounded-sm px-4 py-3 font-body text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-amber/60 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-amber text-forest-deep font-body font-medium text-sm px-10 py-3.5 rounded-sm hover:bg-amber/90 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    Send Enquiry
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTA;

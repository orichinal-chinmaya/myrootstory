import { useState } from "react";
import { Link } from "react-router-dom";
import RootstoryInterview from "@/components/RootstoryInterview";

const DEMO_CODE = "rootstorydemo";

const Demo = () => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim().toLowerCase() === DEMO_CODE) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect access code. Please try again.");
    }
  }

  if (unlocked) {
    return <RootstoryInterview />;
  }

  return (
    <div className="min-h-screen bg-[#F9F7F4] flex flex-col items-center justify-center px-4" style={{ fontFamily: "Georgia, serif" }}>
      <Link
        to="/"
        className="absolute top-6 left-6 text-sm text-[#8A8A9A] hover:text-[#1A1A2E] transition-colors"
      >
        ← Back
      </Link>

      <div className="w-full max-w-md bg-white border border-[#D8D4CC] rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="w-12 h-12 rounded-full bg-[#1A7A7A] flex items-center justify-center">
          <span className="text-white text-xl font-bold">R</span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-normal tracking-wide text-[#1A1A2E]">
            root<span className="text-[#C47A0A]">story</span>
          </h1>
          <p className="text-sm text-[#8A8A9A] mt-1">Interactive Demo</p>
        </div>

        <div className="w-8 h-0.5 bg-[#A8D4D4] rounded" />

        <p className="text-sm text-[#3A3A5C] text-center leading-relaxed">
          Enter your access code to explore the Rootstory interview tool — a live demonstration of adaptive AI-assisted narrative capture.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <label className="text-xs font-bold text-[#8A8A9A] tracking-wider uppercase">
            Access Code
          </label>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(""); }}
            placeholder="Enter access code"
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-[#D8D4CC] text-[#1A1A2E] text-sm outline-none focus:border-[#1A7A7A] transition-colors bg-white"
            style={{ fontFamily: "Georgia, serif" }}
          />
          {error && (
            <p className="text-xs text-[#B03020]">{error}</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-[#1A7A7A] text-white text-sm font-medium hover:bg-[#0F5555] transition-colors"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Enter Demo →
          </button>
        </form>

        <p className="text-xs text-[#8A8A9A] text-center">
          Access code provided by Rootstory team
        </p>
      </div>
    </div>
  );
};

export default Demo;

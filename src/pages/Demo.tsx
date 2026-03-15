import { useState } from "react";
import { Link } from "react-router-dom";
import RootstoryInterview from "@/components/RootstoryInterview";
import QuestionEditor from "@/components/QuestionEditor";

const DEMO_CODE  = "rootstorydemo";
const ADMIN_CODE = "Orichinal2026!";

type Tab = "demo" | "admin";

const GateCard = ({
  title,
  subtitle,
  code,
  onUnlock,
}: {
  title: string;
  subtitle: string;
  code: string;
  onUnlock: () => void;
}) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() === code) {
      onUnlock();
    } else {
      setError("Incorrect access code. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md bg-white border border-[#D8D4CC] rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6">
      <div className="w-12 h-12 rounded-full bg-[#1A7A7A] flex items-center justify-center">
        <span className="text-white text-xl font-bold">R</span>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-normal tracking-wide text-[#1A1A2E]">
          root<span className="text-[#C47A0A]">story</span>
        </h1>
        <p className="text-sm text-[#8A8A9A] mt-1">{subtitle}</p>
      </div>
      <div className="w-8 h-0.5 bg-[#A8D4D4] rounded" />
      <p className="text-sm text-[#3A3A5C] text-center leading-relaxed">
        {title === "Interactive Demo"
          ? "Enter your access code to explore the Rootstory interview tool — a live demonstration of adaptive AI-assisted narrative capture."
          : "Enter the admin code to access the question editor and scoring configuration."}
      </p>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <label className="text-xs font-bold text-[#8A8A9A] tracking-wider uppercase">
          Access Code
        </label>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          placeholder="Enter access code"
          autoFocus
          className="w-full px-4 py-3 rounded-lg border border-[#D8D4CC] text-[#1A1A2E] text-sm outline-none focus:border-[#1A7A7A] transition-colors bg-white"
          style={{ fontFamily: "Georgia, serif" }}
        />
        {error && <p className="text-xs text-[#B03020]">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-[#1A7A7A] text-white text-sm font-medium hover:bg-[#0F5555] transition-colors"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Enter →
        </button>
      </form>
      <p className="text-xs text-[#8A8A9A] text-center">
        Access code provided by Rootstory team
      </p>
    </div>
  );
};

const Demo = () => {
  const [activeTab, setActiveTab] = useState<Tab>("demo");
  const [demoUnlocked,  setDemoUnlocked]  = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Once unlocked, render the full-screen tool
  if (activeTab === "demo"  && demoUnlocked)  return <RootstoryInterview />;
  if (activeTab === "admin" && adminUnlocked) return <QuestionEditor />;

  return (
    <div
      className="min-h-screen bg-[#F9F7F4] flex flex-col items-center justify-center px-4"
      style={{ fontFamily: "Georgia, serif" }}
    >
      <Link
        to="/"
        className="absolute top-6 left-6 text-sm text-[#8A8A9A] hover:text-[#1A1A2E] transition-colors"
      >
        ← Back
      </Link>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-8 bg-white border border-[#D8D4CC] rounded-lg p-1">
        {(["demo", "admin"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-md text-sm transition-colors"
            style={{
              fontFamily: "Georgia, serif",
              background: activeTab === tab ? "#1A7A7A" : "transparent",
              color: activeTab === tab ? "#fff" : "#8A8A9A",
            }}
          >
            {tab === "demo" ? "Demo" : "Admin"}
          </button>
        ))}
      </div>

      {activeTab === "demo" ? (
        <GateCard
          title="Interactive Demo"
          subtitle="Interactive Demo"
          code={DEMO_CODE}
          onUnlock={() => setDemoUnlocked(true)}
        />
      ) : (
        <GateCard
          title="Admin"
          subtitle="Question Editor"
          code={ADMIN_CODE}
          onUnlock={() => setAdminUnlocked(true)}
        />
      )}
    </div>
  );
};

export default Demo;

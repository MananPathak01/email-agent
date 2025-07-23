import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import Header from "@/components/ui/Header";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Agent data
const agents = [
  {
    name: "Clara – HR Agent",
    key: "clara",
    iframe: <iframe src="https://my.spline.design/genkubgreetingrobot-jWbSX5pWT9ic0RFOUublV9hf/" frameBorder="0" width="100%" height="100%" style={{ minHeight: 350, borderRadius: 24, background: 'transparent' }} allow="autoplay; fullscreen" title="Clara HR Agent" />, 
    appearance: "Soft, welcoming design with human-like features, clipboard or headset accessory",
    animation: "Slow head tilt, blink, gentle breathing, idle writing motion",
    personality: "Empathetic, organized, approachable",
    tasks: [
      "Answer HR policy questions",
      "Approve/reject leave requests",
      "Find context from previous emails",
      "Update personal records",
      "Onboard/offboard employees"
    ],
    comingSoon: false
  },
  {
    name: "Dex – IT Agent",
    key: "dex",
    iframe: <div className="flex items-center justify-center h-full w-full"><div className="w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-pulse">Dex</div></div>,
    appearance: "Futuristic, glowing accents, glasses or visor, slight digital pixelation",
    animation: "Circuit lines pulsing, screen flashes, typing gesture",
    personality: "Efficient, analytical, technical",
    tasks: [
      "Reset passwords",
      "Provision accounts",
      "Troubleshoot IT issues",
      "Monitor system health"
    ],
    comingSoon: true
  },
  {
    name: "Nova – Sales Agent",
    key: "nova",
    iframe: <div className="flex items-center justify-center h-full w-full"><div className="w-40 h-40 bg-gradient-to-br from-pink-500 to-yellow-400 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">Nova</div></div>,
    appearance: "Sleek suit design with tablet or charts hovering",
    animation: "Hand gesture pointing to rising graphs, briefcase open-close loop",
    personality: "Energetic, persuasive, confident",
    tasks: [
      "Generate sales reports",
      "Track leads",
      "Send follow-up emails",
      "Forecast revenue"
    ],
    comingSoon: true
  },
  {
    name: "Echo – Marketing Agent",
    key: "echo",
    iframe: <div className="flex items-center justify-center h-full w-full"><div className="w-40 h-40 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white text-2xl font-bold animate-spin">Echo</div></div>,
    appearance: "Vibrant colors, floating icons (megaphone, social media logos)",
    animation: "Icons orbiting gently, scrolling effect on a display board",
    personality: "Creative, expressive, trend-savvy",
    tasks: [
      "Schedule social posts",
      "Analyze campaign performance",
      "Suggest content ideas",
      "Monitor brand mentions"
    ],
    comingSoon: true
  }
];

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [agentIndex, setAgentIndex] = useState(0);
  const agent = agents[agentIndex];
  const handlePrev = () => setAgentIndex((i) => (i === 0 ? agents.length - 1 : i - 1));
  const handleNext = () => setAgentIndex((i) => (i === agents.length - 1 ? 0 : i + 1));

  const handleSignIn = () => setLocation("/login");
  const handleSignUp = () => setLocation("/signup");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#e0eaff] via-[#f5f8ff] to-[#dbeafe] flex flex-col relative overflow-hidden">
      <Header />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-40 pb-24 relative">
        {/* Blurred background shapes */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-200 opacity-40 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-200 opacity-30 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            AI that helps you day-to-day <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">workflows</span>
          </h1>
          <p className="text-lg sm:text-2xl text-gray-700 mb-10 font-medium">
            Transform your team's HR, IT, sales, and marketing workflows with AI-powered agents that automate tasks, answer questions, and deliver instant insights, all from your inbox.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              size="lg"
              variant="ghost"
              className="bg-black text-white rounded-full px-8 py-4 text-lg font-semibold shadow-lg hover:bg-gray-900"
              onClick={handleSignUp}
            >
              Get Started Free
            </Button>
          </div>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span>No credit card required</span>
            <span>•</span>
            <span>14-day free trial</span>
          </div>
        </div>
      </section>

      {/* Agent Carousel Section (now second section) */}
      <section className="py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10 text-center">Meet Our AI Agents</h2>
        <div className="max-w-5xl mx-auto px-4 relative flex flex-col md:flex-row items-center gap-10">
          {/* Left Arrow, vertically centered, outside the agent+details area */}
          <button onClick={handlePrev} className="hidden md:flex items-center justify-center absolute -left-16 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow rounded-full p-4 z-20 border border-gray-200 transition text-3xl">
            <ArrowLeft className="h-10 w-10 text-gray-700" />
          </button>
          {/* Animation/Agent Visual */}
          <div className="w-full md:w-1/2 flex items-center justify-center min-h-[350px]">
            <div className="relative w-full max-w-xl h-[350px] flex items-center justify-center transition-all duration-500">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full bg-[#18191A] rounded-3xl shadow-inner" />
              </div>
              <div className="relative w-full h-full flex items-center justify-center z-10">
                {agent.iframe}
                {agent.comingSoon && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                    <span className="text-xl font-semibold text-gray-700">Coming Soon</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Info Panel */}
          <div className="w-full md:w-1/2 max-w-xl bg-white/80 rounded-2xl shadow-lg p-8 flex flex-col gap-4 min-h-[350px] justify-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{agent.name}</h3>
            <div className="text-gray-700 mb-2"><span className="font-semibold">What {agent.name.split('–')[0].trim()} can do:</span></div>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              {agent.tasks.map((task, i) => (
                <li key={i}>{task}</li>
              ))}
            </ul>
            {agent.comingSoon && (
              <div className="mt-4 text-blue-600 font-semibold">Coming Soon</div>
            )}
          </div>
          {/* Right Arrow, vertically centered, outside the agent+details area */}
          <button onClick={handleNext} className="hidden md:flex items-center justify-center absolute -right-16 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow rounded-full p-4 z-20 border border-gray-200 transition text-3xl">
            <ArrowRight className="h-10 w-10 text-gray-700" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10 text-center">Everything You Need for Intelligent Email Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="bg-white/80 rounded-2xl shadow p-8 flex items-start space-x-4">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-7 w-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 19V6M5 12l7-7 7 7"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI-Powered Email Processing</h3>
              <p className="text-gray-600">Automatically analyze and categorize onboarding emails with advanced AI.</p>
            </div>
          </div>
          {/* Feature 2 */}
          <div className="bg-white/80 rounded-2xl shadow p-8 flex items-start space-x-4">
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-7 w-7 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Contextual Memory</h3>
              <p className="text-gray-600">Remembers conversations and context to provide consistent, intelligent responses.</p>
            </div>
          </div>
          {/* Feature 3 */}
          <div className="bg-white/80 rounded-2xl shadow p-8 flex items-start space-x-4">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18M12 3v18"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Workflow Automation</h3>
              <p className="text-gray-600">Transforms emails into actionable tasks and automated workflows.</p>
            </div>
          </div>
          {/* Feature 4 */}
          <div className="bg-white/80 rounded-2xl shadow p-8 flex items-start space-x-4">
            <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="h-7 w-7 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Chat-Style Interface</h3>
              <p className="text-gray-600">Natural conversation interface for managing your email workflows.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-white/80 to-blue-50/60">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Teams Choose EmailAgent AI</h2>
          <ul className="space-y-4 max-w-xl mx-auto">
            {[
              "Reduce email response time ",
              "Automate repetitive onboarding tasks",
              "Never miss important follow-ups",
              "Smart prioritization and categorization",
              "Seamless Gmail integration",
              "Real-time collaboration features"
            ].map((benefit, idx) => (
              <li key={idx} className="flex items-center space-x-3">
                <span className="inline-block w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </span>
                <span className="text-gray-700 text-lg">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Demo/Chat Preview Section */}
      <section className="py-20 bg-transparent">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white/80 rounded-2xl shadow-2xl p-10 flex flex-col items-center">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="space-y-4 w-full">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600" />
                </span>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm text-gray-800">
                      I've analyzed 12 new onboarding emails and created 8 tasks. High priority: John's equipment setup needs attention.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 justify-end">
                <div className="flex-1 max-w-xs">
                  <div className="bg-blue-600 text-white rounded-lg p-3">
                    <p className="text-sm">Generate response for John's equipment request</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">You</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-10 bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Bot className="h-7 w-7 text-blue-600" />
            <span className="text-lg font-bold text-white">AI Workforce</span>
          </div>
          <nav className="flex flex-wrap gap-6 text-gray-300 text-sm font-medium">
            <a href="/pricing" className="hover:text-white transition">Pricing</a>
            <a href="/help" className="hover:text-white transition">Help</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="/docs" className="hover:text-white transition">Docs</a>
          </nav>
          <div className="text-gray-500 text-xs text-center md:text-right">© 2025 AI Workforce. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
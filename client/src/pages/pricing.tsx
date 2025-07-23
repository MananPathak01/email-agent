import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import Header from "@/components/ui/Header";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <Header />
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-gray-600 mb-12 max-w-xl mx-auto">Choose the plan that fits your team's needs. No hidden fees, no surprises.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white/80 rounded-2xl shadow p-8 flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2">Free</h2>
            <div className="text-3xl font-bold mb-4">$0<span className="text-base font-normal">/mo</span></div>
            <ul className="text-gray-700 mb-6 space-y-2 text-left">
              <li>✔ 1 connected email account</li>
              <li>✔ Basic AI email analysis</li>
              <li>✔ Limited workflow automation</li>
              <li>✔ Community support</li>
            </ul>
            <Button className="w-full bg-blue-600 text-white rounded-full">Get Started</Button>
          </div>
          {/* Pro Plan */}
          <div className="bg-white/80 rounded-2xl shadow p-8 flex flex-col items-center border-2 border-blue-600">
            <h2 className="text-2xl font-semibold mb-2">Pro</h2>
            <div className="text-3xl font-bold mb-4">$29<span className="text-base font-normal">/mo</span></div>
            <ul className="text-gray-700 mb-6 space-y-2 text-left">
              <li>✔ Unlimited email accounts</li>
              <li>✔ Advanced AI & context memory</li>
              <li>✔ Full workflow automation</li>
              <li>✔ Priority support</li>
            </ul>
            <Button className="w-full bg-black text-white rounded-full">Start Free Trial</Button>
          </div>
        </div>
      </section>
      <footer className="w-full py-10 bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Bot className="h-7 w-7 text-blue-600" />
            <span className="text-lg font-bold text-white">EmailAgent AI</span>
          </div>
          <nav className="flex flex-wrap gap-6 text-gray-300 text-sm font-medium">
            <a href="/" className="hover:text-white transition">Home</a>
            <a href="/help" className="hover:text-white transition">Help</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="/docs" className="hover:text-white transition">Docs</a>
          </nav>
          <div className="text-gray-500 text-xs text-center md:text-right">© 2025 EmailAgent AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
} 
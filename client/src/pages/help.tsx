import { Bot } from "lucide-react";
import Header from "@/components/ui/Header";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <Header />
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Help & Support</h1>
        <p className="text-lg text-gray-600 mb-12 max-w-xl mx-auto">Find answers to common questions or reach out to our support team for help.</p>
        <div className="max-w-2xl mx-auto text-left space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">How do I connect my email account?</h2>
            <p className="text-gray-700">Go to your dashboard, click on 'Connect Email', and follow the OAuth prompts for Gmail. Your account will be securely linked in seconds.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">What does the AI agent do with my emails?</h2>
            <p className="text-gray-700">The AI only analyzes onboarding-related emails to automate tasks and responses. Your data is encrypted and never used for advertising or sold to third parties.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">How can I get more support?</h2>
            <p className="text-gray-700">You can contact our support team via the in-app chat or email us at support@emailagent.ai. We respond within 24 hours on business days.</p>
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
            <a href="/pricing" className="hover:text-white transition">Pricing</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="/docs" className="hover:text-white transition">Docs</a>
          </nav>
          <div className="text-gray-500 text-xs text-center md:text-right">© 2025 EmailAgent AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
} 
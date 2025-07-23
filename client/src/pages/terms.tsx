import { Bot } from "lucide-react";
import Header from "@/components/ui/Header";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <Header />
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Terms & Conditions</h1>
        <div className="max-w-2xl mx-auto text-left space-y-8 text-gray-700 text-base">
          <p>Welcome to EmailAgent AI. By using our service, you agree to the following terms and conditions. Please read them carefully.</p>
          <p>[Placeholder for detailed terms and conditions. You can add your own legal text here.]</p>
          <p>If you have any questions about these terms, please contact us at support@emailagent.ai.</p>
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
            <a href="/help" className="hover:text-white transition">Help</a>
            <a href="/docs" className="hover:text-white transition">Docs</a>
          </nav>
          <div className="text-gray-500 text-xs text-center md:text-right">© 2025 EmailAgent AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
} 
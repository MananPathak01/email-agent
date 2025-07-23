import { Bot } from "lucide-react";
import Header from "@/components/ui/Header";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <Header />
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Documentation</h1>
        <p className="text-lg text-gray-600 mb-12 max-w-xl mx-auto">Find guides, API references, and best practices for using EmailAgent AI.</p>
        <div className="max-w-2xl mx-auto text-left space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Getting Started</h2>
            <p className="text-gray-700">Learn how to set up your account, connect your email, and start automating onboarding workflows.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">API Reference</h2>
            <p className="text-gray-700">Explore our API endpoints and see how to integrate EmailAgent AI with your own tools.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">FAQ</h2>
            <p className="text-gray-700">Find answers to common questions about features, security, and more.</p>
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
            <a href="/help" className="hover:text-white transition">Help</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
          </nav>
          <div className="text-gray-500 text-xs text-center md:text-right">© 2025 EmailAgent AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
} 
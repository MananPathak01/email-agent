import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Header() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = () => setLocation("/login");
  const handleSignUp = () => setLocation("/signup");
  const handleDashboard = () => setLocation("/chat");

  const navLinks = [
    { label: "Features", onClick: () => setLocation("/#features") },
    { label: "Pricing", onClick: () => setLocation("/pricing") },
    { label: "Docs", onClick: () => setLocation("/docs") },
  ];

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-5xl rounded-full bg-white/80 shadow-lg backdrop-blur-md border border-gray-200 flex items-center justify-between px-4 md:px-8 py-3">
      {/* Logo/Brand */}
      <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setLocation("/")}> 
        <Bot className="h-7 w-7 text-blue-600" />
        <span className="text-lg font-bold text-gray-900">AI Workforce</span>
      </div>
      {/* Desktop Nav */}
      <div className="hidden md:flex items-center space-x-2">
        {navLinks.map((link) => (
          <button key={link.label} onClick={link.onClick}
            className="text-gray-700 hover:text-blue-600 font-medium px-3 py-1 rounded transition bg-transparent border-none">
            {link.label}
          </button>
        ))}
        {user ? (
          <Button size="sm" onClick={handleDashboard}>Dashboard</Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={handleSignIn} className="font-medium">Log in</Button>
            <Button size="sm" className="bg-black text-white hover:bg-gray-900 px-5" onClick={handleSignUp}>Sign up</Button>
          </>
        )}
      </div>
      {/* Mobile Hamburger */}
      <button
        className="md:hidden flex items-center justify-center p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Open menu"
      >
        <svg className="h-7 w-7 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-white/90 shadow">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { setLocation("/"); setMenuOpen(false); }}>
              <Bot className="h-7 w-7 text-blue-600" />
              <span className="text-lg font-bold text-gray-900">AI Workforce</span>
            </div>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <svg className="h-7 w-7 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-white/95">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => { link.onClick(); setMenuOpen(false); }}
                className="text-2xl font-semibold text-gray-900 hover:text-blue-600 transition"
              >
                {link.label}
              </button>
            ))}
            {user ? (
              <Button size="lg" className="w-40" onClick={() => { handleDashboard(); setMenuOpen(false); }}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" size="lg" className="w-40 font-medium" onClick={() => { handleSignIn(); setMenuOpen(false); }}>Log in</Button>
                <Button size="lg" className="w-40 bg-black text-white hover:bg-gray-900" onClick={() => { handleSignUp(); setMenuOpen(false); }}>Sign up</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 
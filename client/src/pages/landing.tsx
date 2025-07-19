import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Mail, 
  Zap, 
  Brain, 
  CheckCircle, 
  ArrowRight,
  Star,
  Users,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { SignInButton, SignUpButton, SignedOut, SignedIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Bot,
      title: "AI-Powered Email Processing",
      description: "Automatically analyze and categorize onboarding emails with advanced AI"
    },
    {
      icon: Brain,
      title: "Contextual Memory",
      description: "Remember conversations and context to provide consistent, intelligent responses"
    },
    {
      icon: Zap,
      title: "Workflow Automation",
      description: "Transform emails into actionable tasks and automated workflows"
    },
    {
      icon: MessageSquare,
      title: "ChatGPT-like Interface",
      description: "Natural conversation interface for managing your email workflows"
    }
  ];

  const benefits = [
    "Reduce email response time by 75%",
    "Automate repetitive onboarding tasks",
    "Never miss important follow-ups",
    "Smart prioritization and categorization",
    "Seamless Gmail integration",
    "Real-time collaboration features"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">EmailAgent AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">
                    Get Started
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button size="sm" onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-100">
              🚀 Superhuman + ChatGPT + Context Memory
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight">
              Transform Your Email
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {" "}Into Intelligence
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              The AI-powered email agent that transforms traditional onboarding workflows into 
              intelligent conversations. Automate, analyze, and respond with human-level understanding.
            </p>
            <div className="mt-10 flex items-center justify-center space-x-4">
              <SignUpButton mode="modal">
                <Button size="lg" className="px-8 py-3">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
              <Button variant="outline" size="lg" className="px-8 py-3">
                Watch Demo
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                14-day free trial
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Intelligent Email Management
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for modern teams who want to automate their onboarding workflows without losing the personal touch.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Teams Choose EmailAgent AI
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <SignUpButton mode="modal">
                  <Button size="lg" className="px-8 py-3">
                    Try EmailAgent AI Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignUpButton>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-sm text-gray-800">
                          I've analyzed 12 new onboarding emails and created 8 tasks. 
                          High priority: John's equipment setup needs attention.
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
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">75%</div>
              <div className="text-blue-100">Faster Response Times</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Companies Trust Us</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">10M+</div>
              <div className="text-blue-100">Emails Processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Email Workflow?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of teams already using EmailAgent AI to automate their onboarding processes.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <SignUpButton mode="modal">
              <Button size="lg" className="px-8 py-3 bg-blue-600 hover:bg-blue-700">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </SignUpButton>
            <Button variant="outline" size="lg" className="px-8 py-3 text-white border-white hover:bg-white hover:text-gray-900">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold text-white">EmailAgent AI</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 EmailAgent AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
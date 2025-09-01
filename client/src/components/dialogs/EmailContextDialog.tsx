import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Mail, Users, MessageSquare } from "lucide-react";

interface EmailContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (context: EmailContext) => void;
  userEmail: string;
}

export interface EmailContext {
  // Primary email usage
  primaryUse: 'work' | 'personal' | 'mixed' | 'services';
  
  // Work-specific context
  workStyle?: 'corporate-formal' | 'professional-relaxed' | 'startup-casual';
  workContacts?: string[]; // team, clients, boss, vendors
  
  // Personal-specific context
  personalStyle?: 'formal-friends' | 'friendly-casual' | 'very-relaxed';
  personalContacts?: string[]; // family, close-friends, acquaintances, services
  
  // Mixed usage context
  workCommunicationStyle?: 'formal' | 'professional' | 'casual';
  personalCommunicationStyle?: 'formal' | 'friendly' | 'very-casual';
  servicesCommunicationStyle?: 'formal' | 'polite' | 'direct';
}

const STEPS = [
  { id: 'usage', title: 'Email Usage', icon: Mail },
  { id: 'contacts', title: 'Who You Email', icon: Users },
  { id: 'style', title: 'Communication Style', icon: MessageSquare },
];

export const EmailContextDialog = ({
  open,
  onOpenChange,
  onComplete,
  userEmail,
}: EmailContextDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [context, setContext] = useState<EmailContext>({
    primaryUse: 'work',
    workContacts: [],
    personalContacts: [],
  });

  const updateContext = (field: keyof EmailContext, value: any) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(context);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Email Context Setup</h2>
              <p className="text-gray-600">Help us understand your communication style for {userEmail}</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-1 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Email Usage</CardTitle>
                <CardDescription>How do you primarily use this email account?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">I primarily use this email for:</Label>
                  <RadioGroup
                    value={context.primaryUse}
                    onValueChange={(value) => updateContext('primaryUse', value)}
                    className="mt-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="work" id="work" />
                      <Label htmlFor="work">Work and business</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="personal" id="personal" />
                      <Label htmlFor="personal">Personal and family</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mixed" id="mixed" />
                      <Label htmlFor="mixed">Both work and personal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="services" id="services" />
                      <Label htmlFor="services">Online services and shopping</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Who You Email</CardTitle>
                <CardDescription>Tell us about your typical email contacts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Work Users */}
                {(context.primaryUse === 'work' || context.primaryUse === 'mixed') && (
                  <div>
                    <Label className="text-base font-medium">Your work communication style:</Label>
                    <RadioGroup
                      value={context.workStyle}
                      onValueChange={(value) => updateContext('workStyle', value)}
                      className="mt-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="corporate-formal" id="corporate-formal" />
                        <Label htmlFor="corporate-formal">Corporate/formal environment</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="professional-relaxed" id="professional-relaxed" />
                        <Label htmlFor="professional-relaxed">Professional but relaxed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="startup-casual" id="startup-casual" />
                        <Label htmlFor="startup-casual">Startup/casual environment</Label>
                      </div>
                    </RadioGroup>

                    <div className="mt-4">
                      <Label className="text-base font-medium">You mostly email:</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {['team', 'clients', 'boss', 'vendors'].map((contact) => (
                          <div key={contact} className="flex items-center space-x-2">
                            <Checkbox
                              id={`work-${contact}`}
                              checked={context.workContacts?.includes(contact) || false}
                              onCheckedChange={(checked) => {
                                const current = context.workContacts || [];
                                if (checked) {
                                  updateContext('workContacts', [...current, contact]);
                                } else {
                                  updateContext('workContacts', current.filter(c => c !== contact));
                                }
                              }}
                            />
                            <Label htmlFor={`work-${contact}`} className="text-sm capitalize">
                              {contact === 'team' ? 'Team members' : 
                               contact === 'clients' ? 'Clients' :
                               contact === 'boss' ? 'Boss' : 'Vendors'}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Users */}
                {(context.primaryUse === 'personal' || context.primaryUse === 'mixed') && (
                  <div>
                    <Label className="text-base font-medium">Your personal communication style:</Label>
                    <RadioGroup
                      value={context.personalStyle}
                      onValueChange={(value) => updateContext('personalStyle', value)}
                      className="mt-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="formal-friends" id="formal-friends" />
                        <Label htmlFor="formal-friends">I'm pretty formal even with friends</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="friendly-casual" id="friendly-casual" />
                        <Label htmlFor="friendly-casual">Friendly and casual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="very-relaxed" id="very-relaxed" />
                        <Label htmlFor="very-relaxed">Very relaxed/informal</Label>
                      </div>
                    </RadioGroup>

                    <div className="mt-4">
                      <Label className="text-base font-medium">You mostly email:</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {['family', 'close-friends', 'acquaintances', 'services'].map((contact) => (
                          <div key={contact} className="flex items-center space-x-2">
                            <Checkbox
                              id={`personal-${contact}`}
                              checked={context.personalContacts?.includes(contact) || false}
                              onCheckedChange={(checked) => {
                                const current = context.personalContacts || [];
                                if (checked) {
                                  updateContext('personalContacts', [...current, contact]);
                                } else {
                                  updateContext('personalContacts', current.filter(c => c !== contact));
                                }
                              }}
                            />
                            <Label htmlFor={`personal-${contact}`} className="text-sm">
                              {contact === 'family' ? 'Family' :
                               contact === 'close-friends' ? 'Close friends' :
                               contact === 'acquaintances' ? 'Acquaintances' : 'Services/support'}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Communication Style</CardTitle>
                <CardDescription>How do you communicate with different types of contacts?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mixed Users - Different styles for different contexts */}
                {context.primaryUse === 'mixed' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">With work contacts, I'm:</Label>
                      <RadioGroup
                        value={context.workCommunicationStyle}
                        onValueChange={(value) => updateContext('workCommunicationStyle', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="formal" id="work-formal" />
                          <Label htmlFor="work-formal">Formal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="professional" id="work-professional" />
                          <Label htmlFor="work-professional">Professional</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="casual" id="work-casual" />
                          <Label htmlFor="work-casual">Casual</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-base font-medium">With family/friends, I'm:</Label>
                      <RadioGroup
                        value={context.personalCommunicationStyle}
                        onValueChange={(value) => updateContext('personalCommunicationStyle', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="formal" id="personal-formal" />
                          <Label htmlFor="personal-formal">Formal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="friendly" id="personal-friendly" />
                          <Label htmlFor="personal-friendly">Friendly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="very-casual" id="personal-very-casual" />
                          <Label htmlFor="personal-very-casual">Very casual</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-base font-medium">With services/strangers, I'm:</Label>
                      <RadioGroup
                        value={context.servicesCommunicationStyle}
                        onValueChange={(value) => updateContext('servicesCommunicationStyle', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="formal" id="services-formal" />
                          <Label htmlFor="services-formal">Formal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="polite" id="services-polite" />
                          <Label htmlFor="services-polite">Polite</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="direct" id="services-direct" />
                          <Label htmlFor="services-direct">Direct</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Single context users - show their specific style confirmation */}
                {context.primaryUse !== 'mixed' && (
                  <div className="text-center py-8">
                    <div className="text-lg font-medium mb-2">Perfect! We have everything we need.</div>
                    <div className="text-gray-600">
                      {context.primaryUse === 'work' && 
                        `We'll analyze your ${context.workStyle?.replace('-', ' ')} work communication with ${context.workContacts?.join(', ')}.`
                      }
                      {context.primaryUse === 'personal' && 
                        `We'll analyze your ${context.personalStyle?.replace('-', ' ')} personal communication with ${context.personalContacts?.join(', ')}.`
                      }
                      {context.primaryUse === 'services' && 
                        "We'll analyze your service and shopping email communication patterns."
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {STEPS.length}
          </div>
          
          <Button onClick={handleNext}>
            {currentStep === STEPS.length - 1 ? 'Complete Setup' : 'Next'}
            {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
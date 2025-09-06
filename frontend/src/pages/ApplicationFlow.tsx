import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Upload, 
  User, 
  Search, 
  FileText, 
  Mail, 
  Send, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  completed: boolean;
  required: boolean;
}

const ApplicationFlow = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<FlowStep[]>([
    {
      id: 'upload',
      title: 'Upload Resume',
      description: 'Upload your resume to get started',
      icon: Upload,
      route: '/resume-upload',
      completed: false,
      required: true
    },
    {
      id: 'profile',
      title: 'Complete Profile',
      description: 'Review and complete your profile information',
      icon: User,
      route: '/profile',
      completed: false,
      required: true
    },
    {
      id: 'preferences',
      title: 'Job Preferences',
      description: 'Set your job preferences and find matches',
      icon: Search,
      route: '/job-preferences',
      completed: false,
      required: true
    },
    {
      id: 'enhancement',
      title: 'Resume Enhancement',
      description: 'AI-powered resume optimization',
      icon: FileText,
      route: '/enhanced-resume-preview',
      completed: false,
      required: false
    },
    {
      id: 'cover-letter',
      title: 'Cover Letter Generation',
      description: 'Generate personalized cover letters',
      icon: Mail,
      route: '/enhanced-resume-preview',
      completed: false,
      required: false
    },
    {
      id: 'application',
      title: 'Send Applications',
      description: 'Review and send your applications',
      icon: Send,
      route: '/enhanced-resume-preview',
      completed: false,
      required: false
    }
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check completion status
    checkStepCompletion();
  }, [isAuthenticated, navigate]);

  const checkStepCompletion = () => {
    const hasResume = localStorage.getItem('parsedProfile');
    const hasProfile = localStorage.getItem('userProfile');
    const hasPreferences = localStorage.getItem('jobPreferences');
    const hasSelectedJobs = localStorage.getItem('selectedJobs');

    setSteps(prev => prev.map(step => {
      switch (step.id) {
        case 'upload':
          return { ...step, completed: !!hasResume };
        case 'profile':
          return { ...step, completed: !!hasProfile };
        case 'preferences':
          return { ...step, completed: !!hasPreferences };
        case 'enhancement':
        case 'cover-letter':
        case 'application':
          return { ...step, completed: !!hasSelectedJobs };
        default:
          return step;
      }
    }));
  };

  const getProgress = () => {
    const completedSteps = steps.filter(step => step.completed).length;
    return (completedSteps / steps.length) * 100;
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => !step.completed);
  };

  const handleStepClick = (step: FlowStep, index: number) => {
    // Allow clicking on completed steps or the next available step
    if (step.completed || index <= getCurrentStepIndex()) {
      navigate(step.route);
    } else {
      toast({
        title: "Complete previous steps first",
        description: `Please complete ${steps[index - 1]?.title} before proceeding`,
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    const nextStep = steps.find(step => !step.completed);
    if (nextStep) {
      navigate(nextStep.route);
    } else {
      navigate('/dashboard/applicant');
    }
  };

  const handleSkip = () => {
    navigate('/dashboard/applicant');
  };

  const getStepStatus = (step: FlowStep, index: number) => {
    if (step.completed) return 'completed';
    if (index === getCurrentStepIndex()) return 'current';
    if (index < getCurrentStepIndex()) return 'available';
    return 'locked';
  };

  return (
    <Layout>
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Complete Application Flow
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Follow this guided process to streamline your job applications
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {steps.filter(s => s.completed).length} of {steps.length} steps
              </span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>
        </div>

        {/* Flow Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const status = getStepStatus(step, index);
            const isClickable = step.completed || index <= getCurrentStepIndex();

            return (
              <Card 
                key={step.id} 
                className={`transition-all cursor-pointer ${
                  isClickable ? 'hover:shadow-md' : 'opacity-60'
                } ${
                  status === 'current' ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => handleStepClick(step, index)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* Step Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      status === 'completed' 
                        ? 'bg-green-100 text-green-600' 
                        : status === 'current'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">{step.title}</h3>
                        {step.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        {status === 'completed' && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                        )}
                        {status === 'current' && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-2">{step.description}</p>
                      
                      {/* Step Status */}
                      <div className="flex items-center gap-2 text-sm">
                        {status === 'completed' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Completed</span>
                          </div>
                        )}
                        {status === 'current' && (
                          <div className="flex items-center gap-1 text-primary">
                            <Clock className="w-4 h-4" />
                            <span>Ready to start</span>
                          </div>
                        )}
                        {status === 'locked' && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>Complete previous steps first</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2">
                      {status === 'completed' ? (
                        <Button variant="outline" size="sm">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      ) : status === 'current' ? (
                        <Button size="sm">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Start
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Locked
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" onClick={handleSkip}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Skip to Dashboard
          </Button>
          
          <Button onClick={handleContinue} disabled={getCurrentStepIndex() === -1}>
            {getCurrentStepIndex() === -1 ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                All Steps Complete
              </>
            ) : (
              <>
                Continue to {steps[getCurrentStepIndex()]?.title}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Tips Section */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Pro Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <p>Complete your profile thoroughly for better job matches</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <p>Be specific with job preferences to get relevant matches</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <p>Review enhanced resumes before sending applications</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <p>You can always come back and complete steps later</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};

export default ApplicationFlow; 
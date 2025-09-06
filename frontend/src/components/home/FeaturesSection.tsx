import { 
  Upload, 
  Settings, 
  Send, 
  BarChart3, 
  Shield, 
  Zap,
  Mail,
  Users,
  BrainCircuit,
  FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FeaturesSection = () => {
  const applicantFeatures = [
    {
      icon: Upload,
      title: "Resume Upload & Parsing",
      description: "Upload your resume and our AI automatically extracts and organizes your information."
    },
    {
      icon: Settings,
      title: "Smart Preferences",
      description: "Set your job preferences through our intuitive wizard interface."
    },
    {
      icon: BrainCircuit,
      title: "AI Job Matching",
      description: "Our algorithm finds the perfect jobs that match your skills and preferences."
    },
    {
      icon: Send,
      title: "Auto Applications",
      description: "Automatically generate and send personalized resumes and cover letters."
    },
    {
  icon: FileText,
  title: "Resume Enhancer",
  description: "Improve your resume using AI-powered suggestions tailored to job roles."
},
{
  icon: Send,
  title: "Cover Letter Generator",
  description: "Automatically generate personalized cover letters based on your resume and the job description."
}

  ];

  const hrFeatures = [
  {
    icon: FileText,
    title: "Smart Manual Job Posting",
    description: "Easily post jobs manually with intelligent form validation and field suggestions."
  },
  {
    icon: Users,
    title: "Prompt-Based Job Posting",
    description: "Generate job descriptions using simple prompts powered by AI."
  },
  {
    icon: Settings,
    title: "Edit Posted Jobs",
    description: "Quickly edit your posted jobs, update descriptions, or close listings as needed."
  },
  {
    icon: Mail,
    title: "Applicant Email Notifications",
    description: "Receive automated emails when applicants apply to your job postings."
  }
];


  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Powerful Features for{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Every User
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Whether you're looking for your next opportunity or seeking top talent, 
            our platform has everything you need to succeed.
          </p>
        </div>

        {/* For Applicants */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
            For Job Seekers
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applicantFeatures.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-professional-md transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* For HR */}
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
            For Recruiters
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {hrFeatures.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-professional-md transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
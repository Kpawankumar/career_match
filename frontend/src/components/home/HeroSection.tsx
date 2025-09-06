import { ArrowRight, Users, BriefcaseIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-primary opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-accent opacity-10 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Find Your{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Perfect Career
              </span>{" "}
              Match
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Our AI-powered platform connects talented professionals with their ideal opportunities. 
              Upload your resume, set preferences, and let us handle the rest.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link to="/signup?type=applicant">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Find Jobs <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/signup?type=hr">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Post Jobs
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center justify-center lg:justify-start space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Smart Matching</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start space-x-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <BriefcaseIcon className="w-5 h-5 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">Auto Applications</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start space-x-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">AI-Powered</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-card rounded-2xl shadow-professional-lg p-8 border border-border">
              {/* Mock application interface */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted/60 rounded w-1/2 mt-2"></div>
                  </div>
                  <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-success-foreground rounded-full"></div>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                    <div className="h-3 bg-muted rounded w-4/6"></div>
                  </div>
                </div>
                <div className="flex space-x-2 pt-2">
                  <div className="h-8 bg-primary/20 rounded w-20"></div>
                  <div className="h-8 bg-accent/20 rounded w-16"></div>
                  <div className="h-8 bg-success/20 rounded w-24"></div>
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-primary rounded-2xl opacity-80 blur-sm"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-accent rounded-xl opacity-60"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
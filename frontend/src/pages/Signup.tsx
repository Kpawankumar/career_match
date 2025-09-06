import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BriefcaseIcon, Users, Shield, Eye, EyeOff, CheckCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState(searchParams.get("type") || "applicant");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("https://login-system-1071432896229.asia-south2.run.app/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role: userType,
          name,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed");
      
      toast({
        title: "Account created successfully!",
        description: "You can now sign in to your account.",
      });
      
      // Redirect to login page
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      toast({
        title: "Signup failed",
        description: err.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeDescription = (type: string) => {
    switch (type) {
      case "applicant":
        return "Find your dream job with AI-powered matching and automated applications.";
      case "hr":
        return "Connect with top talent and streamline your recruitment process.";
      case "admin":
        return "Manage the platform with comprehensive oversight and analytics.";
      default:
        return "Join our platform to get started.";
    }
  };

  const getUserTypeFeatures = (type: string) => {
    switch (type) {
      case "applicant":
        return [
          "AI resume parsing and profile creation",
          "Smart job matching based on preferences",
          "Automated application submissions",
          "Real-time progress tracking"
        ];
      case "hr":
        return [
          "Easy job posting and management",
          "Access to qualified candidate pool",
          "Instant application notifications",
          "Advanced filtering and search"
        ];
      case "admin":
        return [
          "Complete platform oversight",
          "Advanced analytics and reporting",
          "User management and support",
          "System health monitoring"
        ];
      default:
        return [];
    }
  };

  return (
    <Layout>
      <main>
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <BriefcaseIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">CareerMatch</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left side - Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Join CareerMatch
              </h1>
              <p className="text-lg text-muted-foreground">
                {getUserTypeDescription(userType)}
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">What you'll get:</h3>
              <ul className="space-y-2">
                {getUserTypeFeatures(userType).map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social proof */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">10k+</div>
                  <div className="text-muted-foreground">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">5k+</div>
                  <div className="text-muted-foreground">Jobs Posted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">98%</div>
                  <div className="text-muted-foreground">Match Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <Card className="shadow-professional-lg border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Your Account</CardTitle>
              <CardDescription>
                Get started in less than 2 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={userType} onValueChange={setUserType} className="mb-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="applicant" className="text-xs">
                    <Users className="w-4 h-4 mr-1" />
                    Job Seeker
                  </TabsTrigger>
                  <TabsTrigger value="hr" className="text-xs">
                    <BriefcaseIcon className="w-4 h-4 mr-1" />
                    Recruiter
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="text-xs">
                    <Shield className="w-4 h-4 mr-1" />
                    Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-destructive text-sm">{error}</div>}

                <div className="text-xs text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </div>

                <Button type="submit" className="w-full" variant="gradient" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  );
};

export default Signup;
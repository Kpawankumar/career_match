import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { 
  Upload, 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Download,
  FileText,
  CheckCircle,
  Sparkles,
  ChevronRight
} from "lucide-react";
import axios from "axios";

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Check if we should show resume tab based on navigation state
  useEffect(() => {
    if (location.state?.message) {
      setActiveTab("resume");
      toast({
        title: "Resume Required",
        description: location.state.message,
        variant: "destructive"
      });
    } else if (location.state?.tab === 'resume') {
      setActiveTab("resume");
    }
  }, [location.state, toast]);

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    currentTitle: "",
    currentCompany: "",
    isCurrentlyWorking: false,
    expectedSalary: "",
    availability: "2-weeks"
  });

  const handleResumeUpload = async (file: File) => {
    if (!file) return;
    
    if (!file.type.includes("pdf") && !file.type.includes("doc")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOC file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user?.id || "1");

      const response = await axios.post(
        "http://localhost:9001/parse-resume/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setUploadedFile(file);
      setIsUploading(false);

      toast({
        title: "Resume uploaded successfully!",
        description: "Your profile has been updated with the extracted information.",
      });
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleResumeUpload(file);
  };

  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const payload = {
        user_id: user?.id || "1",
        app_name: `${profileData.firstName} ${profileData.lastName}`,
        email: profileData.email,
        phone: profileData.phone,
        location: profileData.location,
        currentTitle: profileData.currentTitle,
        currentCompany: profileData.currentCompany,
        expectedSalary: profileData.expectedSalary,
        availability: profileData.availability
      };
      
      await axios.post("http://localhost:9001/update-profile/", payload);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Could not update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and profile information</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal and professional information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="City, State/Country"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currentTitle">Current Job Title</Label>
                      <Input
                        id="currentTitle"
                        value={profileData.currentTitle}
                        onChange={(e) => handleInputChange("currentTitle", e.target.value)}
                        placeholder="e.g., Senior Developer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currentCompany">Current Company</Label>
                      <Input
                        id="currentCompany"
                        value={profileData.currentCompany}
                        onChange={(e) => handleInputChange("currentCompany", e.target.value)}
                        placeholder="e.g., Tech Corp"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expectedSalary">Expected Salary</Label>
                      <Input
                        id="expectedSalary"
                        value={profileData.expectedSalary}
                        onChange={(e) => handleInputChange("expectedSalary", e.target.value)}
                        placeholder="e.g., $80k - $100k"
                      />
                    </div>
                    <div>
                      <Label htmlFor="availability">Availability</Label>
                      <Select value={profileData.availability} onValueChange={(value) => handleInputChange("availability", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediately">Immediately</SelectItem>
                          <SelectItem value="2-weeks">2 weeks notice</SelectItem>
                          <SelectItem value="1-month">1 month</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => navigate('/profile')}>
                    Next: Complete Profile
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resume" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume Management
                </CardTitle>
                <CardDescription>
                  Upload and manage your resume for AI-powered profile enhancement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">Re-upload Resume</h3>
                  <p className="text-sm text-muted-foreground">You can re-upload your resume at any time to update your profile and get better matches.</p>
                </div>
                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>

                      {isUploading ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Uploading...</div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full animate-pulse w-3/4"></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <div className="text-sm font-medium">
                              Upload your resume to enhance your profile
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Supports PDF, DOC, DOCX up to 5MB
                            </div>
                          </div>

                          <div className="flex justify-center">
                            <input
                              ref={fileInputRef}
                              type="file"
                              style={{ display: "none" }}
                              onChange={handleFileInput}
                              accept=".pdf,.doc,.docx"
                            />
                            <Button
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Choose File
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-success" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{uploadedFile.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Information extracted successfully
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadedFile(null);
                          fileInputRef.current?.click();
                        }}
                      >
                        Re-upload Resume
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
                  Your resume is processed securely and we only extract relevant professional information.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive job matches and updates via email</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Application Status</h4>
                      <p className="text-sm text-muted-foreground">Get notified about your application status</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy & Security
                </CardTitle>
                <CardDescription>
                  Manage your privacy settings and account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Profile Visibility</h4>
                      <p className="text-sm text-muted-foreground">Control who can see your profile</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Data Export</h4>
                      <p className="text-sm text-muted-foreground">Download your data</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
};

export default Settings; 
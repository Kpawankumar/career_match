import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, FileText, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { useRef } from "react";

interface ParseResumeResponse {
  user_id: string;
  cloud_path: string;
  parsed_profile: any;
}

const ResumeUpload = () => {
  const { user, logout } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    console.log("Logout clicked");
    navigate("/login");
  };

  const handleFileUpload = async (file: File) => {
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

      const response = await axios.post<ParseResumeResponse>(
        "https://auto-fill-service-1071432896229.asia-south2.run.app/parse-resume/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setUploadedFile(file);
      setIsUploading(false);
      setIsProcessing(false);

      localStorage.setItem("parsedProfile", JSON.stringify(response.data.parsed_profile));
      localStorage.setItem('hasUploadedResume', 'true');
      toast({
        title: "Resume uploaded successfully!",
        description: "Your profile has been auto-filled with the extracted information.",
      });

      navigate("/profile", { state: { parsedProfile: response.data.parsed_profile } });
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed", e.target.files);
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleContinue = () => {
    // Check if there's a redirect message from another page
    const state = location.state;
    if (state?.message) {
      toast({
        title: "Resume Required",
        description: state.message,
        variant: "destructive"
      });
    }
    
    navigate("/profile");
  };

  const handleSkip = () => {
    // Check if there's a redirect target
    const state = location.state;
    if (state?.redirectTo) {
      navigate(state.redirectTo);
    } else {
      navigate("/dashboard/applicant");
    }
  };

  return (
    <Layout>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
            <Upload className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Upload Your Resume</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Let our AI extract your information to auto-fill your profile and make applying to jobs faster than ever.
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Upload Resume
            </CardTitle>
            <CardDescription>
              Upload your resume and we'll automatically extract your skills, experience, and education to create your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!uploadedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
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
                          Drag and drop your resume here, or click to browse
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Supports PDF, DOC, DOCX up to 5MB
                        </div>
                      </div>

                      <div className="flex justify-center ">
                        <input
                          ref={fileInputRef}
                          id="file-upload"
                          type="file"
                          style={{ display: "none" }}
                          onChange={handleFileInput}
                          accept=".pdf,.doc,.docx"
                        />
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="cursor-pointer bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90"
                        >
                          <Upload className="w-4 h-4 mr-2 " />
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
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    ) : (
                      <CheckCircle className="w-6 h-6 text-success" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{uploadedFile.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          Extracting information with AI...
                        </span>
                      ) : (
                        "Ready! Information extracted successfully."
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {uploadedFile && !isProcessing ? (
                <Button onClick={handleContinue} className="flex-1">
                  Continue to Profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : null}

              <Button
                variant="outline"
                onClick={handleSkip}
                className={uploadedFile && !isProcessing ? "" : "bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90 flex-1"}
              >
                {uploadedFile ? "Upload Another" : "Skip for Now"}
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
              Your resume is processed securely and we only extract relevant professional information.
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};

export default ResumeUpload;

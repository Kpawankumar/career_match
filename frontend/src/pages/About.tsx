import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Award, Heart } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Users,
      title: "People First",
      description: "We believe in putting people at the center of everything we do, creating meaningful connections between talent and opportunity."
    },
    {
      icon: Target,
      title: "Innovation",
      description: "We're constantly pushing the boundaries of what's possible in job matching using cutting-edge AI technology."
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We strive for excellence in every aspect of our platform, ensuring the best experience for all our users."
    },
    {
      icon: Heart,
      title: "Integrity",
      description: "We operate with complete transparency and honesty, building trust with every interaction."
    }
  ];

 
  return (
    <Layout>
      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-16 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                About <span className="bg-gradient-primary bg-clip-text text-transparent">CareerMatch</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                We're revolutionizing the way people find jobs and companies discover talent 
                through intelligent matching and seamless automation.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                At CareerMatch, we believe that finding the right job or the perfect candidate 
                shouldn't be a time-consuming, frustrating process. Our mission is to leverage 
                artificial intelligence and automation to create perfect matches between job 
                seekers and employers, making the hiring process more efficient, fair, and 
                successful for everyone involved.
              </p>
            </div>
          </div>
        </section>

   

        {/* Values Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Our Values
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                These core values guide everything we do and shape how we build our platform.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <Card key={index} className="text-center border-border hover:shadow-professional-md transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8 text-center">
                Our Story
              </h2>
              <div className="prose prose-lg max-w-none text-muted-foreground">
                <p className="mb-6">
                  CareerMatch was founded in 2025 with a simple yet powerful vision: to eliminate 
                  the friction in the job market by creating intelligent connections between talent 
                  and opportunity. Our founders, experienced in both technology and recruitment, 
                  recognized that traditional job searching and hiring methods were outdated and 
                  inefficient.
                </p>
                <p className="mb-6">
                  We started with a core belief that technology should work for people, not against them. 
                  By combining advanced AI algorithms with human-centered design, we've created a 
                  platform that understands what job seekers really want and what employers truly need.
                </p>
                <p>
                  Today, we're proud to serve thousands of job seekers and hundreds of companies, 
                  facilitating meaningful career connections every day. Our platform continues to 
                  evolve, always with the goal of making career advancement accessible, efficient, 
                  and successful for everyone.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default About;
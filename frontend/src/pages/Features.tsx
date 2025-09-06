import Layout from "@/components/layout/Layout";
import FeaturesSection from "@/components/home/FeaturesSection";

const Features = () => {
  return (
    <Layout>
      <main>
        {/* Page Header */}
        <section className="pt-24 pb-12 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              Platform <span className="bg-gradient-primary bg-clip-text text-transparent">Features</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover the powerful tools and features that make CareerMatch the best choice 
              for job seekers and recruiters alike.
            </p>
          </div>
        </section>
        
        <FeaturesSection />
      </main>
    </Layout>
  );
};

export default Features;
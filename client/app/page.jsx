"use client";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  PlayIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  ArrowRightIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      if (session.role === "owner") router.replace("/dashboard/owner");
      else if (session.role === "reviewer")
        router.replace("/dashboard/reviewer");
      else router.replace("/dashboard/viewer");
    }
    
    // Trigger animations after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [status, session, router]);

  const features = [
    {
      icon: PlayIcon,
      title: "Real-Time Collaboration",
      description: "Work together seamlessly with live annotations and comments"
    },
    {
      icon: UserGroupIcon,
      title: "Role-Based Access",
      description: "Control who can view, review, or edit your media content"
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Interactive Comments",
      description: "Add contextual feedback directly on media elements"
    },
    {
      icon: DocumentTextIcon,
      title: "Advanced Annotations",
      description: "Draw, highlight, and mark up content with precision"
    }
  ];

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container-responsive py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">MediaReview</span>
          </div>
          
          {status === "authenticated" && (
            <button
              onClick={() => signOut({ callbackUrl: "/", redirect: true })}
              className="btn-outline text-white border-white hover:bg-white hover:text-slate-900"
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container-responsive py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main heading with animation */}
          <h1 className={`text-5xl md:text-7xl font-bold mb-8 transition-all duration-1000 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <span className="text-gradient-primary">Real-Time</span>
            <br />
            <span className="text-white">Media Review</span>
          </h1>
          
          {/* Subtitle with animation */}
          <p className={`text-xl md:text-2xl text-white/80 mb-12 transition-all duration-1000 delay-300 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            Collaborate, review, and annotate media in real-time with your team.
            <br />
            <span className="text-gradient-secondary">Professional-grade tools for modern workflows.</span>
          </p>

          {/* CTA Buttons with animation */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-20 transition-all duration-1000 delay-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            {status === "authenticated" ? (
              <button
                onClick={() => signOut({ callbackUrl: "/", redirect: true })}
                className="btn-primary text-lg px-8 py-4"
              >
                Sign Out
              </button>
            ) : (
              <>
                <button
                  onClick={() => signIn("keycloak")}
                  className="btn-primary text-lg px-8 py-4 group"
                >
                  Get Started
                  <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => {
                    window.location.href = `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/registrations?client_id=${process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent("http://localhost:3000/api/auth/callback/keycloak")}`;
                  }}
                  className="btn-outline text-white border-white hover:bg-white hover:text-slate-900 text-lg px-8 py-4"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>

        {/* Features Grid with animation */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 transition-all duration-1000 delay-700 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="card-glass p-6 text-center hover-lift group"
              style={{ animationDelay: `${800 + index * 100}ms` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-white/70 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className={`mt-20 text-center transition-all duration-1000 delay-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-glass p-6">
              <div className="text-3xl font-bold text-gradient-primary mb-2">99.9%</div>
              <div className="text-white/70">Uptime</div>
            </div>
            <div className="card-glass p-6">
              <div className="text-3xl font-bold text-gradient-secondary mb-2">Real-time</div>
              <div className="text-white/70">Collaboration</div>
            </div>
            <div className="card-glass p-6">
              <div className="text-3xl font-bold text-gradient-primary mb-2">Secure</div>
              <div className="text-white/70">Enterprise-grade</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container-responsive py-12 mt-20">
        <div className="text-center text-white/50">
          <p>&copy; 2024 MediaReview. Built with modern technologies for professional teams.</p>
        </div>
      </footer>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  PlayIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  BoltIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
  EyeIcon,
  LockClosedIcon,
  FilmIcon,
  CursorArrowRaysIcon,
} from "@heroicons/react/24/outline";

/* Scroll-reveal wrapper — animates content in as it enters the viewport */
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* Consistent full-width section: top divider + generous spacing + optional tint */
function Section({ id, children, tinted = false, className = "" }) {
  return (
    <section
      id={id}
      className={`relative border-t border-white/10 scroll-mt-20 ${
        tinted ? "bg-white/[0.025]" : ""
      } ${className}`}
    >
      <div className="container-responsive py-20 md:py-28">{children}</div>
    </section>
  );
}

function SectionHeading({ eyebrow, eyebrowColor, title, highlight, highlightClass, subtitle }) {
  return (
    <Reveal className="mx-auto mb-16 max-w-2xl text-center">
      <p className={`text-sm font-semibold uppercase tracking-widest ${eyebrowColor}`}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-4xl font-bold md:text-5xl">
        {title} <span className={highlightClass}>{highlight}</span>
      </h2>
      {subtitle && <p className="mt-4 text-white/60">{subtitle}</p>}
    </Reveal>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      if (session.role === "owner") router.replace("/dashboard/owner");
      else if (session.role === "reviewer") router.replace("/dashboard/reviewer");
      else router.replace("/dashboard/viewer");
    }
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [status, session, router]);

  const features = [
    {
      icon: BoltIcon,
      title: "Real-Time Collaboration",
      description:
        "See annotations, comments and presence update live as your team reviews together — powered by web sockets.",
      gradient: "from-sky-500 to-blue-600",
    },
    {
      icon: PencilSquareIcon,
      title: "Frame-Accurate Annotations",
      description:
        "Draw, highlight and mark up images and video frames with pixel precision, pinned to the exact moment.",
      gradient: "from-fuchsia-500 to-purple-600",
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Contextual Comments",
      description:
        "Leave threaded feedback directly on media elements so nothing gets lost in scattered email chains.",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: UserGroupIcon,
      title: "Role-Based Access",
      description:
        "Owners, reviewers and viewers each get exactly the right permissions — no more, no less.",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: BuildingOffice2Icon,
      title: "Teams & Organizations",
      description:
        "Group members into organizations, invite collaborators by link, and manage access from one place.",
      gradient: "from-rose-500 to-pink-600",
    },
    {
      icon: ShieldCheckIcon,
      title: "Enterprise-Grade Security",
      description:
        "Single sign-on and token-based auth via Keycloak keep your media and feedback protected end to end.",
      gradient: "from-indigo-500 to-violet-600",
    },
  ];

  const steps = [
    {
      icon: CloudArrowUpIcon,
      title: "Upload your media",
      description:
        "Drop in videos or images. Your content is securely stored and ready to share in seconds.",
    },
    {
      icon: UserGroupIcon,
      title: "Invite your team",
      description:
        "Share a link or invite reviewers and viewers with role-based access tailored to each person.",
    },
    {
      icon: CursorArrowRaysIcon,
      title: "Review in real time",
      description:
        "Annotate, comment and resolve feedback together — every change syncs instantly for everyone.",
    },
  ];

  const roles = [
    {
      icon: SparklesIcon,
      name: "Owner",
      tagline: "Full control",
      accent: "text-sky-300",
      ring: "ring-sky-500/30",
      perks: [
        "Upload & manage media",
        "Invite and assign roles",
        "Create organizations",
        "Annotate & comment",
      ],
    },
    {
      icon: PencilSquareIcon,
      name: "Reviewer",
      tagline: "Give feedback",
      accent: "text-fuchsia-300",
      ring: "ring-fuchsia-500/30",
      featured: true,
      perks: [
        "View shared media",
        "Add annotations",
        "Leave comments",
        "Collaborate live",
      ],
    },
    {
      icon: EyeIcon,
      name: "Viewer",
      tagline: "Stay in the loop",
      accent: "text-emerald-300",
      ring: "ring-emerald-500/30",
      perks: [
        "View shared media",
        "Read comments",
        "Track annotations",
        "Follow progress",
      ],
    },
  ];

  const stats = [
    { value: "Real-Time", label: "Live collaboration" },
    { value: "3 Roles", label: "Granular access" },
    { value: "SSO", label: "Secure by Keycloak" },
    { value: "Video + Image", label: "Media support" },
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
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Ambient background (behind everything, never captures clicks) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950"></div>
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-600 opacity-20 blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-sky-600 opacity-20 blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-fuchsia-600 opacity-20 blur-3xl animate-pulse-slow"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Foreground */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
          <div className="container-responsive flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-fuchsia-500">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">MediaReview</span>
            </div>

            <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
              <a href="#features" className="transition-colors hover:text-white">
                Features
              </a>
              <a href="#how" className="transition-colors hover:text-white">
                How it works
              </a>
              <a href="#roles" className="transition-colors hover:text-white">
                Roles
              </a>
            </div>

            {status === "authenticated" ? (
              <button
                onClick={() => signOut({ callbackUrl: "/", redirect: true })}
                className="btn-outline border-white/40 text-white hover:bg-white hover:text-slate-900 !py-2 !px-4 text-sm"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => signIn("keycloak")}
                className="btn-primary !py-2 !px-5 text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="container-responsive pt-20 pb-24 text-center md:pt-28">
          <div
            className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur transition-all duration-1000 mt-5 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
            </span>
            Real-time media collaboration for modern teams
          </div>

          <h1
            className={`mx-auto mt-8 mb-6 max-w-4xl text-5xl font-extrabold tracking-tight transition-all duration-1000 md:text-7xl ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <span className="text-gradient-primary">Review media</span>
            <br />
            <span className="text-white">together, in real time</span>
          </h1>

          <p
            className={`mx-auto mb-10 max-w-2xl text-lg text-white/70 transition-all duration-1000 delay-200 md:text-xl ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            Upload videos and images, invite your team, and collaborate with
            frame-accurate annotations and contextual comments — all synced live,
            all in one secure workspace.
          </p>

          <div
            className={`flex flex-col justify-center gap-4 transition-all duration-1000 delay-300 sm:flex-row ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {status === "authenticated" ? (
              <button
                onClick={() => router.replace("/dashboard/owner")}
                className="btn-primary group text-lg !px-8 !py-4"
              >
                Go to Dashboard
                <ArrowRightIcon className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => signIn("keycloak")}
                  className="btn-primary group text-lg !px-8 !py-4"
                >
                  Get Started Free
                  <ArrowRightIcon className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <a
                  href="#features"
                  className="btn-outline border-white/40 text-white hover:bg-white hover:text-slate-900 text-lg !px-8 !py-4"
                >
                  Explore Features
                </a>
              </>
            )}
          </div>

          <div
            className={`mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50 transition-all duration-1000 delay-500 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="h-4 w-4 text-emerald-400" /> No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockClosedIcon className="h-4 w-4 text-sky-400" /> Secure single sign-on
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BoltIcon className="h-4 w-4 text-fuchsia-400" /> Instant live sync
            </span>
          </div>

          {/* App preview mockup */}
          <Reveal delay={150} className="mx-auto mt-16 max-w-5xl">
            <div className="card-glass overflow-hidden rounded-2xl border-white/15 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/80"></span>
                <span className="h-3 w-3 rounded-full bg-amber-400/80"></span>
                <span className="h-3 w-3 rounded-full bg-emerald-400/80"></span>
                <div className="ml-4 hidden rounded-md bg-white/5 px-3 py-1 text-xs text-white/40 sm:block">
                  mediareview.app / dashboard
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6 md:col-span-2">
                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
                    <FilmIcon className="h-16 w-16 text-white/15" />
                    <span className="absolute left-[22%] top-[30%] flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-bold shadow-lg ring-4 ring-sky-500/20">
                      1
                    </span>
                    <span className="absolute right-[26%] top-[55%] flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-500 text-xs font-bold shadow-lg ring-4 ring-fuchsia-500/20">
                      2
                    </span>
                    <div className="absolute left-[40%] top-[40%] h-16 w-24 rounded-lg border-2 border-dashed border-amber-400/80"></div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <PlayIcon className="h-5 w-5 text-white/60" />
                    <div className="relative h-1.5 flex-1 rounded-full bg-white/10">
                      <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500"></div>
                      <span className="absolute left-[22%] -top-1 h-3.5 w-3.5 rounded-full bg-sky-400 ring-2 ring-slate-900"></span>
                      <span className="absolute left-[63%] -top-1 h-3.5 w-3.5 rounded-full bg-fuchsia-400 ring-2 ring-slate-900"></span>
                    </div>
                    <span className="text-xs text-white/40">01:24</span>
                  </div>
                </div>
                <div className="border-t border-white/10 bg-white/[0.03] p-5 md:border-l md:border-t-0">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/80">
                    <ChatBubbleLeftRightIcon className="h-4 w-4" /> Comments
                  </div>
                  {[
                    {
                      n: "Aanya",
                      c: "Color grade feels too warm here.",
                      avatar: "bg-sky-500/20 text-sky-300",
                    },
                    {
                      n: "Rahul",
                      c: "Trim this transition by ~0.5s?",
                      avatar: "bg-fuchsia-500/20 text-fuchsia-300",
                    },
                    {
                      n: "Mei",
                      c: "Logo placement looks perfect now ✅",
                      avatar: "bg-emerald-500/20 text-emerald-300",
                    },
                  ].map((cm, i) => (
                    <div key={i} className="mb-3 flex gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cm.avatar} text-xs font-bold`}
                      >
                        {cm.n[0]}
                      </div>
                      <div className="rounded-lg rounded-tl-none bg-white/5 px-3 py-2 text-left">
                        <div className="text-xs font-semibold text-white/80">
                          {cm.n}
                        </div>
                        <div className="text-xs text-white/60">{cm.c}</div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/40">
                    Add a comment…
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Stats */}
        <Section tinted className="mt-5">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="card-glass rounded-xl p-6 text-center">
                  <div className="text-2xl font-bold text-gradient-primary">
                    {s.value}
                  </div>
                  <div className="mt-1 text-sm text-white/60">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Features */} 
        <Section id="features" className="mt-5">
          <SectionHeading
            eyebrow="Features"
            eyebrowColor="text-fuchsia-300/80"
            title="Everything you need to"
            highlight="review faster"
            highlightClass="text-gradient-secondary"
            subtitle="A complete toolkit for collaborative media review — from upload to sign-off, built for teams that move quickly."
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 80}>
                <div className="card-glass hover-lift group h-full rounded-2xl p-7">
                  <div
                    className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* How it works */}
        <Section id="how" tinted className="mt-5">
          <SectionHeading
            eyebrow="How it works"
            eyebrowColor="text-sky-300/80"
            title="From upload to sign-off in"
            highlight="three steps"
            highlightClass="text-gradient-primary"
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 120}>
                <div className="card-glass h-full rounded-2xl p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-5xl font-black text-white/10">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Roles */}
        <Section id="roles">
          <SectionHeading
            eyebrow="Role-based access"
            eyebrowColor="text-emerald-300/80"
            title="The right access for"
            highlight="every teammate"
            highlightClass="text-gradient-secondary"
            subtitle="Assign roles so everyone can contribute at the right level — secure by default."
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {roles.map((role, index) => (
              <Reveal key={role.name} delay={index * 100}>
                <div
                  className={`card-glass h-full rounded-2xl p-7 ring-1 ${role.ring} ${
                    role.featured ? "shadow-2xl md:-translate-y-3" : ""
                  }`}
                >
                  {role.featured && (
                    <div className="mb-4 inline-block rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-semibold text-fuchsia-200">
                      Most collaborative
                    </div>
                  )}
                  <div className="mb-5 flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <role.icon className={`h-6 w-6 ${role.accent}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold leading-tight">
                        {role.name}
                      </h3>
                      <p className={`text-sm ${role.accent}`}>{role.tagline}</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {role.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-center gap-2 text-sm text-white/70"
                      >
                        <CheckIcon className="h-4 w-4 shrink-0 text-emerald-400" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Final CTA */}
        <Section tinted>
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-sky-600/20 via-fuchsia-600/15 to-purple-600/20 p-10 text-center md:p-16">
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"></div>
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl"></div>
              <h2 className="relative text-3xl font-bold md:text-5xl">
                Ready to review smarter?
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl text-white/70">
                Bring your team into one real-time workspace and turn scattered
                feedback into clear, actionable reviews.
              </p>
              <div className="relative mt-8 flex justify-center">
                {status === "authenticated" ? (
                  <button
                    onClick={() => router.replace("/dashboard/owner")}
                    className="btn-primary group text-lg !px-8 !py-4"
                  >
                    Go to Dashboard
                    <ArrowRightIcon className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <button
                    onClick={() => signIn("keycloak")}
                    className="btn-primary group text-lg !px-8 !py-4"
                  >
                    Get Started Free
                    <ArrowRightIcon className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                )}
              </div>
            </div>
          </Reveal>
        </Section>

        {/* Footer */}
        <footer className="border-t border-white/10">
          <div className="container-responsive flex flex-col items-center justify-between gap-4 py-10 md:flex-row">
            <div className="flex items-center space-x-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-fuchsia-500">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">MediaReview</span>
            </div>
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} MediaReview. Built for modern,
              collaborative teams.
            </p>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <a href="#features" className="transition-colors hover:text-white">
                Features
              </a>
              <a href="#roles" className="transition-colors hover:text-white">
                Roles
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

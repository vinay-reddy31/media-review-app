"use client";
import { useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (session.role === "owner") router.replace("/dashboard/owner");
      else if (session.role === "reviewer")
        router.replace("/dashboard/reviewer");
      else router.replace("/dashboard/viewer");
    }
  }, [status, session, router]);

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 text-white px-6">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Real-Time Media Review & Annotation
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8">
          Collaborate, review, and annotate media in real time with your team.
        </p>

        {status === "loading" ? (
          <p className="text-gray-400">Checking authentication...</p>
        ) : status === "authenticated" ? (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => signOut({ callbackUrl: "/", redirect: true })}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => signIn("keycloak")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition"
            >
              Sign In
            </button>
            <button
             onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/registrations?client_id=${process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent("http://localhost:3000/api/auth/callback/keycloak")}`;
            }}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

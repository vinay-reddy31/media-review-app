"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export default function AcceptSharePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params?.token;
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [linkInfo, setLinkInfo] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  // Step 1: Check if the share link OR invite link is valid (no auth required)
  useEffect(() => {
    if (!token) return;

    const checkLink = async () => {
      try {
        setChecking(true);
        // Try media share link first
        let ok = false;
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/share-links/${token}/check`);
          const data = await res.json();
          if (res.ok) {
            setLinkInfo(data);
            ok = true;
          }
        } catch (_) {}

        // If not a media share, try invite link
        if (!ok) {
          const res2 = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invites/${token}`);
          const data2 = await res2.json();
          if (!res2.ok) {
            setError(data2.error || "Invalid or expired link");
            return;
          }
          setInviteInfo(data2);
        }

        // If user is already authenticated, proceed to accept
        if (session?.accessToken) {
          if (linkInfo) acceptLink();
          if (inviteInfo) acceptInvite();
        }
      } catch (e) {
        setError("Failed to check link validity");
        console.error("Link check error:", e);
      } finally {
        setChecking(false);
      }
    };

    checkLink();
  }, [token]);

  // Step 2: If user becomes authenticated, accept the link/invite
  useEffect(() => {
    if (!accepting && session?.accessToken) {
      if (linkInfo) acceptLink();
      if (inviteInfo) acceptInvite();
    }
  }, [linkInfo, inviteInfo, session?.accessToken, accepting]);

  const acceptLink = async () => {
    if (!linkInfo || !session?.accessToken) return;
    
    try {
      setAccepting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/share-links/${token}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 403 && data.expectedEmail) {
          // Email mismatch - show specific error
          setError(`This link is restricted to ${data.expectedEmail}. You are logged in as ${data.userEmail || 'unknown'}. Please log in with the correct account.`);
          // Sign out and redirect to login with correct email hint
          signIn("keycloak", { 
            callbackUrl: `${window.location.origin}/share/${token}`,
            loginHint: data.expectedEmail 
          });
          return;
        }
        throw new Error(data.error || "Failed to accept link");
      }

      // Success! Redirect based on granted role
      let target = `/dashboard/viewer/${data.mediaId}`;
      if (data.grantedRole === "reviewer") {
        target = `/dashboard/reviewer/${data.mediaId}`;
      } else if (data.grantedRole === "owner") {
        target = `/dashboard/owner/${data.mediaId}`;
      }
      
      router.replace(target);
    } catch (e) {
      setError(e.message);
      setAccepting(false);
    }
  };

  const acceptInvite = async () => {
    if (!inviteInfo || !session?.accessToken) return;

    try {
      setAccepting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invites/${token}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }
      // Force next-auth to refresh session roles by re-initiating login with absolute URL
      const role = data.nextRole || inviteInfo.role;
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const target = role === "reviewer" ? `${base}/dashboard/reviewer` : role === "viewer" ? `${base}/dashboard/viewer` : `${base}/dashboard`;
      signIn("keycloak", { callbackUrl: target });
    } catch (e) {
      setError(e.message);
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    const callbackUrl = `${window.location.origin}/share/${token}`;
    const hint = linkInfo?.inviteeEmail || inviteInfo?.email;
    if (hint) {
      signIn("keycloak", { callbackUrl, loginHint: hint });
    } else {
      signIn("keycloak", { callbackUrl });
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-3">Checking Share Link</h1>
          <p className="text-gray-300">Verifying your invitation...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3 text-red-400">Access Denied</h1>
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
          {linkInfo?.inviteeEmail && (
            <p className="text-gray-300 mb-4">
              This link is for: <strong>{linkInfo.inviteeEmail}</strong>
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!linkInfo && !inviteInfo) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3 text-red-400">Invalid Link</h1>
          <p className="text-gray-300">This share link is not valid or has expired.</p>
        </div>
      </main>
    );
  }

  if (!session?.accessToken) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3">Accept Invitation</h1>
          {linkInfo && (
            <div className="bg-blue-500/20 border border-blue-500/40 text-blue-200 px-4 py-3 rounded mb-6">
              <p className="font-semibold mb-2">You've been invited to access media as a <strong>{linkInfo.grantedRole}</strong></p>
              {linkInfo.inviteeEmail && (
                <p className="text-sm">This invitation is for: <strong>{linkInfo.inviteeEmail}</strong></p>
              )}
            </div>
          )}
          {inviteInfo && (
            <div className="bg-blue-500/20 border border-blue-500/40 text-blue-200 px-4 py-3 rounded mb-6">
              <p className="font-semibold mb-2">You've been invited to join an organization as a <strong>{inviteInfo.role}</strong></p>
              <p className="text-xs text-gray-300 mt-2">Note: Organization membership does not grant media access by itself. Use a media share link for specific media.</p>
              {inviteInfo.email && (
                <p className="text-sm">This invitation is for: <strong>{inviteInfo.email}</strong></p>
              )}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors text-lg font-medium"
          >
            {linkInfo?.inviteeEmail ? `Sign in as ${linkInfo.inviteeEmail}` : (inviteInfo?.email ? `Sign in as ${inviteInfo.email}` : "Sign in to Continue")}
          </button>
          
          <p className="text-gray-400 text-sm mt-4">
            {(linkInfo?.inviteeEmail || inviteInfo?.email)
              ? "You'll be redirected to sign in with the correct account."
              : "New users can register during the sign-in process."
            }
          </p>
        </div>
      </main>
    );
  }

  if (accepting) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-3">Setting Up Access</h1>
          <p className="text-gray-300">
            {linkInfo ? (
              <>Granting you {linkInfo.grantedRole} access to the shared media...</>
            ) : inviteInfo ? (
              <>Joining organization as {inviteInfo.role}...</>
            ) : (
              <>Finalizing your access...</>
            )}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-3">Preparing Access</h1>
        <p className="text-gray-300">
          {linkInfo ? (
            <>Setting up your {linkInfo.grantedRole} access...</>
          ) : inviteInfo ? (
            <>Setting up your {inviteInfo.role} access...</>
          ) : (
            <>Setting up your access...</>
          )}
        </p>
      </div>
    </main>
  );
}



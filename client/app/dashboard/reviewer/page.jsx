import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ReviewerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  if (!(session.roles || []).includes("reviewer")) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900 text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Reviewer Dashboard</h1>
        <p className="text-lg text-gray-300 mb-8">
          Review media, add comments, and annotate files for better collaboration.
        </p>
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-lg">
          <p className="text-gray-200">📝 Select a file to start reviewing.</p>
          {/* Placeholder for review UI */}
        </div>
      </div>
    </main>
  );
}

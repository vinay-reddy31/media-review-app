import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ViewerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  if (!(session.roles || []).includes("viewer")) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Viewer Dashboard</h1>
        <p className="text-lg text-gray-300 mb-8">
          Browse media and watch activity in real-time. This view is read-only.
        </p>
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-lg">
          <p className="text-gray-200">👀 Select a file to view details.</p>
          {/* Placeholder for viewer UI */}
        </div>
      </div>
    </main>
  );
}

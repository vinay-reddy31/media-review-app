import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  if (!(session.roles || []).includes("owner")) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Owner Dashboard</h1>
        <p className="text-lg text-gray-300 mb-8">
          Upload and manage your media with ease. You have full control over
          your workspace.
        </p>
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-lg">
          <p className="text-gray-200">📤 Drag & drop your files here or use the upload button.</p>
          {/* Placeholder for upload UI */}
        </div>
      </div>
    </main>
  );
}

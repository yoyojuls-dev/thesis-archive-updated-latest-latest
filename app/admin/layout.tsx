import { Metadata } from "next";
import AdminNavigation from "./AdminNavigation";
import getCurrentUser from "@/actions/getCurrentUser";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Dashboard - Thesis Archive Management System",
  description: "Admin panel for managing thesis documents and categories",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  // Only redirect if user exists but is not admin
  if (currentUser && currentUser.role !== "ADMIN") {
    redirect("/student/dashboard");
  }

  // If user is authenticated as admin, show with navigation
  if (currentUser && currentUser.role === "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        {/* ONLY AdminNavigation - no other navigation components */}
        <AdminNavigation currentUser={currentUser} />
        
        {/* Full-width content */}
        <div className="w-full min-h-screen">
          {children}
        </div>
      </div>
    );
  }

  // For non-authenticated users
  return <>{children}</>;
}
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import UserManagement from "./user-list";

export default async function AdminUsersPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }
  if (auth.role !== "ADMIN") {
    redirect("/portal");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">
            Crea cuentas internas con password, rol (ADMIN/VIEWER) y acceso por board.
          </p>
        </div>
        
        <UserManagement />
      </div>
    </div>
  );
}

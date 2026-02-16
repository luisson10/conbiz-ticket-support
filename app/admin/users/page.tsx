import UserManagement from "./user-list";

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">
            Create users here. They will be automatically synced as Customers in Linear.
          </p>
        </div>
        
        <UserManagement />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createUser, deleteUser, getUsers } from "@/app/actions/users";
import { getBoards } from "@/app/actions/boards";
import { AlertCircle, CheckCircle, Loader2, Trash2, UserPlus } from "lucide-react";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  boardIds: string[];
  hasPassword: boolean;
  linearCustomerId: string | null;
};

type BoardOption = {
  id: string;
  name: string;
  accountName: string;
  type: "SUPPORT" | "PROJECT";
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEWER" as "ADMIN" | "VIEWER",
    boardIds: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await getUsers();
    if (res.success) {
      setUsers(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    async function loadBoards() {
      const res = await getBoards();
      if (!res.success) return;
      setBoards(
        res.data.map((board) => ({
          id: board.id,
          name: board.name,
          accountName: board.account.name,
          type: board.type,
        }))
      );
    }
    void loadBoards();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await createUser(formData);

    if (res.success) {
      setFormData({ name: "", email: "", password: "", role: "VIEWER", boardIds: [] });
      await loadUsers();
    } else {
      setError(res.error);
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const res = await deleteUser(id);
    if (!res.success) {
      setError(res.error);
      return;
    }
    await loadUsers();
  }

  function toggleBoard(boardId: string) {
    setFormData((prev) => ({
      ...prev,
      boardIds: prev.boardIds.includes(boardId)
        ? prev.boardIds.filter((id) => id !== boardId)
        : [...prev.boardIds, boardId],
    }));
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-800">
          <UserPlus className="h-5 w-5 text-primary" />
          Create New User
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col items-end gap-4 md:flex-row">
          <div className="w-full flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="John Doe"
            />
          </div>
          <div className="w-full flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="john@example.com"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value === "ADMIN" ? "ADMIN" : "VIEWER",
                  boardIds: e.target.value === "ADMIN" ? [] : formData.boardIds,
                })
              }
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="w-full flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Min 8 caracteres"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50 md:w-auto"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add User"}
          </button>
        </form>

        {formData.role === "VIEWER" ? (
          <div className="mt-4 rounded-md border border-gray-200 p-3">
            <div className="mb-2 text-sm font-medium text-gray-700">Boards permitidos (Viewer)</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {boards.map((board) => (
                <label key={board.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.boardIds.includes(board.id)}
                    onChange={() => toggleBoard(board.id)}
                  />
                  <span>
                    {board.accountName} · {board.type} · {board.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Existing Users</h2>
        </div>

        {loading ? (
          <div className="flex justify-center p-8 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Board Access</th>
                <th className="px-6 py-3 font-medium">Linear Link</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">{user.name}</td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.role === "ADMIN"
                      ? "All boards"
                      : user.boardIds.length > 0
                        ? `${user.boardIds.length} board(s)`
                        : "None"}
                  </td>
                  <td className="px-6 py-4">
                    {user.linearCustomerId ? (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Linked
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not Linked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

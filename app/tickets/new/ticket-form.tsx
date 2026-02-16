"use client";

import { useEffect, useState } from "react";
import { createTicket } from "@/app/actions/tickets";
import { getBoards } from "@/app/actions/boards";
import { Loader2, Send, AlertCircle, CheckCircle } from "lucide-react";

export default function NewTicketForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);

  const [boardId, setBoardId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("0");
  const [dueDate, setDueDate] = useState("");

  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(
    null
  );

  useEffect(() => {
    async function init() {
      const boardsRes = await getBoards();
      if (boardsRes.success) {
        const supportBoards = boardsRes.data.filter((board: any) => board.type !== "PROJECT");
        setBoards(supportBoards);
        if (supportBoards.length > 0) setBoardId(supportBoards[0].id);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!boardId || !title || !description) return;

    setSubmitting(true);
    setResult(null);

    const res = await createTicket({
      boardId,
      title,
      description,
      priority: parseInt(priority, 10),
      dueDate: dueDate || undefined,
    });

    if (res.success) {
      setResult({ success: true, message: "Ticket created successfully!" });
      setTitle("");
      setDescription("");
      setPriority("0");
      setDueDate("");
    } else {
      setResult({ success: false, message: res.error || "Failed to create ticket." });
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit a New Ticket</h2>

      {result && (
        <div
          className={`p-4 mb-6 rounded-md flex items-center gap-2 ${
            result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {result.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {result.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
          <select
            required
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">-- Select Board --</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Brief summary of the issue"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="0">None</option>
              <option value="1">Urgent</option>
              <option value="2">High</option>
              <option value="3">Normal</option>
              <option value="4">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Detailed description..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-3 bg-primary text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {submitting ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <>
              <Send className="h-5 w-5" />
              Submit Ticket
            </>
          )}
        </button>
      </form>
    </div>
  );
}

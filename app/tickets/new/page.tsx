import NewTicketForm from "./ticket-form";

export default function NewTicketPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Submit a Support Request</h1>
        <p className="text-gray-600 mt-2">
            Please provide as much detail as possible so we can help you quickly.
        </p>
      </div>
      
      <NewTicketForm />
    </div>
  );
}

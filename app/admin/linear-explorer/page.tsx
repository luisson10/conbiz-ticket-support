import LinearExplorerView from "./explorer-view";

export default function LinearExplorerPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Linear API Explorer</h1>
          <p className="text-gray-600">
            Use this dashboard to test the connection to Linear and explore your current workspace structure.
            This helps in verifying IDs for Teams, Projects, and Labels.
          </p>
        </div>
        
        <LinearExplorerView />
      </div>
    </div>
  );
}

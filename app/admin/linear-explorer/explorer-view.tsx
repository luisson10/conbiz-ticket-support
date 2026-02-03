"use client";

import { useState, useEffect } from "react";
import { checkConnection, getTeams, getProjects, getLabels, getWorkflowStates } from "@/app/actions/linear";
import { AlertCircle, CheckCircle, ChevronRight, Layout, Tag, List, Layers, Loader2 } from "lucide-react";

export default function LinearExplorerView() {
  const [loading, setLoading] = useState<string | null>(null);
  const [connection, setConnection] = useState<any>(null);
  
  // Data State
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  
  // Detail State (fetched when team is selected)
  const [teamProjects, setTeamProjects] = useState<any[]>([]);
  const [teamStates, setTeamStates] = useState<any[]>([]);
  const [teamLabels, setTeamLabels] = useState<any[]>([]);

  // Initial Load
  useEffect(() => {
    checkConn();
    loadTeams();
  }, []);

  // When team is selected, load its details
  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam);
    }
  }, [selectedTeam]);

  const checkConn = async () => {
    setLoading("connection");
    const res = await checkConnection();
    setConnection(res);
    setLoading(null);
  };

  const loadTeams = async () => {
    const res = await getTeams();
    if (res.success) {
      setTeams(res.data);
      if (res.data.length > 0 && !selectedTeam) {
        setSelectedTeam(res.data[0].id);
      }
    }
  };

  const loadTeamDetails = async (teamId: string) => {
    setLoading("details");
    const [projectsRes, statesRes, labelsRes] = await Promise.all([
      getProjects(teamId),
      getWorkflowStates(teamId),
      getLabels(teamId)
    ]);

    if (projectsRes.success) setTeamProjects(projectsRes.data);
    if (statesRes.success) setTeamStates(statesRes.data);
    if (labelsRes.success) setTeamLabels(labelsRes.data);
    setLoading(null);
  };

  const currentTeamName = teams.find(t => t.id === selectedTeam)?.name;

  return (
    <div className="space-y-6">
      {/* Connection Status Bar */}
      {connection && (
        <div className={`p-3 rounded-md border flex items-center gap-2 text-sm ${connection.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {connection.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="font-medium">{connection.success ? `Connected as ${connection.data.name}` : connection.error}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Sidebar: Team Selection */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-medium text-gray-700">
              Teams
            </div>
            <div className="divide-y divide-gray-100">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeam(t.id)}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${
                    selectedTeam === t.id 
                      ? "bg-primary/5 text-primary font-medium border-l-2 border-primary" 
                      : "hover:bg-gray-50 text-gray-600 border-l-2 border-transparent"
                  }`}
                >
                  {t.name}
                  {selectedTeam === t.id && <ChevronRight className="h-4 w-4" />}
                </button>
              ))}
              {teams.length === 0 && <div className="p-4 text-sm text-gray-400">Loading teams...</div>}
            </div>
          </div>
        </aside>

        {/* Main Content: Team Details */}
        <main className="flex-1 space-y-6">
          {selectedTeam ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{currentTeamName}</h2>
                {loading === "details" && <Loader2 className="animate-spin h-5 w-5 text-gray-400" />}
              </div>

              {/* Projects Grid */}
              <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold border-b border-gray-100 pb-2">
                  <Layout className="h-5 w-5 text-gray-500" />
                  <h3>Projects</h3>
                  <span className="text-xs font-normal text-gray-400 ml-auto">{teamProjects.length} projects</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamProjects.length === 0 ? <p className="text-gray-400 text-sm italic col-span-full">No active projects found for this team.</p> : 
                    teamProjects.map((p) => (
                      <div key={p.id} className="p-3 border rounded-md hover:border-primary/50 transition-colors bg-gray-50">
                        <div className="font-medium text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-1 capitalize flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${p.state === 'started' ? 'bg-blue-400' : 'bg-gray-300'}`}></span>
                          {p.state}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Workflow States */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold border-b border-gray-100 pb-2">
                    <List className="h-5 w-5 text-gray-500" />
                    <h3>Workflow States</h3>
                  </div>
                  <div className="space-y-2">
                    {teamStates.map((s) => (
                      <div key={s.id} className="flex items-center p-2 rounded hover:bg-gray-50">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: s.color }}></div>
                        <span className="text-sm font-medium text-gray-700">{s.name}</span>
                        <span className="ml-auto text-xs text-gray-400 uppercase tracking-wider">{s.type}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Team Labels */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold border-b border-gray-100 pb-2">
                    <Tag className="h-5 w-5 text-gray-500" />
                    <h3>Context Labels</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teamLabels.length === 0 ? <p className="text-gray-400 text-sm italic">No team-specific labels found.</p> :
                      teamLabels.map((l) => (
                        <span
                          key={l.id}
                          className="px-2 py-1 rounded-full text-xs font-medium border transition-transform hover:scale-105 cursor-default"
                          style={{ 
                            backgroundColor: l.color ? `${l.color}15` : '#f3f4f6', 
                            color: l.color || '#374151', 
                            borderColor: l.color ? `${l.color}40` : '#e5e7eb' 
                          }}
                        >
                          {l.name}
                        </span>
                      ))
                    }
                  </div>
                </section>
              </div>

            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <Layers className="h-12 w-12 mb-4 opacity-50" />
              <p>Select a team to view its structure</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

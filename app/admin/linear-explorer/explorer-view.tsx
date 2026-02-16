"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  checkConnection,
  getLabels,
  getProjects,
  getTeams,
  getWorkflowStates,
} from "@/app/actions/linear";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Layout,
  Layers,
  List,
  Loader2,
  Tag,
} from "lucide-react";

type TeamItem = { id: string; name: string; key: string };
type ProjectItem = { id: string; name: string; state: string };
type StateItem = { id: string; name: string; type: string; color: string };
type LabelItem = { id: string; name: string; color: string | null };
type ConnectionStatus = { success: boolean; data?: { name: string; email: string }; error?: string };

export default function LinearExplorerView() {
  const [loading, setLoading] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const [teamProjects, setTeamProjects] = useState<ProjectItem[]>([]);
  const [teamStates, setTeamStates] = useState<StateItem[]>([]);
  const [teamLabels, setTeamLabels] = useState<LabelItem[]>([]);

  const checkConn = useCallback(async () => {
    setLoading("connection");
    const res = await checkConnection();
    if (res.success) {
      setConnection({ success: true, data: res.data });
    } else {
      setConnection({ success: false, error: res.error });
    }
    setLoading(null);
  }, []);

  const loadTeamDetails = useCallback(async (teamId: string) => {
    setLoading("details");
    const [projectsRes, statesRes, labelsRes] = await Promise.all([
      getProjects(teamId),
      getWorkflowStates(teamId),
      getLabels(teamId),
    ]);

    if (projectsRes.success) setTeamProjects(projectsRes.data);
    if (statesRes.success) setTeamStates(statesRes.data);
    if (labelsRes.success) setTeamLabels(labelsRes.data);
    setLoading(null);
  }, []);

  const loadTeams = useCallback(async () => {
    const res = await getTeams();
    if (res.success) {
      setTeams(res.data);
      if (res.data.length > 0) {
        setSelectedTeam((current) => current || res.data[0].id);
      }
    }
  }, []);

  useEffect(() => {
    void checkConn();
    void loadTeams();
  }, [checkConn, loadTeams]);

  useEffect(() => {
    if (selectedTeam) {
      void loadTeamDetails(selectedTeam);
    }
  }, [selectedTeam, loadTeamDetails]);

  const currentTeamName = useMemo(
    () => teams.find((team) => team.id === selectedTeam)?.name,
    [teams, selectedTeam]
  );

  return (
    <div className="space-y-6">
      {connection && (
        <div
          className={`rounded-md border p-3 text-sm ${
            connection.success
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {connection.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="font-medium">
              {connection.success
                ? `Connected as ${connection.data?.name ?? "Unknown"}`
                : connection.error}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full flex-shrink-0 md:w-64">
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 p-4 font-medium text-gray-700">Teams</div>
            <div className="divide-y divide-gray-100">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`flex w-full items-center justify-between border-l-2 px-4 py-3 text-left text-sm transition-colors ${
                    selectedTeam === team.id
                      ? "border-primary bg-primary/5 font-medium text-primary"
                      : "border-transparent text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {team.name}
                  {selectedTeam === team.id && <ChevronRight className="h-4 w-4" />}
                </button>
              ))}
              {teams.length === 0 && <div className="p-4 text-sm text-gray-400">Loading teams...</div>}
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          {selectedTeam ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{currentTeamName}</h2>
                {loading === "details" && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
              </div>

              <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-semibold text-gray-800">
                  <Layout className="h-5 w-5 text-gray-500" />
                  <h3>Projects</h3>
                  <span className="ml-auto text-xs font-normal text-gray-400">
                    {teamProjects.length} projects
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teamProjects.length === 0 ? (
                    <p className="col-span-full text-sm italic text-gray-400">
                      No active projects found for this team.
                    </p>
                  ) : (
                    teamProjects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-md border bg-gray-50 p-3 transition-colors hover:border-primary/50"
                      >
                        <div className="truncate font-medium text-gray-900">{project.name}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs capitalize text-gray-500">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              project.state === "started" ? "bg-blue-400" : "bg-gray-300"
                            }`}
                          />
                          {project.state}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-semibold text-gray-800">
                    <List className="h-5 w-5 text-gray-500" />
                    <h3>Workflow States</h3>
                  </div>
                  <div className="space-y-2">
                    {teamStates.map((state) => (
                      <div key={state.id} className="flex items-center rounded p-2 hover:bg-gray-50">
                        <div
                          className="mr-3 h-3 w-3 rounded-full"
                          style={{ backgroundColor: state.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{state.name}</span>
                        <span className="ml-auto text-xs uppercase tracking-wider text-gray-400">
                          {state.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 font-semibold text-gray-800">
                    <Tag className="h-5 w-5 text-gray-500" />
                    <h3>Context Labels</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teamLabels.length === 0 ? (
                      <p className="text-sm italic text-gray-400">No team-specific labels found.</p>
                    ) : (
                      teamLabels.map((label) => (
                        <span
                          key={label.id}
                          className="cursor-default rounded-full border px-2 py-1 text-xs font-medium transition-transform hover:scale-105"
                          style={{
                            backgroundColor: label.color ? `${label.color}15` : "#f3f4f6",
                            color: label.color || "#374151",
                            borderColor: label.color ? `${label.color}40` : "#e5e7eb",
                          }}
                        >
                          {label.name}
                        </span>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
              <Layers className="mb-4 h-12 w-12 opacity-50" />
              <p>Select a team to view its structure</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

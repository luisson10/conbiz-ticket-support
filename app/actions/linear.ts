"use server";

import { linearClient } from "@/lib/linear";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/contracts/action-result";

type TeamDto = { id: string; name: string; key: string };
type ProjectDto = { id: string; name: string; state: string };
type LabelDto = { id: string; name: string; color: string | null };
type WorkflowStateDto = { id: string; name: string; type: string; color: string };
type ViewerDto = { name: string; email: string };
type CustomerDto = { id: string; name: string; email: string };

export async function checkConnection(): Promise<ActionResult<ViewerDto>> {
  try {
    await requireAdmin();
    const viewer = await linearClient.viewer;
    return {
      success: true,
      data: { name: viewer.name ?? "Unknown", email: viewer.email ?? "" },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to verify Linear connection.");
  }
}

export async function getTeams(): Promise<ActionResult<TeamDto[]>> {
  try {
    await requireAuth();
    const teams = await linearClient.teams();
    return {
      success: true,
      data: teams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
        key: team.key,
      })),
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load teams.");
  }
}

export async function getProjects(teamId?: string): Promise<ActionResult<ProjectDto[]>> {
  try {
    await requireAuth();

    const projects = teamId
      ? await (await linearClient.team(teamId)).projects()
      : await linearClient.projects();

    return {
      success: true,
      data: projects.nodes.map((project) => ({
        id: project.id,
        name: project.name,
        state: project.state,
      })),
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load projects.");
  }
}

export async function getLabels(teamId?: string): Promise<ActionResult<LabelDto[]>> {
  try {
    await requireAuth();
    const filter = teamId ? { team: { id: { eq: teamId } } } : undefined;
    const labels = await linearClient.issueLabels({ filter });
    return {
      success: true,
      data: labels.nodes.map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
      })),
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load labels.");
  }
}

export async function getWorkflowStates(teamId?: string): Promise<ActionResult<WorkflowStateDto[]>> {
  try {
    await requireAuth();
    const states = await linearClient.workflowStates({
      filter: teamId ? { team: { id: { eq: teamId } } } : undefined,
    });
    return {
      success: true,
      data: states.nodes.map((state) => ({
        id: state.id,
        name: state.name,
        type: state.type,
        color: state.color,
      })),
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to load workflow states.");
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailDomain(email: string): string | null {
  const parts = normalizeEmail(email).split("@");
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1];
}

export async function findCustomer(email: string): Promise<ActionResult<CustomerDto | null>> {
  try {
    await requireAdmin();

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { success: true, data: null };
    }

    // Email is stored using externalIds in our integration model.
    const customers = await linearClient.customers({
      first: 250,
      filter: {
        externalIds: {
          some: {
            eqIgnoreCase: normalizedEmail,
          },
        },
      },
    });

    const found = customers.nodes.find((customer) => {
      return customer.externalIds.some((externalId) => normalizeEmail(externalId) === normalizedEmail);
    });

    if (!found) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: found.id,
        name: found.name,
        email: normalizedEmail,
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to find customer.");
  }
}

export async function createCustomer(name: string, email: string): Promise<ActionResult<CustomerDto>> {
  try {
    await requireAdmin();
    const normalizedEmail = normalizeEmail(email);
    const domain = emailDomain(normalizedEmail);
    const response = await linearClient.createCustomer({
      name,
      externalIds: [normalizedEmail],
      domains: domain ? [domain] : undefined,
    });

    const customer = await response.customer;
    if (!customer) {
      return { success: false, error: "Failed to create customer" };
    }

    return {
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: normalizedEmail,
      },
    };
  } catch (error: unknown) {
    return actionError(error, "Failed to create customer.");
  }
}

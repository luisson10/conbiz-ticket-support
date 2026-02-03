"use server";

import { linearClient } from "@/lib/linear";
import { requireAdmin, requireAuth } from "@/lib/auth";

// ... existing code ...

export async function checkConnection() {
  try {
    requireAdmin();
    const viewer = await linearClient.viewer;
    return { success: true, data: { name: viewer.name, email: viewer.email } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTeams() {
  try {
    requireAuth();
    const teams = await linearClient.teams();
    return {
      success: true,
      data: teams.nodes.map((t) => ({ id: t.id, name: t.name, key: t.key })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjects(teamId?: string) {
  try {
    requireAuth();
    let projects;
    
    if (teamId) {
      // Fetch projects specifically for this team using the team relation
      // This is often more reliable than filtering the global list
      const team = await linearClient.team(teamId);
      projects = await team.projects();
    } else {
      projects = await linearClient.projects();
    }
    
    return {
      success: true,
      data: projects.nodes.map((p) => ({
        id: p.id,
        name: p.name,
        state: p.state,
      })),
    };
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return { success: false, error: error.message };
  }
}

export async function getLabels(teamId?: string) {
  try {
    requireAuth();
    const filter = teamId ? { team: { id: { eq: teamId } } } : undefined;
    const labels = await linearClient.issueLabels({ filter });
    return {
      success: true,
      data: labels.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getWorkflowStates(teamId?: string) {
    try {
        requireAuth();
        const states = await linearClient.workflowStates({
             filter: teamId ? { team: { id: { eq: teamId } } } : undefined
        });
        return {
            success: true,
            data: states.nodes.map(s => ({ id: s.id, name: s.name, type: s.type, color: s.color }))
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// New actions for Customer Management
export async function findCustomer(email: string) {
  try {
    requireAdmin();
    // Linear doesn't have a direct "find by email" for customers easily exposed in simple filters sometimes,
    // but let's try filtering.
    const customers = await linearClient.customers({
      filter: { email: { eq: email } }
    });
    
    if (customers.nodes.length > 0) {
      return { success: true, data: customers.nodes[0] };
    }
    return { success: true, data: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCustomer(name: string, email: string) {
  try {
    requireAdmin();
    const response = await linearClient.createCustomer({
      name,
      email,
    });
    
    const customer = await response.customer;
    if (!customer) {
        return { success: false, error: "Failed to create customer" };
    }

    return {
      success: true,
      data: { id: customer.id, name: customer.name, email: customer.email },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

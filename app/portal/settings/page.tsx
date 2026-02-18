import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import SettingsView from "./settings-view";

export default async function PortalSettingsPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }
  if (auth.role !== "ADMIN") {
    redirect("/portal");
  }

  return <SettingsView />;
}

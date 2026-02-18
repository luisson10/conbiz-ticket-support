import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import PortalView from "./portal-view";

export default async function PortalPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }

  return (
    <Suspense fallback={null}>
      <PortalView />
    </Suspense>
  );
}

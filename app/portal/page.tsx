import { Suspense } from "react";
import PortalView from "./portal-view";

export default function PortalPage() {
  return (
    <Suspense fallback={null}>
      <PortalView />
    </Suspense>
  );
}

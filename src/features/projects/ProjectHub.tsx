import { lazy, Suspense } from "react";
import { needsAccountStack } from "@/features/sync/authBootstrap";
import ProjectHubContent, { HubSignInLink } from "./ProjectHubContent";

const SignedInHub = lazy(() => import("./SignedInHub"));

export default function ProjectHub() {
  // First-time visitors never download the account, lock or encryption stack.
  if (!needsAccountStack()) return <ProjectHubContent account={<HubSignInLink />} />;
  return <Suspense fallback={null}><SignedInHub /></Suspense>;
}

import { useEffect } from "react";
import AppLockGate from "@/features/lock/components/AppLockGate";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import HubAccountMenu from "./HubAccountMenu";
import ProjectHubContent, { HubSignInLink } from "./ProjectHubContent";

// Loaded only when a session or lock state may exist; keeps the hub PIN gate.
export default function SignedInHub() {
  const hubLockRequired = useAppLockStore((s) => s.hubLockRequired);
  const user = useAuthStore((state) => state.user);
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);
  const metadata = user?.user_metadata;
  const profileName = [metadata?.first_name, metadata?.last_name].filter((value) => typeof value === "string" && value.trim()).join(" ");
  const accountName = profileName || (typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "") || user?.email || "บัญชีของฉัน";
  const content = <ProjectHubContent account={user ? <HubAccountMenu name={accountName} /> : <HubSignInLink />} />;
  return hubLockRequired ? <AppLockGate>{content}</AppLockGate> : content;
}

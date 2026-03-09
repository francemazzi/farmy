import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Loader2 } from "lucide-react";

export function SetupRedirect() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    apiClient<{ needsSetup: boolean }>("/setup/status")
      .then((data) => setNeedsSetup(data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  if (needsSetup === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return <Navigate to="/login" replace />;
}

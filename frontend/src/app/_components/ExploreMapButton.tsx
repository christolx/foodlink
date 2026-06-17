"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { demoLogin, getMyProfile } from "@/lib/session";

type ExploreMapButtonProps = {
  children: ReactNode;
};

export function ExploreMapButton({ children }: ExploreMapButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openVolunteerMap() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await demoLogin("volunteer");
      await getMyProfile(response.accessToken);
      router.replace("/app");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Demo API unavailable. Check backend and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="map-login">
      <button
        type="button"
        onClick={openVolunteerMap}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? "Opening map..." : "Explore map"}
        {children}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

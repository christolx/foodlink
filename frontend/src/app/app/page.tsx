"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  listDeliveryProposals,
  listDonations,
  listNotifications,
  listPickups,
  listReceivers,
} from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { getMe, getMyProfile } from "@/lib/session";
import { ChatPanel } from "./chat-panel";
import { DashboardErrorBoundary } from "./dashboard-error-boundary";
import {
  DashboardSidebar,
  DashboardTopbar,
  DonorBottomNavigation,
  ReceiverBottomNavigation,
  VolunteerBottomNavigation,
} from "./dashboard-layout";
import { NotificationsPanel, NotificationsSlidePanel } from "./dashboard-shared";
import type {
  ActionState,
  DashboardData,
  SidePanelType,
} from "./dashboard-types";
import { cx, leafMark } from "./dashboard-ui";
import { DonorDashboard } from "./donor-dashboard";
import { ReceiverDashboard } from "./receiver-dashboard";
import { VolunteerDashboard } from "./volunteer-dashboard";

export default function AppPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<ActionState>(null);
  const [activePanel, setActivePanel] = useState<SidePanelType | null>(null);
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [volunteerStatusFilter, setVolunteerStatusFilter] = useState<"All" | "Available" | "Proposal pending">("All");

  // biome-ignore lint/correctness/useExhaustiveDependencies: bootstrap runs once; action refresh reuses latest token.
  useEffect(() => {
    const storedToken = getToken();

    if (!storedToken) {
      router.replace("/demo");
      return;
    }

    setToken(storedToken);
    async function bootstrap() {
      try {
        await refresh(storedToken);
      } catch {
        clearToken();
        router.replace("/demo");
      }
    }

    void bootstrap();
  }, [router]);

  async function refresh(activeToken = token) {
    if (!activeToken) {
      return;
    }

    setIsLoading(true);
    const [user, profile, donations, proposals, pickups, notifications] =
      await Promise.all([
        getMe(activeToken),
        getMyProfile(activeToken),
        listDonations(activeToken),
        listDeliveryProposals(activeToken),
        listPickups(activeToken),
        listNotifications(activeToken),
      ]);
    const receivers =
      user.role === "volunteer" ? await listReceivers(activeToken) : null;

    setData({
      user,
      profile,
      donations: donations.items,
      proposals: proposals.items,
      pickups: pickups.items,
      receivers: receivers?.items ?? [],
      notifications: notifications.items,
    });
    setIsLoading(false);
  }

  function signOut() {
    clearToken();
    router.replace("/demo");
  }

  async function runAction(callback: () => Promise<void>, success: string) {
    try {
      setAction(null);
      await callback();
      setAction({ message: success, tone: "success" });
      await refresh();
    } catch (err) {
      setAction({
        message: err instanceof Error ? err.message : "Action failed.",
        tone: "error",
      });
    }
  }

  if (isLoading || !data || !token) {
    return (
      <main className="grid min-h-screen place-items-center content-center gap-4 bg-[#f7f4e9] text-[#073515]">
        <span className={cx(leafMark, "h-12 w-12")} aria-hidden="true" />
        <p className="font-black">Loading FoodLink dashboard...</p>
      </main>
    );
  }

  return (
    <DashboardErrorBoundary>
      <main className="grid min-h-screen overflow-x-clip bg-[#f8f6ef] text-[#101812] lg:grid-cols-[13.75rem_minmax(0,1fr)]">
        <DashboardSidebar
          data={data}
          signOut={signOut}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
        />

        <section
          className={cx(
            "mx-auto w-full min-w-0 max-w-[116rem] px-4 py-5 lg:px-8 lg:py-7",
            (data.user.role === "donor" || data.user.role === "receiver") &&
              "pb-28 lg:pb-7",
          )}
          aria-labelledby="dashboard-title"
        >
          <DashboardTopbar
            data={data}
            volunteerSearch={volunteerSearch}
            onVolunteerSearch={setVolunteerSearch}
            volunteerStatusFilter={volunteerStatusFilter}
            onVolunteerFilter={() =>
              setVolunteerStatusFilter((f) =>
                f === "All" ? "Available" : f === "Available" ? "Proposal pending" : "All",
              )
            }
          />

          {action ? (
            <p
              className={cx(
                "mb-4 rounded-md border px-4 py-3 text-sm font-black",
                action.tone === "success"
                  ? "border-[#93c7a2] bg-[#e8f1e6] text-[#14351f]"
                  : "border-[#f0a59b] bg-[#fff0eb] text-[#80251d]",
              )}
            >
              {action.message}
            </p>
          ) : null}

          {data.user.role === "donor" ? (
            <DonorDashboard data={data} token={token} runAction={runAction} />
          ) : null}
          {data.user.role !== "donor" ? (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="grid gap-4" id="work">
                {data.user.role === "volunteer" ? (
                  <VolunteerDashboard
                    data={data}
                    token={token}
                    runAction={runAction}
                    search={volunteerSearch}
                    statusFilter={volunteerStatusFilter}
                  />
                ) : null}
                {data.user.role === "receiver" ? (
                  <ReceiverDashboard
                    data={data}
                    token={token}
                    runAction={runAction}
                  />
                ) : null}
              </div>
              {data.user.role === "volunteer" ? (
                <div className="hidden xl:block">
                  <NotificationsPanel
                    notifications={data.notifications}
                    viewerRole={data.user.role}
                    token={token}
                    runAction={runAction}
                    onSettingsClick={() => setActivePanel("settings")}
                  />
                </div>
              ) : (
                <NotificationsPanel
                  notifications={data.notifications}
                  viewerRole={data.user.role}
                  token={token}
                  runAction={runAction}
                  onSettingsClick={() => setActivePanel("settings")}
                />
              )}
            </div>
          ) : null}
        </section>
        {activePanel === "messages" && (
          <ChatPanel
            token={token}
            myUserId={data.user.id}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "notifications" && (
          <NotificationsSlidePanel
            notifications={data.notifications}
            token={token}
            runAction={runAction}
            onClose={() => setActivePanel(null)}
          />
        )}
        {data.user.role === "donor" ? <DonorBottomNavigation /> : null}
        {data.user.role === "receiver" ? <ReceiverBottomNavigation /> : null}
        {data.user.role === "volunteer" ? <VolunteerBottomNavigation /> : null}
      </main>
    </DashboardErrorBoundary>
  );
}

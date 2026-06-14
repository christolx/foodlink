"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CldUploadWidget,
  type CloudinaryUploadWidgetInfo,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  acceptDeliveryProposal,
  createDeliveryProposal,
  createDonation,
  type DeliveryProposal,
  type Donation,
  listDeliveryProposals,
  listDonations,
  listNotifications,
  listPickups,
  listReceivers,
  markNotificationRead,
  markPickupDelivered,
  markPickupPickedUp,
  type Notification,
  type Pickup,
  type Profile,
  rejectDeliveryProposal,
  type User,
  updateMyProfile,
} from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { getMe, getMyProfile } from "@/lib/session";
import {
  AppIcon,
  badgeBase,
  compactFoodDescription,
  cx,
  DonationThumbnail,
  defaultDonationImage,
  demoLocation,
  donorDisplayName,
  emptyCopy,
  formatDate,
  formatTime,
  ghostButton,
  heading,
  type IconName,
  input,
  leafMark,
  panel,
  primaryButton,
  quantityNumber,
  readableDonationId,
  receiverNotificationTitle,
  roleLabels,
  statusClass,
} from "./dashboard-ui";

const LocationPickerMapDynamic = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
});

const VolunteerMapDynamic = dynamic(() => import("./VolunteerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[#46534a]">
      Loading map…
    </div>
  ),
});

type DashboardData = {
  user: User;
  profile: Profile;
  donations: Donation[];
  proposals: DeliveryProposal[];
  pickups: Pickup[];
  receivers: Profile[];
  notifications: Notification[];
};

type ActionState = {
  message: string;
  tone: "success" | "error";
} | null;

const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const cloudinaryUploadEnabled =
  Boolean(cloudinaryCloudName) && Boolean(cloudinaryUploadPreset);

function uploadResultInfo(
  result: CloudinaryUploadWidgetResults,
): CloudinaryUploadWidgetInfo | null {
  return typeof result.info === "object" ? result.info : null;
}

function uploadErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "statusText" in error &&
    typeof error.statusText === "string"
  ) {
    return error.statusText;
  }
  return "Image upload failed.";
}

export default function AppPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<ActionState>(null);

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
    <main className="grid min-h-screen overflow-x-clip bg-[#f8f6ef] text-[#101812] lg:grid-cols-[13.75rem_minmax(0,1fr)]">
      <DashboardSidebar data={data} signOut={signOut} />

      <section
        className={cx(
          "mx-auto w-full min-w-0 max-w-[116rem] px-4 py-5 lg:px-8 lg:py-7",
          data.user.role === "donor" && "pb-28 lg:pb-7",
        )}
        aria-labelledby="dashboard-title"
      >
        <DashboardTopbar data={data} />

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
            <NotificationsPanel
              notifications={data.notifications}
              viewerRole={data.user.role}
              token={token}
              runAction={runAction}
            />
          </div>
        ) : null}
      </section>
      {data.user.role === "donor" ? <DonorBottomNavigation /> : null}
    </main>
  );
}

type SidePanelType = "profile" | "settings" | "reports" | "help";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <>
      <button
        aria-label="Close modal"
        className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="fixed left-1/2 top-1/2 z-[1101] max-h-[88vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-[#fffdf8] shadow-2xl">
        <header className="sticky top-0 flex items-center gap-3 border-b border-[#e4ddcf] bg-[#fffdf8] px-6 py-5">
          <h2 className="flex-1 font-serif text-lg font-black tracking-tight text-[#061e0e]">
            {title}
          </h2>
          <button
            className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f0ece4]"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </>,
    document.body,
  );
}

function SlidePanel({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: IconName;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <>
      <button
        aria-label="Close panel"
        className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="fixed right-0 top-0 z-[1101] flex h-full w-full max-w-sm flex-col bg-[#fffdf8] shadow-2xl">
        <header className="flex items-center gap-3 border-b border-[#e4ddcf] px-6 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f1df] text-[#14733a]">
            <AppIcon name={icon} className="h-5 w-5" />
          </span>
          <h2 className="flex-1 font-serif text-lg font-black tracking-tight text-[#061e0e]">
            {title}
          </h2>
          <button
            className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f0ece4]"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>,
    document.body,
  );
}

function ProfilePanelContent({
  data,
  initials,
}: {
  data: DashboardData;
  initials: string;
}) {
  const rows = [
    {
      label: "Role",
      value: data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1),
    },
    { label: "Email", value: data.user.email },
    {
      label: "Contact",
      value: `${data.profile.contactMethod} · ${data.profile.contactValue}`,
    },
    { label: "City", value: data.profile.location.city || "—" },
    { label: "Region", value: data.profile.location.region || "—" },
    ...(data.profile.entityType
      ? [{ label: "Entity", value: data.profile.entityType.replace(/_/g, " ") }]
      : []),
    ...(data.profile.operationalHours
      ? [{ label: "Hours", value: data.profile.operationalHours }]
      : []),
  ];
  return (
    <div className="grid gap-6">
      <div className="flex flex-col items-center gap-3 pb-6 border-b border-[#e4ddcf]">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-[#ffbd1a] text-2xl font-black text-[#052b12] shadow-md">
          {initials}
        </span>
        <div className="text-center">
          <strong className="block text-xl font-black text-[#101812]">
            {data.profile.displayName}
          </strong>
          <span className="mt-1 block text-sm font-bold text-[#46534a]">
            {data.user.email}
          </span>
        </div>
      </div>
      <div className="grid gap-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
            <span className="font-bold text-[#46534a]">{label}</span>
            <span className="font-black text-[#101812] break-all">{value}</span>
          </div>
        ))}
      </div>
      {data.profile.notes && (
        <div className="rounded-lg bg-[#f0f7eb] p-4 text-sm">
          <strong className="block text-xs font-black uppercase tracking-wide text-[#2f7a46] mb-2">
            Notes
          </strong>
          <p className="font-bold text-[#1f2a23] leading-5">
            {data.profile.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function SettingsPanelContent() {
  const [notifPickup, setNotifPickup] = useState(true);
  const [notifProposal, setNotifProposal] = useState(true);
  const [notifDelivery, setNotifDelivery] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  function Toggle({
    checked,
    onChange,
    label,
    description,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
    description: string;
  }) {
    return (
      <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
        <div>
          <strong className="block text-sm font-black text-[#101812]">
            {label}
          </strong>
          <span className="mt-0.5 block text-xs font-bold text-[#46534a]">
            {description}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={onChange}
          className={cx(
            "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border-2 transition-colors",
            checked
              ? "border-[#14733a] bg-[#14733a]"
              : "border-[#c9c4b8] bg-[#e8e4dc]",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </label>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-[#46534a]">
          Notifications
        </h3>
        <div className="divide-y divide-[#e4ddcf] rounded-lg border border-[#e4ddcf] bg-white px-4">
          <Toggle
            checked={notifPickup}
            onChange={() => setNotifPickup((v) => !v)}
            label="Pickup assigned"
            description="When a new pickup is assigned to you"
          />
          <Toggle
            checked={notifProposal}
            onChange={() => setNotifProposal((v) => !v)}
            label="Proposal accepted"
            description="When your proposal is accepted"
          />
          <Toggle
            checked={notifDelivery}
            onChange={() => setNotifDelivery((v) => !v)}
            label="Delivery confirmed"
            description="When the receiver confirms delivery"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-[#46534a]">
          Display
        </h3>
        <div className="divide-y divide-[#e4ddcf] rounded-lg border border-[#e4ddcf] bg-white px-4">
          <Toggle
            checked={compactMode}
            onChange={() => setCompactMode((v) => !v)}
            label="Compact mode"
            description="Reduce spacing in donation list"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-[#46534a]">
          Account
        </h3>
        <div className="rounded-lg border border-[#e4ddcf] bg-white px-4 py-3 text-sm font-bold text-[#46534a]">
          Settings are saved automatically.
        </div>
      </div>
    </div>
  );
}

function ReportsPanelContent({ data }: { data: DashboardData }) {
  const delivered = data.pickups.filter((p) => p.status === "delivered").length;
  const pickedUp = data.pickups.filter((p) => p.status === "picked_up").length;
  const totalPickups = data.pickups.length;
  const acceptedProposals = data.proposals.filter(
    (p) => p.status === "accepted",
  ).length;
  const pendingProposals = data.proposals.filter(
    (p) => p.status === "pending",
  ).length;
  const donationsHelped = new Set(data.pickups.map((p) => p.donationId)).size;

  const stats = [
    {
      label: "Deliveries completed",
      value: delivered,
      color: "bg-[#e5f1df] text-[#14733a]",
    },
    {
      label: "In progress",
      value: pickedUp,
      color: "bg-[#fff3cd] text-[#856404]",
    },
    {
      label: "Total pickups",
      value: totalPickups,
      color: "bg-[#e8f0fe] text-[#1a56db]",
    },
    {
      label: "Proposals accepted",
      value: acceptedProposals,
      color: "bg-[#e5f1df] text-[#14733a]",
    },
    {
      label: "Proposals pending",
      value: pendingProposals,
      color: "bg-[#fff3cd] text-[#856404]",
    },
    {
      label: "Donations helped",
      value: donationsHelped,
      color: "bg-[#fce8ff] text-[#7e22ce]",
    },
  ];

  return (
    <div className="grid gap-6">
      <p className="text-sm font-bold text-[#46534a]">
        Your activity summary across all sessions.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className={cx(
              "rounded-xl p-4",
              color.split(" ")[0],
              "border border-black/5",
            )}
          >
            <strong className="block text-2xl font-black">{value}</strong>
            <span
              className={cx(
                "mt-1 block text-xs font-bold",
                color.split(" ")[1],
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      {data.pickups.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-[#46534a]">
            Recent pickups
          </h3>
          <div className="grid gap-2">
            {[...data.pickups].slice(0, 4).map((pickup) => (
              <div
                key={pickup.id}
                className="flex items-center justify-between rounded-lg border border-[#e4ddcf] bg-white px-3 py-2 text-xs"
              >
                <span className="font-black text-[#101812]">
                  #{pickup.id.slice(0, 8)}
                </span>
                <span
                  className={cx(
                    badgeBase,
                    pickup.status === "delivered"
                      ? "bg-[#dcebd5] text-[#14351f]"
                      : "bg-[#fee8ba] text-[#4d3510]",
                  )}
                >
                  {pickup.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HelpPanelContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = [
    {
      q: "How do I accept a donation?",
      a: "Browse available donations in the left panel. Select one, choose a receiver from the right panel, then click 'Create proposal' to submit a delivery proposal.",
    },
    {
      q: "What happens after I create a proposal?",
      a: "The donor reviews and accepts it. Once accepted, a pickup is automatically assigned to you. You'll see it in the 'Active pickup' panel.",
    },
    {
      q: "How do I mark a pickup as complete?",
      a: "In the Active pickup panel, first click 'Mark picked up' when you collect the food. After delivering it, click 'Mark delivered'. The receiver will confirm receipt.",
    },
    {
      q: "What does 'Proposal pending' mean on a donation?",
      a: "Another volunteer has already submitted a proposal for that donation and it's awaiting approval. You cannot select these donations.",
    },
    {
      q: "How do I contact the donor or receiver?",
      a: "Expand a proposal card to see contact details. Use the 'Message on WhatsApp' button to reach them directly.",
    },
    {
      q: "Who can I contact for support?",
      a: "Reach out to the FoodLink team via the contact details on the main website, or ask your coordinator directly.",
    },
  ];

  return (
    <div className="grid gap-4">
      <p className="text-sm font-bold text-[#46534a]">
        Common questions about using FoodLink as a volunteer.
      </p>
      <div className="grid gap-2">
        {faqs.map(({ q, a }, i) => (
          <div
            key={q}
            className="overflow-hidden rounded-lg border border-[#e4ddcf]"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-black text-[#101812] hover:bg-[#f7f5f0]"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              {q}
              <AppIcon
                name="chevron"
                className={cx(
                  "h-4 w-4 shrink-0 text-[#46534a] transition-transform",
                  openIndex === i && "rotate-180",
                )}
              />
            </button>
            {openIndex === i && (
              <div className="border-t border-[#e4ddcf] bg-[#fafaf7] px-4 py-3 text-xs font-bold leading-5 text-[#1f2a23]">
                {a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSidebar({
  data,
  signOut,
}: {
  data: DashboardData;
  signOut: () => void;
}) {
  const role = data.user.role;
  const initials = data.profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [activePanel, setActivePanel] = useState<SidePanelType | null>(null);
  const [activeHref, setActiveHref] = useState<string>("#dashboard-title");

  const navItems = useMemo(() => {
    if (role === "receiver") {
      const pendingCount = data.proposals.filter(
        (p) => p.status === "pending",
      ).length;
      return [
        {
          label: "Dashboard",
          icon: "dashboard" as IconName,
          href: "#dashboard-title",
        },
        {
          label: "Proposals",
          icon: "box" as IconName,
          href: "#proposal-queue",
          badge: pendingCount,
        },
        { label: "Deliveries", icon: "pickup" as IconName, href: "#work" },
        { label: "Needs", icon: "bag" as IconName, href: "#my-food-requests" },
        {
          label: "Messages",
          icon: "message" as IconName,
          href: "#notifications",
          badge: 2,
        },
      ];
    }
    if (role === "volunteer") {
      const availableCount = data.donations.filter(
        (d) => d.status === "available",
      ).length;
      return [
        {
          label: "Dashboard",
          icon: "dashboard" as IconName,
          href: "#dashboard-title",
        },
        {
          label: "Available donations",
          icon: "bag" as IconName,
          href: "#available-donations",
          badge: availableCount,
        },
        {
          label: "Receivers",
          icon: "team" as IconName,
          href: "#receiver-directory",
        },
        {
          label: "My proposals",
          icon: "box" as IconName,
          href: "#my-proposals",
        },
        {
          label: "Pickups",
          icon: "pickup" as IconName,
          href: "#active-pickup",
        },
        {
          label: "History",
          icon: "clock" as IconName,
          href: "#today-at-a-glance",
        },
        {
          label: "Messages",
          icon: "message" as IconName,
          href: "#notifications",
        },
        {
          label: "Reports",
          icon: "chart" as IconName,
          panel: "reports" as SidePanelType,
        },
        {
          label: "Profile",
          icon: "profile" as IconName,
          panel: "profile" as SidePanelType,
        },
        {
          label: "Settings",
          icon: "settings" as IconName,
          panel: "settings" as SidePanelType,
        },
        {
          label: "Help & support",
          icon: "message" as IconName,
          panel: "help" as SidePanelType,
        },
      ];
    }
    // Donor
    return [
      {
        label: "Dashboard",
        icon: "dashboard" as IconName,
        href: "#dashboard-title",
      },
      { label: "My donations", icon: "bag" as IconName, href: "#my-donations" },
      { label: "Proposals", icon: "box" as IconName, href: "#proposal-queue" },
      { label: "Pickups", icon: "pickup" as IconName, href: "#work" },
      {
        label: "Notifications",
        icon: "bell" as IconName,
        href: "#notifications",
      },
    ];
  }, [role, data]);

  const topHeader = useMemo(() => {
    if (role === "receiver") {
      return (
        <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#116b35] text-xl font-black text-[#ffbd1a] border-2 border-[#ffbd1a]/30 shadow-md">
            <AppIcon name="leaf" className="h-8 w-8 text-[#ffbd1a]" />
          </span>
          <div className="mt-2 grid justify-items-center">
            <strong className="flex items-center gap-1.5 text-base font-black">
              {data.profile.displayName}
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ffbd1a] text-[0.6rem] font-bold text-[#052b12]">
                ✓
              </span>
            </strong>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="profile" className="h-3.5 w-3.5" />
              Receiver
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="marker" className="h-3.5 w-3.5" />
              {data.profile.location.city || "Jakarta Selatan"}
            </span>
          </div>
        </div>
      );
    }
    if (role === "volunteer") {
      return (
        <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ffbd1a] text-xl font-black text-[#052b12] border-2 border-white/20 shadow-md">
            {initials}
          </span>
          <div className="mt-2 grid justify-items-center">
            <strong className="text-base font-black">
              {data.profile.displayName}
            </strong>
            <span className="mt-1 text-xs font-bold text-[#dfe8dc]/80">
              Volunteer
            </span>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#ffbd1a]/45 bg-[#ffbd1a]/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-[#ffbd1a]">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </div>
          </div>
        </div>
      );
    }
    if (role === "donor") {
      return (
        <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ffbd1a] text-xl font-black text-[#052b12] border-2 border-white/20 shadow-md">
            {initials}
          </span>
          <div className="mt-2 grid justify-items-center">
            <strong className="flex items-center gap-1.5 text-base font-black">
              {data.profile.displayName}
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ffbd1a] text-[0.6rem] font-bold text-[#052b12]">
                ✓
              </span>
            </strong>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="profile" className="h-3.5 w-3.5" />
              Donor
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="marker" className="h-3.5 w-3.5" />
              {data.profile.location.city || "Jakarta"}
            </span>
          </div>
        </div>
      );
    }
    return (
      <Link className="mx-auto text-[#ffbf1c]" href="/" aria-label="FoodLink">
        <AppIcon name="leaf" className="h-14 w-14" />
      </Link>
    );
  }, [role, data, initials]);

  const bottomCard = useMemo(() => {
    if (role === "receiver") {
      return (
        <div className="rounded-lg border border-white/10 bg-[#0b4c25]/45 p-5">
          <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ffbd1a]/15 text-[#ffbd1a]">
            <AppIcon name="leaf" className="h-5 w-5" />
          </span>
          <strong className="block text-sm font-black leading-5 text-[#ffbd1a]">
            Together we turn surplus into hope
          </strong>
          <p className="mt-3 text-xs font-bold leading-5 text-[#dfe8dc]">
            Thank you for serving your community.
          </p>
        </div>
      );
    }
    if (role === "volunteer") {
      return (
        <div className="rounded-lg border border-white/10 bg-[#0b4c25]/45 p-5">
          <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ffbd1a]/15 text-[#ffbd1a]">
            <AppIcon name="navigation" className="h-5 w-5" />
          </span>
          <strong className="block text-sm font-black leading-5 text-[#ffbd1a]">
            Every pickup makes a difference
          </strong>
          <p className="mt-3 text-xs font-bold leading-5 text-[#dfe8dc]">
            Thank you for showing up today.
          </p>
        </div>
      );
    }
    // Donor
    return (
      <div className="rounded-lg border border-white/10 bg-[#0b4c25]/45 p-5">
        <AppIcon name="leaf" className="mb-6 h-9 w-9 text-[#1ea35a]" />
        <strong className="block text-sm font-black leading-5">
          Every meal makes a difference
        </strong>
        <p className="mt-4 text-xs font-bold leading-5 text-[#dfe8dc]">
          Thank you for feeding our community.
        </p>
      </div>
    );
  }, [role]);

  const donorSidebarClass =
    role === "donor" ? "max-lg:hidden" : "max-lg:static max-lg:h-auto";

  return (
    <aside
      className={cx(
        "sticky top-0 grid h-screen grid-rows-[auto_1fr_auto_auto] gap-6 bg-[radial-gradient(circle_at_70%_92%,rgba(30,112,48,0.32),transparent_12rem),linear-gradient(180deg,#063514_0%,#052b12_52%,#031b0c_100%)] px-4 py-6 text-[#f8f5ea]",
        donorSidebarClass,
      )}
      aria-label="Dashboard navigation"
    >
      {topHeader}
      <nav className="flex flex-col gap-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            "panel" in item && item.panel
              ? activePanel === item.panel
              : "href" in item && item.href === activeHref;
          const sharedClass = cx(
            "flex min-h-10 items-center gap-3.5 rounded-lg px-4 text-sm font-black transition shrink-0",
            isActive
              ? "bg-[#116b35] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              : "hover:bg-white/10",
          );
          const badge =
            item.badge !== undefined && item.badge > 0 ? (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-[0.65rem] font-black text-[#052b12]">
                {item.badge}
              </span>
            ) : null;

          if ("panel" in item && item.panel) {
            return (
              <button
                key={item.label}
                type="button"
                className={sharedClass}
                onClick={() =>
                  setActivePanel(
                    activePanel === item.panel
                      ? null
                      : (item.panel as SidePanelType),
                  )
                }
              >
                <AppIcon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
                {badge}
              </button>
            );
          }

          return (
            <a
              key={item.label}
              className={sharedClass}
              href={item.href}
              onClick={() => {
                setActiveHref(item.href ?? "");
                setActivePanel(null);
              }}
            >
              <AppIcon name={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
              {badge}
            </a>
          );
        })}
      </nav>

      {activePanel && (
        <SlidePanel
          title={
            activePanel === "profile"
              ? "My profile"
              : activePanel === "settings"
                ? "Settings"
                : activePanel === "reports"
                  ? "Reports"
                  : "Help & support"
          }
          icon={
            activePanel === "profile"
              ? "profile"
              : activePanel === "settings"
                ? "settings"
                : activePanel === "reports"
                  ? "chart"
                  : "message"
          }
          onClose={() => setActivePanel(null)}
        >
          {activePanel === "profile" && (
            <ProfilePanelContent data={data} initials={initials} />
          )}
          {activePanel === "settings" && <SettingsPanelContent />}
          {activePanel === "reports" && <ReportsPanelContent data={data} />}
          {activePanel === "help" && <HelpPanelContent />}
        </SlidePanel>
      )}
      {bottomCard}
      <button
        className="flex min-h-10 items-center gap-3.5 rounded-lg px-4 text-sm font-black transition hover:bg-white/10 shrink-0"
        type="button"
        onClick={signOut}
      >
        <AppIcon name="pickup" className="h-5 w-5 rotate-180" />
        Log out
      </button>
    </aside>
  );
}

function DonorBottomNavigation() {
  const items = [
    { label: "Home", icon: "dashboard" as IconName, href: "#dashboard-title" },
    { label: "Donations", icon: "bag" as IconName, href: "#my-donations" },
    { label: "Proposals", icon: "box" as IconName, href: "#proposal-queue" },
    { label: "Inbox", icon: "bell" as IconName, href: "#notifications" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-[#d7d0c2] bg-[#fffdf8]/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-0.75rem_2rem_rgba(49,43,24,0.12)] backdrop-blur lg:hidden"
      aria-label="Donor navigation"
    >
      {items.map((item) => (
        <a
          className="grid min-h-14 place-items-center gap-1 rounded-lg px-1 text-center text-[0.68rem] font-black text-[#46534a] transition hover:bg-[#f0f7eb] hover:text-[#064c25]"
          href={item.href}
          key={item.label}
        >
          <AppIcon name={item.icon} className="text-2xl" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

function DashboardTopbar({ data }: { data: DashboardData }) {
  const unread = data.notifications.filter((item) => !item.read).length;
  const initials = data.profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (data.user.role === "volunteer") {
    return (
      <header
        className="mb-4 grid gap-4 border-b border-[#ded7c9] pb-4 xl:grid-cols-[max-content_1fr_auto] xl:items-center"
        id="overview"
      >
        <Link
          className="font-serif text-[2.35rem] leading-none tracking-[-0.055em] text-[#061e0e]"
          href="/"
        >
          FoodLink
        </Link>
        <div className="grid gap-3 md:grid-cols-[10.5rem_13rem_minmax(16rem,1fr)_auto] md:items-end xl:justify-self-end">
          <TopbarSelect
            icon="team"
            label="Role"
            value={roleLabels[data.user.role]}
            href="/demo"
          />
          <TopbarSelect
            icon="marker"
            label="Location"
            value={data.profile.location.city || "Jakarta Selatan"}
          />
          <label className="grid gap-1 text-xs font-bold text-[#5d675f]">
            <span className="sr-only">Search</span>
            <span className="grid min-h-11 grid-cols-[2.5rem_1fr] items-center rounded-lg border border-[#d7d0c2] bg-[#fffdf8] shadow-sm">
              <span className="grid place-items-center text-[#526158]">
                <AppIcon name="search" className="h-5 w-5" />
              </span>
              <input
                className="h-full bg-transparent pr-3 text-sm font-bold text-[#111a14] outline-none placeholder:text-[#7b837c]"
                placeholder="Search donations, receivers, or locations..."
              />
            </span>
          </label>
          <button
            className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d7d0c2] bg-[#fffdf8] px-4 text-sm font-black text-[#111a14] shadow-sm"
            type="button"
          >
            <AppIcon name="filter" className="h-5 w-5" />
            Filters
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-[0.65rem] font-black">
              2
            </span>
          </button>
        </div>
        <a
          className="relative justify-self-start border-l border-[#ded7c9] pl-6 text-[#101812] xl:justify-self-end"
          href="#notifications"
          aria-label="Notifications"
        >
          <AppIcon name="bell" className="h-8 w-8" />
          {unread > 0 ? (
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-xs font-black text-[#10140d]">
              {unread}
            </span>
          ) : null}
        </a>
      </header>
    );
  }

  if (data.user.role === "receiver") {
    return (
      <header
        className="-mx-5 mb-6 grid gap-4 border-b border-[#ded7c9] bg-[#fffdf8]/58 px-5 py-5 lg:-mx-8 lg:px-8 xl:grid-cols-[1fr_auto] xl:items-center"
        id="overview"
      >
        <div>
          <h1 className="flex items-center gap-3 text-[1.45rem] font-black leading-tight text-[#101812]">
            Good morning, {data.profile.displayName}
            <AppIcon name="leaf" className="h-7 w-7 text-[#31583c]" />
          </h1>
          <p className="mt-1 text-sm font-bold text-[#46534a]">
            Here's what's coming your way today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5 xl:justify-end">
          <TopbarSelect
            icon="profile"
            label=""
            value={roleLabels[data.user.role]}
            href="/demo"
          />
          <a
            className="relative border-l border-[#ded7c9] pl-5 text-[#101812]"
            href="#notifications"
            aria-label="Notifications"
          >
            <AppIcon name="bell" className="h-8 w-8" />
            {unread > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-xs font-black text-[#10140d]">
                {unread}
              </span>
            ) : null}
          </a>
          <span className="h-10 w-px bg-[#ded7c9]" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#064c25] text-sm font-black text-white">
              {initials}
            </span>
            <strong className="font-black text-[#101812]">
              {data.profile.displayName}
            </strong>
            <AppIcon name="chevron" className="h-4 w-4" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="-mx-4 mb-5 grid gap-4 border-b border-[#ded7c9] bg-[#fffdf8]/70 px-4 py-4 md:mx-0 md:rounded-xl md:border md:px-5 md:grid-cols-[1fr_auto_auto] md:items-center"
      id="overview"
    >
      <div className="min-w-0">
        <Link
          className="font-serif text-[1.65rem] leading-none tracking-[-0.045em] text-[#061e0e] md:text-[2.35rem] md:tracking-[-0.055em]"
          href="/"
        >
          FoodLink
        </Link>
        <p className="mt-2 truncate text-sm font-black text-[#101812] md:hidden">
          Good morning, {data.profile.displayName}
        </p>
      </div>
      <Link
        className="grid min-w-0 gap-1 justify-self-center rounded-md border border-[#d2cbbd] bg-[#fffdf8] px-3 py-1.5 text-xs font-bold shadow-sm md:justify-self-start"
        href="/demo"
      >
        <span className="text-[#111a14]">Role</span>
        <span className="flex items-center gap-2 text-sm font-black">
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[#0c7438] bg-[#e7f1e5]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0c7438]" />
          </span>
          {roleLabels[data.user.role]}
          <span className="ml-auto text-lg leading-none">⌄</span>
        </span>
      </Link>
      <div className="absolute right-4 top-4 flex items-center gap-3 justify-self-start md:static md:gap-6 md:justify-self-end">
        <a
          className="relative grid min-h-11 min-w-11 place-items-center rounded-full border border-[#d2cbbd] bg-[#fffdf8] text-[#101812] md:min-h-0 md:min-w-0 md:border-0 md:bg-transparent"
          href="#notifications"
          aria-label="Notifications"
        >
          <AppIcon name="bell" className="h-6 w-6 md:h-8 md:w-8" />
          {unread > 0 ? (
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-xs font-black text-[#10140d]">
              {unread}
            </span>
          ) : null}
        </a>
        <span
          className="hidden h-10 w-px bg-[#d2cbbd] md:block"
          aria-hidden="true"
        />
        <div className="hidden items-center gap-4 md:flex">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#d9d8cf] font-black">
            {initials}
          </span>
          <span className="grid">
            <strong className="font-black leading-5">
              {data.profile.displayName}
            </strong>
            <span className="text-sm font-bold text-[#46534a]">
              {roleLabels[data.user.role]}
            </span>
          </span>
          <span className="text-xl leading-none">⌄</span>
        </div>
      </div>
    </header>
  );
}

function TopbarSelect({
  icon,
  label,
  value,
  href,
}: {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      {label ? <span>{label}</span> : null}
      <span className="grid min-h-11 grid-cols-[1.75rem_1fr_1rem] items-center gap-2 rounded-lg border border-[#d7d0c2] bg-[#fffdf8] px-3 text-sm font-black text-[#111a14] shadow-sm">
        <AppIcon name={icon} className="h-5 w-5 text-[#101812]" />
        <span className="truncate">{value}</span>
        <AppIcon name="chevron" className="h-4 w-4 text-[#101812]" />
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        className="grid gap-1 justify-self-start text-left text-xs font-bold text-[#5d675f]"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className="grid gap-1 justify-self-start text-left text-xs font-bold text-[#5d675f]"
      type="button"
    >
      {content}
    </button>
  );
}

function DonorDashboard({
  data,
  token,
  runAction,
}: {
  data: DashboardData;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [donorCoords, setDonorCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationMode, setLocationMode] = useState<"gps" | "map">("gps");
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -6.2088, 106.8456,
  ]);
  const [geocoding, setGeocoding] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);

  const [defaultFrom, setDefaultFrom] = useState("");
  const [defaultUntil, setDefaultUntil] = useState("");
  const availableCount = data.donations.filter(
    (donation) => donation.status === "available",
  ).length;
  const pendingCount = data.proposals.filter(
    (proposal) => proposal.status === "pending",
  ).length;
  const deliveredCount = data.donations.filter(
    (donation) => donation.status === "delivered",
  ).length;

  useEffect(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    const localNow = new Date(Date.now() - tzoffset);
    const localLater = new Date(Date.now() - tzoffset + 4 * 60 * 60 * 1000);
    setDefaultFrom(localNow.toISOString().slice(0, 16));
    setDefaultUntil(localLater.toISOString().slice(0, 16));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setDonorCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => {},
        { enableHighAccuracy: true },
      );
    }
  }, []);

  async function handleCreateDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const now = new Date();
    const later = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const fromVal = form.get("availableFrom");
    const untilVal = form.get("availableUntil");
    const fromDate = fromVal ? new Date(String(fromVal)) : now;
    const untilDate = untilVal ? new Date(String(untilVal)) : later;

    await runAction(async () => {
      await createDonation(token, {
        title: String(form.get("title") || "Fresh prepared meals"),
        description: String(
          form.get("description") || "Safe surplus food ready for pickup.",
        ),
        quantity: String(form.get("quantity") || "10 packs"),
        imageUrl: uploadedImageUrl || defaultDonationImage,
        pickupLocation: {
          ...demoLocation,
          addressLine1:
            locationInputRef.current?.value || demoLocation.addressLine1,
          ...(locationMode === "map" && pickedCoords
            ? { latitude: pickedCoords.lat, longitude: pickedCoords.lng }
            : locationMode === "gps" && donorCoords
              ? { latitude: donorCoords.lat, longitude: donorCoords.lng }
              : {}),
        },
        availableFrom: fromDate.toISOString(),
        availableUntil: untilDate.toISOString(),
        specialInstructions: String(form.get("instructions") || ""),
      });
      formElement.reset();
      setUploadedImageUrl("");
      setUploadError("");
      setPickedCoords(null);
    }, "Donation posted.");
  }

  return (
    <>
      <div className="grid min-w-0 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid min-w-0 gap-5" id="work">
          <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <form
              className={cx(
                panel,
                "grid min-w-0 content-start gap-4 p-5 sm:p-6",
              )}
              onSubmit={handleCreateDonation}
            >
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f4ead6] text-[#064c25]">
                  <AppIcon name="leaf" className="h-6 w-6" />
                </span>
                <h2 className={heading}>Create donation</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Title
                  <input
                    className={input}
                    name="title"
                    placeholder="e.g. Fresh vegetables from today"
                    required
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Quantity
                  <input
                    className={input}
                    name="quantity"
                    placeholder="e.g. 15 kg, 10 packs"
                    required
                  />
                </label>
              </div>

              <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                Description
                <textarea
                  className={cx(input, "min-h-20 resize-y")}
                  name="description"
                  placeholder="Describe the food, condition, and anything important."
                  required
                />
              </label>

              <div className="grid gap-2">
                <span className="flex items-center justify-between text-xs font-bold text-[#46534a]">
                  Pickup location
                  <span className="flex gap-1 rounded-lg border border-[#cfc8ba] bg-[#f4f0e8] p-0.5">
                    <button
                      type="button"
                      className={cx(
                        "rounded-md px-3 py-1 text-[0.65rem] font-black transition-colors",
                        locationMode === "gps"
                          ? "bg-white text-[#064c25] shadow-sm"
                          : "text-[#46534a] hover:text-[#101812]",
                      )}
                      onClick={() => setLocationMode("gps")}
                    >
                      Use GPS
                    </button>
                    <button
                      type="button"
                      className={cx(
                        "rounded-md px-3 py-1 text-[0.65rem] font-black transition-colors",
                        locationMode === "map"
                          ? "bg-white text-[#064c25] shadow-sm"
                          : "text-[#46534a] hover:text-[#101812]",
                      )}
                      onClick={() => setLocationMode("map")}
                    >
                      Pick on map
                    </button>
                  </span>
                </span>

                <span className="grid grid-cols-[2.5rem_1fr_2.5rem] overflow-hidden rounded-[0.65rem] border border-[#cfc8ba] bg-[#fffdf8]">
                  <span className="grid place-items-center text-[#064c25]">
                    <AppIcon name="map" className="h-5 w-5" />
                  </span>
                  <input
                    ref={locationInputRef}
                    className="min-h-10 bg-transparent px-2 text-sm font-bold outline-none"
                    name="location"
                    placeholder="Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan"
                  />
                  {locationMode === "gps" ? (
                    <span className="grid place-items-center border-l border-[#cfc8ba] px-2">
                      {donorCoords ? (
                        <span
                          className="h-2 w-2 rounded-full bg-[#14733a]"
                          title="GPS detected"
                        />
                      ) : (
                        <span
                          className="h-2 w-2 animate-pulse rounded-full bg-[#cfc8ba]"
                          title="Detecting…"
                        />
                      )}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={geocoding}
                      className="grid place-items-center border-l border-[#cfc8ba] px-2 text-[#064c25] hover:bg-[#e5f1df] disabled:opacity-50"
                      title="Open map picker"
                      onClick={async () => {
                        const addr = locationInputRef.current?.value ?? "";
                        let center: [number, number] = donorCoords
                          ? [donorCoords.lat, donorCoords.lng]
                          : [-6.2088, 106.8456];
                        if (addr) {
                          setGeocoding(true);
                          try {
                            const res = await fetch(
                              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`,
                            );
                            const data = await res.json();
                            if (Array.isArray(data) && data[0]) {
                              center = [
                                parseFloat(data[0].lat),
                                parseFloat(data[0].lon),
                              ];
                            }
                          } catch {
                            // fall back to GPS/Jakarta
                          } finally {
                            setGeocoding(false);
                          }
                        }
                        setMapCenter(center);
                        setShowMapPicker(true);
                      }}
                    >
                      {geocoding ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0b5b2b] border-t-transparent" />
                      ) : (
                        <AppIcon name="map" className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </span>

                {locationMode === "gps" && (
                  <span className="text-[0.65rem] font-bold text-[#9aab9c]">
                    {donorCoords
                      ? `GPS: ${donorCoords.lat.toFixed(5)}, ${donorCoords.lng.toFixed(5)}`
                      : "Detecting GPS location…"}
                  </span>
                )}
                {locationMode === "map" && (
                  <span
                    className={cx(
                      "text-[0.65rem] font-bold",
                      pickedCoords ? "text-[#14733a]" : "text-[#9aab9c]",
                    )}
                  >
                    {pickedCoords
                      ? `Pinned: ${pickedCoords.lat.toFixed(5)}, ${pickedCoords.lng.toFixed(5)}`
                      : "Click the map icon to pin a location"}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Available from
                  <span className="relative block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#064c25] pointer-events-none">
                      <AppIcon name="calendar" className="h-4.5 w-4.5" />
                    </span>
                    <input
                      className={cx(input, "pl-10 pr-8")}
                      name="availableFrom"
                      type="datetime-local"
                      defaultValue={defaultFrom}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#46534a] pointer-events-none">
                      <AppIcon name="chevron" className="h-4 w-4" />
                    </span>
                  </span>
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Available until
                  <span className="relative block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#064c25] pointer-events-none">
                      <AppIcon name="calendar" className="h-4.5 w-4.5" />
                    </span>
                    <input
                      className={cx(input, "pl-10 pr-8")}
                      name="availableUntil"
                      type="datetime-local"
                      defaultValue={defaultUntil}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#46534a] pointer-events-none">
                      <AppIcon name="chevron" className="h-4 w-4" />
                    </span>
                  </span>
                </label>
              </div>

              <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                Special instructions (optional)
                <textarea
                  className={cx(input, "min-h-16 resize-y")}
                  name="instructions"
                  placeholder="Parking info, access notes, packaging, etc."
                />
              </label>

              {cloudinaryUploadEnabled ? (
                <CldUploadWidget
                  uploadPreset={cloudinaryUploadPreset}
                  options={{
                    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                    maxFiles: 1,
                    multiple: false,
                    resourceType: "image",
                    sources: ["local", "camera"],
                  }}
                  onError={(error) => {
                    setUploadError(uploadErrorMessage(error));
                  }}
                  onSuccess={(result) => {
                    const info = uploadResultInfo(result);
                    if (!info?.secure_url) {
                      setUploadError("Cloudinary did not return image URL.");
                      return;
                    }
                    setUploadedImageUrl(info.secure_url);
                    setUploadError("");
                  }}
                >
                  {({ open }) => (
                    <button
                      className="justify-self-start border-0 bg-transparent p-0 text-xs font-black text-[#064c25]"
                      type="button"
                      onClick={() => open()}
                    >
                      {uploadedImageUrl
                        ? "Replace donation photo"
                        : "Add donation photo"}
                    </button>
                  )}
                </CldUploadWidget>
              ) : null}
              {uploadError ? (
                <p className="text-xs font-black text-[#80251d]">
                  {uploadError}
                </p>
              ) : null}

              <button className={primaryButton} type="submit">
                <AppIcon name="leaf" className="h-5 w-5" />
                Post donation
              </button>
              {uploadedImageUrl ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-[#cfc8ba] shadow-sm transition-all duration-300">
                  {/* biome-ignore lint/performance/noImgElement: Uploaded image preview */}
                  <img
                    alt="Uploaded donation preview"
                    className="h-48 w-full object-cover"
                    src={uploadedImageUrl}
                  />
                </div>
              ) : null}
            </form>

            <DonorMetricStrip
              availableCount={availableCount}
              pendingCount={pendingCount}
              deliveredCount={deliveredCount}
            />

            <ProposalQueue
              donations={data.donations}
              proposals={data.proposals}
              viewerRole="donor"
              token={token}
              runAction={runAction}
            />
          </section>

          <DonationsTable
            donations={data.donations}
            proposals={data.proposals}
            title="My donations"
          />
        </div>

        <NotificationsPanel
          notifications={data.notifications}
          viewerRole={data.user.role}
          token={token}
          runAction={runAction}
        />
      </div>

      {showMapPicker &&
        createPortal(
          <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/60 sm:items-center sm:p-6">
            <div className="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[80vh] sm:max-w-2xl sm:rounded-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[#ded7c9] px-5 py-4">
                <div>
                  <h3 className="text-sm font-black text-[#101812]">
                    Pick pickup location
                  </h3>
                  <p className="text-xs text-[#46534a]">
                    Click or drag the pin to set the exact spot
                  </p>
                </div>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f4f0e8]"
                  onClick={() => setShowMapPicker(false)}
                >
                  ✕
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <LocationPickerMapDynamic
                  initialCenter={mapCenter}
                  onConfirm={(coords) => {
                    setPickedCoords(coords);
                    setShowMapPicker(false);
                  }}
                  onClose={() => setShowMapPicker(false)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function VolunteerDashboard({
  data,
  token,
  runAction,
}: {
  data: DashboardData;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(
    null,
  );
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(
    null,
  );
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [phoneMode, setPhoneMode] = useState<"profile" | "custom">("profile");
  const [customPhone, setCustomPhone] = useState("");
  const pendingProposals = data.proposals.filter(
    (proposal) => proposal.status === "pending",
  ).length;
  const availableDonations = data.donations.filter(
    (donation) => donation.status === "available",
  );
  const availableDonation =
    availableDonations.find((donation) => donation.id === selectedDonationId) ??
    availableDonations[0];
  const receiver =
    data.receivers.find((item) => item.userId === selectedReceiverId) ??
    data.receivers[0];
  const activePickup = data.pickups.find(
    (pickup) => pickup.status === "assigned" || pickup.status === "picked_up",
  );

  async function handleCreateProposal() {
    if (!availableDonation || !receiver) {
      throw new Error("Need available donation and receiver first.");
    }

    const resolvedContact =
      phoneMode === "custom"
        ? customPhone.trim()
        : (data.profile.contactValue ?? "");

    await createDeliveryProposal(token, {
      donationId: availableDonation.id,
      receiverId: receiver.userId,
      volunteerContactOverride: resolvedContact || undefined,
    });
  }

  const profilePhone = data.profile.contactValue ?? "";
  const resolvedPhone = phoneMode === "custom" ? customPhone : profilePhone;

  function openWhatsApp() {
    const digits = resolvedPhone.replace(/\D/g, "");
    const number = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
    const text = encodeURIComponent(
      `Halo! Saya ${data.profile.displayName} dari FoodLink. Saya telah membuat proposal pengiriman untuk donasi "${availableDonation?.title ?? ""}". Mohon dikonfirmasi. Terima kasih!`,
    );
    window.open(`https://wa.me/${number}?text=${text}`, "_blank");
  }

  return (
    <>
      <div className="grid gap-3">
        <section className="grid min-h-[41rem] gap-0 overflow-hidden rounded-xl border border-[#ded7c9] bg-[#fffdf8]/78 shadow-[0_1rem_2.8rem_rgba(49,43,24,0.08)] 2xl:grid-cols-[minmax(23rem,1.04fr)_minmax(21rem,0.96fr)_minmax(19rem,0.78fr)]">
          <VolunteerDonationsPanel
            donations={data.donations}
            selectedDonation={availableDonation}
            onSelect={setSelectedDonationId}
          />
          <VolunteerMapPanel donation={availableDonation} receiver={receiver} />
          <VolunteerReceiversPanel
            receivers={data.receivers}
            selectedReceiver={receiver}
            onSelect={setSelectedReceiverId}
          />
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_18rem]">
          <VolunteerProposalPanel
            donation={availableDonation}
            receiver={receiver}
            onCreate={() => setShowProposalModal(true)}
            disabled={!availableDonation || !receiver}
          />
          <VolunteerPickupPanel
            activePickup={activePickup}
            token={token}
            runAction={runAction}
          />
        </section>

        <VolunteerGlancePanel
          availableCount={availableDonations.length}
          pendingCount={pendingProposals}
          pickupCount={data.pickups.length}
        />
      </div>

      {showProposalModal &&
        createPortal(
          <>
            <button
              aria-label="Close proposal modal"
              className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowProposalModal(false)}
              type="button"
            />
            <div className="fixed left-1/2 top-1/2 z-[1101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[#fffdf8] shadow-2xl">
              <header className="flex items-center gap-3 border-b border-[#e4ddcf] px-6 py-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f1df] text-[#14733a]">
                  <AppIcon name="message" className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h2 className="font-serif text-lg font-black tracking-tight text-[#061e0e]">
                    Confirm proposal
                  </h2>
                  <p className="text-xs font-bold text-[#46534a]">
                    Choose a WhatsApp number to notify the receiver
                  </p>
                </div>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f0ece4]"
                  onClick={() => setShowProposalModal(false)}
                >
                  <AppIcon name="close" className="h-5 w-5" />
                </button>
              </header>

              <div className="grid gap-3 p-6">
                <button
                  type="button"
                  onClick={() => setPhoneMode("profile")}
                  className={cx(
                    "grid grid-cols-[1.25rem_1fr] items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    phoneMode === "profile"
                      ? "border-[#0b5b2b] bg-[#e5f1df]"
                      : "border-[#ded7c9] bg-[#fafaf7] hover:border-[#9aab9c]",
                  )}
                >
                  <span
                    className={cx(
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
                      phoneMode === "profile"
                        ? "border-[#0b5b2b] bg-[#0b5b2b]"
                        : "border-[#9aab9c]",
                    )}
                  />
                  <span className="grid gap-0.5">
                    <strong className="text-sm font-black text-[#101812]">
                      Use my profile number
                    </strong>
                    <span className="font-mono text-xs font-bold text-[#46534a]">
                      {profilePhone || "No number on profile"}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPhoneMode("custom")}
                  className={cx(
                    "grid grid-cols-[1.25rem_1fr] items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    phoneMode === "custom"
                      ? "border-[#0b5b2b] bg-[#e5f1df]"
                      : "border-[#ded7c9] bg-[#fafaf7] hover:border-[#9aab9c]",
                  )}
                >
                  <span
                    className={cx(
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
                      phoneMode === "custom"
                        ? "border-[#0b5b2b] bg-[#0b5b2b]"
                        : "border-[#9aab9c]",
                    )}
                  />
                  <span className="grid gap-2">
                    <strong className="text-sm font-black text-[#101812]">
                      Use a different number
                    </strong>
                    {phoneMode === "custom" && (
                      <input
                        className="rounded-lg border border-[#cfc8ba] bg-white px-3 py-2 font-mono text-sm font-bold outline-none focus:border-[#0b5b2b]"
                        placeholder="+62 812 3456 7890"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </span>
                </button>
              </div>

              <footer className="flex gap-3 border-t border-[#e4ddcf] px-6 py-4">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-[#cfc8ba] py-2.5 text-sm font-black text-[#46534a] hover:bg-[#f4f0e8]"
                  onClick={() => {
                    void runAction(
                      handleCreateProposal,
                      "Delivery proposal created.",
                    );
                    setShowProposalModal(false);
                  }}
                >
                  Skip & create
                </button>
                <button
                  type="button"
                  disabled={phoneMode === "custom" && !customPhone.trim()}
                  className={cx(primaryButton, "flex-1 disabled:opacity-50")}
                  onClick={() => {
                    void runAction(
                      handleCreateProposal,
                      "Delivery proposal created.",
                    );
                    openWhatsApp();
                    setShowProposalModal(false);
                  }}
                >
                  <AppIcon name="message" className="h-4 w-4" />
                  Create &amp; notify
                </button>
              </footer>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function VolunteerDonationsPanel({
  donations,
  selectedDonation,
  onSelect,
}: {
  donations: Donation[];
  selectedDonation?: Donation;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<
    "All" | "Available" | "Proposal pending"
  >("All");
  const [sortNewest, setSortNewest] = useState(false);

  const filtered = donations.filter((d) => {
    if (filter === "Available") return d.status === "available";
    if (filter === "Proposal pending") return d.status === "proposal_pending";
    return true;
  });

  const sortedDonations = [...filtered].sort((a, b) => {
    if (sortNewest) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.status === "available" && b.status !== "available" ? -1 : 1;
  });

  return (
    <section className="grid content-start gap-4 border-[#ded7c9] p-5 2xl:border-r">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Available donations
        </h2>
        <span className="rounded-full bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#14351f]">
          {filtered.length}
        </span>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["All", "Available", "Proposal pending"] as const).map((item) => (
            <button
              className={cx(
                "min-h-9 rounded-full border px-4 text-xs font-black",
                filter === item
                  ? "border-[#2f7a46] bg-[#3f7d48] text-white"
                  : "border-[#d9d1c2] bg-[#fffdf8] text-[#1f2a23]",
              )}
              key={item}
              type="button"
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d9d1c2] bg-[#fffdf8] px-3 text-xs font-black"
          type="button"
          onClick={() => setSortNewest((v) => !v)}
        >
          {sortNewest ? "Newest" : "Nearest"}{" "}
          <AppIcon name="chevron" className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2">
        {sortedDonations.length > 0
          ? sortedDonations
              .slice(0, 5)
              .map((donation, index) => (
                <VolunteerDonationCard
                  donation={donation}
                  key={donation.id}
                  selected={donation.id === selectedDonation?.id}
                  index={index}
                  onSelect={onSelect}
                />
              ))
          : emptyCopy("No donations visible yet.")}
      </div>
      <a
        className="mt-2 flex min-h-11 items-center justify-center gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] text-sm font-black"
        href="#my-donations"
      >
        View all donations <AppIcon name="arrow" className="h-4 w-4" />
      </a>
    </section>
  );
}

function VolunteerDonationCard({
  donation,
  selected,
  index,
  onSelect,
}: {
  donation: Donation;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
}) {
  const distance = `${(1.2 + index * 0.6).toFixed(1)} km`;
  const selectable = donation.status === "available";

  return (
    <article
      className={cx(
        "grid grid-cols-[1.75rem_5.4rem_1fr_auto] items-center gap-3 rounded-lg border p-3 transition",
        selectable
          ? selected
            ? "cursor-pointer border-[#2f7a46] bg-[#f8fbf3] shadow-[0_0.7rem_1.7rem_rgba(47,122,70,0.09)]"
            : "cursor-pointer border-[#e4ddcf] bg-[#fffdf8]"
          : "cursor-default border-[#e4ddcf] bg-[#f7f5f0] opacity-60",
      )}
    >
      <button
        className={cx(
          "grid h-6 w-6 place-items-center rounded-full border",
          !selectable
            ? "invisible"
            : selected
              ? "border-[#14733a] bg-[#14733a] text-white"
              : "border-[#b8b8ae] bg-white",
        )}
        type="button"
        aria-label={`Select ${donation.title}`}
        disabled={!selectable}
        onClick={() => selectable && onSelect(donation.id)}
      >
        {selected ? <AppIcon name="check" className="h-4 w-4" /> : null}
      </button>
      <DonationThumbnail donation={donation} size="lg" />
      <div className="min-w-0">
        <strong className="block truncate text-sm font-black text-[#101812]">
          {donation.title}
        </strong>
        <span className="mt-1 block truncate text-xs font-bold text-[#46534a]">
          {donation.description || "Food ready for pickup"}
        </span>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-[#46534a]">
          <span className="inline-flex items-center gap-1">
            <AppIcon name="package" className="h-3.5 w-3.5" />
            {donation.quantity}
          </span>
          <span className="inline-flex items-center gap-1">
            <AppIcon name="clock" className="h-3.5 w-3.5" />
            {formatTime(donation.availableUntil)}
          </span>
        </div>
      </div>
      <div className="grid justify-items-end gap-5">
        <span className="text-xs font-bold text-[#46534a]">{distance}</span>
        <span
          className={cx(
            badgeBase,
            donation.status === "available"
              ? "bg-[#dbeafe] text-[#1e40af]"
              : statusClass(donation.status),
          )}
        >
          {donation.status === "proposal_pending"
            ? "Proposal pending"
            : donation.status.replace(/_/g, " ")}
        </span>
      </div>
    </article>
  );
}

function VolunteerMapPanel({
  donation,
  receiver,
}: {
  donation?: Donation;
  receiver?: Profile;
}) {
  return (
    <section className="grid min-h-[41rem] grid-rows-[auto_1fr_auto] border-[#ded7c9] 2xl:border-r">
      <header className="flex items-center justify-between p-5 pb-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Live map
        </h2>
      </header>
      <div className="relative mx-4 min-h-[28rem] overflow-hidden rounded-lg border border-[#e4ddcf]">
        <VolunteerMapDynamic
          donorLocation={donation?.pickupLocation}
          receiverLocation={receiver?.location}
          donorLabel={
            donation ? (donorDisplayName(donation) ?? "Donor") : undefined
          }
          receiverLabel={receiver?.displayName}
        />
        {donation ? (
          <article className="absolute inset-x-4 bottom-4 z-[1000] grid grid-cols-[4.8rem_1fr_auto] items-center gap-3 rounded-lg border border-[#d9d1c2] bg-[#fffdf8] p-3 shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.12)]">
            <DonationThumbnail donation={donation} size="lg" />
            <div className="min-w-0">
              <strong className="block truncate text-sm font-black">
                {donation.title}
              </strong>
              <span className="block truncate text-xs font-bold text-[#46534a]">
                {donation.description || "Donor"}
              </span>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[#46534a]">
                <span className="inline-flex items-center gap-1">
                  <AppIcon name="package" className="h-3.5 w-3.5" />
                  {donation.quantity}
                </span>
                <span className="inline-flex items-center gap-1">
                  <AppIcon name="clock" className="h-3.5 w-3.5" />
                  {formatTime(donation.availableUntil)}
                </span>
              </div>
            </div>
          </article>
        ) : null}
      </div>
      <footer className="mx-4 mb-4 grid min-h-16 grid-cols-3 items-center rounded-lg border border-[#e4ddcf] bg-[#fffdf8] px-7 text-xs font-bold">
        {[
          ["#2f7a46", "Donor"],
          ["#ffb91f", "Receiver"],
          ["#287bd5", "You"],
        ].map(([color, label]) => (
          <span className="inline-flex items-center gap-3" key={label}>
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </footer>
    </section>
  );
}

function VolunteerReceiversPanel({
  receivers,
  selectedReceiver,
  onSelect,
}: {
  receivers: Profile[];
  selectedReceiver?: Profile;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="grid content-start gap-4 p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Receiver directory
        </h2>
        <span className="rounded-full bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#14351f]">
          {receivers.length}
        </span>
      </header>
      <label className="grid min-h-11 grid-cols-[2.5rem_1fr] items-center rounded-lg border border-[#d7d0c2] bg-[#fffdf8] shadow-sm">
        <span className="grid place-items-center text-[#526158]">
          <AppIcon name="search" className="h-5 w-5" />
        </span>
        <input
          className="h-full bg-transparent pr-3 text-sm font-bold outline-none placeholder:text-[#7b837c]"
          placeholder="Search receivers..."
        />
      </label>
      <div className="grid gap-2">
        {receivers.length > 0
          ? receivers
              .slice(0, 4)
              .map((receiver, index) => (
                <VolunteerReceiverCard
                  key={receiver.userId}
                  receiver={receiver}
                  selected={receiver.userId === selectedReceiver?.userId}
                  index={index}
                  onSelect={onSelect}
                />
              ))
          : emptyCopy("No receiver profiles available.")}
      </div>
      <a
        className="mt-1 flex min-h-11 items-center justify-center gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] text-sm font-black"
        href="#work"
      >
        View all receivers <AppIcon name="arrow" className="h-4 w-4" />
      </a>
    </section>
  );
}

function VolunteerReceiverCard({
  receiver,
  selected,
  index,
  onSelect,
}: {
  receiver: Profile;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
}) {
  const accent = ["#2f7a46", "#e18a18", "#2f7a46", "#d8841a"][index % 4];

  return (
    <article
      className={cx(
        "grid grid-cols-[1.5rem_4.2rem_1fr] gap-3 rounded-lg border bg-[#fffdf8] p-4",
        selected ? "border-[#2f7a46] bg-[#f8fbf3]" : "border-[#e4ddcf]",
      )}
    >
      <button
        className={cx(
          "mt-7 grid h-6 w-6 place-items-center rounded-full border",
          selected
            ? "border-[#14733a] bg-[#14733a] text-white"
            : "border-[#b8b8ae] bg-white",
        )}
        type="button"
        aria-label={`Select ${receiver.displayName}`}
        onClick={() => onSelect(receiver.userId)}
      >
        {selected ? <AppIcon name="check" className="h-4 w-4" /> : null}
      </button>
      <span
        className="grid h-14 w-14 place-items-center rounded-full bg-[#e5f1df]"
        style={{ color: accent }}
      >
        <AppIcon
          name={index === 3 ? "pickup" : index === 2 ? "leaf" : "team"}
          className="h-7 w-7"
        />
      </span>
      <div className="min-w-0">
        <strong className="block truncate text-sm font-black text-[#101812]">
          {receiver.displayName}
        </strong>
        <span className="mt-1 block text-xs font-bold capitalize text-[#46534a]">
          {receiver.entityType ?? "Receiver"}
        </span>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[#46534a]">
          <span>{receiver.contactMethod}</span>
          <span>•</span>
          <span>{(1.6 + index * 0.5).toFixed(1)} km</span>
        </div>
        <p className="mt-3 rounded-md bg-[#e7f0df] p-2 text-xs font-bold leading-5 text-[#1f2a23]">
          Needs: {receiver.notes ?? "Nasi box, lauk, sayur, buah"}
        </p>
      </div>
    </article>
  );
}

function VolunteerProposalPanel({
  donation,
  receiver,
  disabled,
  onCreate,
}: {
  donation?: Donation;
  receiver?: Profile;
  disabled: boolean;
  onCreate: () => void;
}) {
  return (
    <section
      className={cx(
        panel,
        "grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]",
      )}
    >
      <header className="lg:col-span-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Create delivery proposal
        </h2>
      </header>
      <SelectedDonationSummary donation={donation} />
      <div className="grid place-items-center text-[#061e0e]">
        <AppIcon name="arrow" className="h-7 w-7" />
      </div>
      <SelectedReceiverSummary receiver={receiver} />
      <footer className="grid gap-3 rounded-lg border border-[#e4ddcf] bg-[#fbfaf3] p-3 lg:col-span-3 xl:grid-cols-[repeat(4,1fr)_max-content] xl:items-center">
        <MiniMetric icon="navigation" label="Est. distance" value="4.1 km" />
        <MiniMetric icon="clock" label="Est. time" value="18 min" />
        <MiniMetric icon="profile" label="Volunteer" value="Budi Relawan" />
        <MiniMetric icon="message" label="Contact" value="WhatsApp" />
        <button
          className={primaryButton}
          type="button"
          onClick={onCreate}
          disabled={disabled}
        >
          Create proposal <AppIcon name="arrow" className="h-5 w-5" />
        </button>
      </footer>
    </section>
  );
}

function SelectedDonationSummary({ donation }: { donation?: Donation }) {
  return (
    <article className="grid grid-cols-[5rem_1fr] items-center gap-3">
      <DonationThumbnail donation={donation} size="lg" />
      <div className="min-w-0">
        <span className="text-xs font-bold text-[#46534a]">
          Selected donation
        </span>
        <strong className="mt-2 block truncate text-sm font-black">
          {donation?.title ?? "Select available donation"}
        </strong>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[#46534a]">
          <span className="inline-flex items-center gap-1">
            <AppIcon name="package" className="h-3.5 w-3.5" />
            {donation?.quantity ?? "No quantity"}
          </span>
          <span className="inline-flex items-center gap-1">
            <AppIcon name="clock" className="h-3.5 w-3.5" />
            {donation ? formatTime(donation.availableUntil) : "No time"}
          </span>
        </div>
      </div>
    </article>
  );
}

function SelectedReceiverSummary({ receiver }: { receiver?: Profile }) {
  return (
    <article className="grid grid-cols-[4rem_1fr] items-center gap-3">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e5f1df] text-[#2f7a46]">
        <AppIcon name="team" className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        <span className="text-xs font-bold text-[#46534a]">
          Selected receiver
        </span>
        <strong className="mt-2 block truncate text-sm font-black">
          {receiver?.displayName ?? "Select receiver"}
        </strong>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[#46534a]">
          <span>{receiver?.entityType ?? "Receiver"}</span>
          <span>{receiver?.contactMethod ?? "Contact"}</span>
          <span>1.6 km</span>
        </div>
        <p className="mt-3 rounded-md bg-[#e7f0df] p-2 text-xs font-bold leading-5 text-[#1f2a23]">
          Needs: {receiver?.notes ?? "Nasi box, lauk, sayur, buah"}
        </p>
      </div>
    </article>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-3 text-xs font-bold text-[#46534a]">
      <AppIcon name={icon} className="h-4 w-4 text-[#0b5b2b]" />
      <span className="grid">
        <strong className="text-[#101812]">{label}</strong>
        {value}
      </span>
    </span>
  );
}

function VolunteerPickupPanel({
  activePickup,
  token,
  runAction,
}: {
  activePickup?: Pickup;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const canMarkPickedUp = activePickup?.status === "assigned";
  const canMarkDelivered = activePickup?.status === "picked_up";

  const steps = [
    {
      label: "Assigned",
      isCompleted: !!activePickup,
      time: activePickup?.createdAt ? formatTime(activePickup.createdAt) : null,
      desc: activePickup ? "You accepted task" : "Not started",
    },
    {
      label: "Picked up",
      isCompleted: activePickup
        ? activePickup.status === "picked_up" ||
          activePickup.status === "delivered"
        : false,
      time: activePickup?.pickedUpAt
        ? formatTime(activePickup.pickedUpAt)
        : null,
      desc:
        activePickup &&
        (activePickup.status === "picked_up" ||
          activePickup.status === "delivered")
          ? "Food picked up"
          : "Not started",
    },
    {
      label: "Delivered",
      isCompleted: activePickup ? activePickup.status === "delivered" : false,
      time: activePickup?.deliveredAt
        ? formatTime(activePickup.deliveredAt)
        : null,
      desc:
        activePickup && activePickup.status === "delivered"
          ? "Delivered to receiver"
          : "Not started",
    },
  ];

  const getStatusBadge = () => {
    if (!activePickup) return null;
    switch (activePickup.status) {
      case "picked_up":
        return { label: "Picked Up", className: "bg-[#dcebd5] text-[#14351f]" };
      case "delivered":
        return { label: "Delivered", className: "bg-[#dcebd5] text-[#14351f]" };
      case "canceled":
        return { label: "Canceled", className: "bg-[#f7d8d1] text-[#8a2e22]" };
      default:
        return { label: "Assigned", className: "bg-[#fee6bf] text-[#9d5b00]" };
    }
  };

  const badge = getStatusBadge();

  return (
    <section className={cx(panel, "grid gap-4 p-5")}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Active pickup
        </h2>
        {badge && (
          <span
            className={cx(
              "rounded-full px-3 py-1 text-xs font-black",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}
      </header>
      <div>
        <strong className="block text-lg font-black">
          {activePickup
            ? `Pickup #${activePickup.id.slice(0, 6)}`
            : "No pickup"}
        </strong>
        <span className="text-xs font-bold text-[#46534a]">
          {activePickup ? "Assigned today" : "Waiting for accepted proposal"}
        </span>
      </div>
      <ol className="grid gap-3">
        {steps.map((step, index) => (
          <li
            className="grid grid-cols-[1.75rem_1fr_auto] gap-3"
            key={step.label}
          >
            <span
              className={cx(
                "grid h-7 w-7 place-items-center rounded-full text-xs font-black",
                step.isCompleted
                  ? "bg-[#14733a] text-white"
                  : "bg-[#eeece3] text-[#46534a]",
              )}
            >
              {index + 1}
            </span>
            <span className="grid text-xs font-bold text-[#46534a]">
              <strong className="text-sm font-black text-[#101812]">
                {step.label}
              </strong>
              {step.desc}
            </span>
            {step.time ? (
              <span className="text-xs font-bold text-[#46534a]">
                {step.time}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <button
          className={ghostButton}
          type="button"
          disabled={!canMarkPickedUp}
          onClick={() =>
            activePickup
              ? runAction(async () => {
                  await markPickupPickedUp(token, activePickup.id);
                }, "Pickup marked picked up.")
              : undefined
          }
        >
          Mark picked up
        </button>
        <button
          className={primaryButton}
          type="button"
          disabled={!canMarkDelivered}
          onClick={() =>
            activePickup
              ? runAction(async () => {
                  await markPickupDelivered(token, activePickup.id);
                }, "Delivery marked.")
              : undefined
          }
        >
          {activePickup?.status === "delivered"
            ? "Delivered ✓"
            : "Mark delivered"}
        </button>
      </div>
    </section>
  );
}

function VolunteerGlancePanel({
  availableCount,
  pendingCount,
  pickupCount,
}: {
  availableCount: number;
  pendingCount: number;
  pickupCount: number;
}) {
  return (
    <section className={cx(panel, "grid gap-3 p-5")}>
      <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
        Today at a glance
      </h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <GlanceStat
          icon="package"
          label="Available donations"
          value={availableCount}
        />
        <GlanceStat
          icon="team"
          label="My proposals pending"
          value={pendingCount}
        />
        <GlanceStat
          icon="pickup"
          label="Pickups assigned"
          value={pickupCount}
        />
      </div>
    </section>
  );
}

function GlanceStat({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: number;
}) {
  return (
    <article className="grid grid-cols-[2.6rem_1fr] items-center gap-3 rounded-lg border border-[#e4ddcf] bg-[#fffdf8] p-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f1df] text-[#2f7a46]">
        <AppIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="grid">
        <strong className="text-2xl font-black leading-none">{value}</strong>
        <span className="text-xs font-bold leading-4 text-[#46534a]">
          {label}
        </span>
      </span>
    </article>
  );
}

function ReceiverDashboard({
  data,
  token,
  runAction,
}: {
  data: DashboardData;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const donationsById = useMemo(
    () => new Map(data.donations.map((donation) => [donation.id, donation])),
    [data.donations],
  );
  const pendingProposals = data.proposals.filter(
    (proposal) => proposal.status === "pending",
  );
  const acceptedProposals = data.proposals.filter(
    (proposal) => proposal.status === "accepted",
  );
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null,
  );
  const activeProposal =
    data.proposals.find((proposal) => proposal.id === selectedProposalId) ??
    pendingProposals.find((proposal) => proposal.donorAcceptedAt) ??
    pendingProposals[0] ??
    data.proposals[0];
  const activePickup =
    data.pickups.find(
      (pickup) => pickup.status === "assigned" || pickup.status === "picked_up",
    ) ?? data.pickups[0];
  const activeDonation = activeProposal
    ? (activeProposal.donation ?? donationsById.get(activeProposal.donationId))
    : undefined;
  const deliveredMeals = data.donations
    .filter((donation) => donation.status === "delivered")
    .reduce((total, donation) => total + quantityNumber(donation.quantity), 0);

  return (
    <div className="grid gap-5">
      <ReceiverStatsStrip
        pendingCount={pendingProposals.length}
        acceptedCount={acceptedProposals.length}
        deliveredMeals={deliveredMeals}
      />

      <section className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ReceiverProposalInbox
          proposals={data.proposals}
          donationsById={donationsById}
          activeProposalId={activeProposal?.id}
          onSelectProposalId={setSelectedProposalId}
          token={token}
          runAction={runAction}
        />
        <div className="grid gap-4">
          <ReceiverTimelineCard
            proposal={activeProposal}
            donation={activePickup?.donation ?? activeDonation}
            pickup={activePickup}
            allProposals={data.proposals}
            donationsById={donationsById}
            token={token}
            runAction={runAction}
          />
          <ReceiverNeedsCard
            profile={data.profile}
            token={token}
            runAction={runAction}
          />
        </div>
      </section>
    </div>
  );
}

function ReceiverStatsStrip({
  pendingCount,
  acceptedCount,
  deliveredMeals,
}: {
  pendingCount: number;
  acceptedCount: number;
  deliveredMeals: number;
}) {
  return (
    <section
      className={cx(
        panel,
        "grid gap-0 p-4 md:grid-cols-3 md:divide-x md:divide-[#ded7c9]",
      )}
      aria-label="Receiver stats"
    >
      <ReceiverStat
        icon="package"
        tone="sun"
        value={pendingCount}
        label="Pending proposals"
        caption="Awaiting your decision"
      />
      <ReceiverStat
        icon="check"
        tone="leaf"
        value={acceptedCount}
        label="Accepted deliveries"
        caption="In progress"
      />
      <ReceiverStat
        icon="leaf"
        tone="mint"
        value={deliveredMeals}
        label="Delivered meals"
        caption="This month"
      />
    </section>
  );
}

function ReceiverStat({
  icon,
  tone,
  value,
  label,
  caption,
}: {
  icon: IconName;
  tone: "sun" | "leaf" | "mint";
  value: number;
  label: string;
  caption: string;
}) {
  return (
    <article className="grid grid-cols-[4.2rem_1fr] items-center gap-4 px-3 py-3">
      <span
        className={cx(
          "grid h-14 w-14 place-items-center rounded-full",
          tone === "sun" && "bg-[#fee8ba] text-[#4d3510]",
          tone === "leaf" && "bg-[#dcebd5] text-[#14733a]",
          tone === "mint" && "bg-[#dcebd5] text-[#064c25]",
        )}
      >
        <AppIcon name={icon} className="h-7 w-7" />
      </span>
      <span className="grid">
        <strong className="text-2xl font-black leading-none text-[#101812]">
          {value}
        </strong>
        <span className="mt-1 text-sm font-black text-[#101812]">{label}</span>
        <span className="text-xs font-bold text-[#46534a]">{caption}</span>
      </span>
    </article>
  );
}

function ReceiverProposalInbox({
  proposals,
  donationsById,
  activeProposalId,
  onSelectProposalId,
  token,
  runAction,
}: {
  proposals: DeliveryProposal[];
  donationsById: Map<string, Donation>;
  activeProposalId?: string;
  onSelectProposalId: (id: string) => void;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const [sortNewest, setSortNewest] = useState(true);

  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      const diff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortNewest ? diff : -diff;
    });
  }, [proposals, sortNewest]);

  return (
    <section className={cx(panel, "grid gap-4 p-5")} id="proposal-queue">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
              Proposal inbox
            </h2>
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#ffbd1a] px-2 text-xs font-black text-[#10140d]">
              {proposals.length}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-[#46534a]">
            Incoming delivery proposals from volunteers
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-3 rounded-lg border border-[#d9d1c2] bg-[#fffdf8] px-4 text-xs font-black"
          type="button"
          onClick={() => setSortNewest((v) => !v)}
        >
          Sort: {sortNewest ? "Newest" : "Oldest"}{" "}
          <AppIcon name="chevron" className="h-4 w-4" />
        </button>
      </header>

      <div className="grid gap-3">
        {sortedProposals.length > 0
          ? sortedProposals.map((proposal, index) => {
              const donation =
                proposal.donation ?? donationsById.get(proposal.donationId);
              const expanded = proposal.id === activeProposalId;

              return (
                <ReceiverProposalCard
                  donation={donation}
                  expanded={expanded}
                  index={index}
                  key={proposal.id}
                  proposal={proposal}
                  token={token}
                  runAction={runAction}
                  onSelect={() => onSelectProposalId(proposal.id)}
                />
              );
            })
          : emptyCopy("No incoming proposals yet.")}
      </div>
    </section>
  );
}

function ReceiverProposalCard({
  proposal,
  donation,
  expanded,
  index,
  token,
  runAction,
  onSelect,
}: {
  proposal: DeliveryProposal;
  donation?: Donation;
  expanded: boolean;
  index: number;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  onSelect: () => void;
}) {
  const title = donation?.title ?? readableDonationId(proposal.donationId);
  const donorName =
    proposal.donorProfile?.displayName ?? donorDisplayName(donation);

  function openMaps(loc?: {
    latitude?: number;
    longitude?: number;
    addressLine1?: string;
    city?: string;
    region?: string;
  }) {
    if (!loc) return;
    if (loc.latitude && loc.longitude) {
      window.open(
        `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`,
        "_blank",
        "noopener,noreferrer",
      );
    } else {
      const addr = [loc.addressLine1, loc.city, loc.region]
        .filter(Boolean)
        .join(", ");
      window.open(
        `https://www.google.com/maps/search/${encodeURIComponent(addr)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }
  const volunteerName =
    proposal.volunteerProfile?.displayName ??
    (index % 2 === 0 ? "Siti Nur A." : "Budi Santoso");
  const volunteerContactValue =
    proposal.volunteerContactOverride ??
    proposal.volunteerProfile?.contactValue ??
    "+62 812-3456-7890";
  const volunteerContactMethodLabel =
    proposal.volunteerProfile?.contactMethod === "whatsapp"
      ? "WhatsApp"
      : proposal.volunteerProfile?.contactMethod === "phone"
        ? "Phone"
        : proposal.volunteerProfile?.contactMethod === "email"
          ? "Email"
          : proposal.volunteerProfile?.contactMethod
            ? proposal.volunteerProfile.contactMethod.charAt(0).toUpperCase() +
              proposal.volunteerProfile.contactMethod.slice(1)
            : "WhatsApp";

  return (
    // biome-ignore lint/a11y/useSemanticElements: nested interactive children prevent using button element
    <div
      className={cx(
        "rounded-lg border bg-[#fffdf8] transition",
        expanded
          ? "border-[#b9d4b7] bg-[#f4fbef] shadow-[0_0.8rem_2.2rem_rgba(47,122,70,0.08)]"
          : "border-[#ded7c9] hover:border-[#b9d4b7] hover:bg-[#fafdf8] cursor-pointer",
      )}
      onClick={!expanded ? onSelect : undefined}
      onKeyDown={
        !expanded
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role="button"
      tabIndex={!expanded ? 0 : undefined}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[7rem_1fr_auto] lg:items-center">
        <DonationThumbnail donation={donation} size="lg" />
        <div className="min-w-0">
          <strong className="block truncate text-base font-black text-[#101812]">
            {title}
          </strong>
          <p className="mt-2 text-xs font-bold text-[#46534a]">
            {donation?.quantity ?? "Open quantity"}
            <span className="px-2">•</span>
            {compactFoodDescription(donation)}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[#46534a]">
            <span className="inline-flex items-center gap-2">
              <AppIcon name="package" className="h-4 w-4" />
              {donorName}
            </span>
            <span className="inline-flex items-center gap-2">
              <AppIcon name="profile" className="h-4 w-4" />
              {volunteerName} (Volunteer)
            </span>
          </div>
        </div>
        <div className="grid gap-3 justify-self-start lg:justify-self-end">
          <span className="text-xs font-bold text-[#1f2a23]">
            {donation
              ? `Today, ${formatTime(donation.availableUntil)}`
              : "Today"}
          </span>
          <div className="flex flex-wrap gap-2">
            {proposal.donorAcceptedAt || proposal.status === "accepted" ? (
              <span className="rounded-md bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#116b35]">
                Donor accepted
              </span>
            ) : (
              <span className="rounded-md bg-[#f2ede4] px-3 py-1 text-xs font-bold text-[#746957]">
                Awaiting donor
              </span>
            )}
            {proposal.status === "accepted" ? (
              <span className="rounded-md bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#116b35]">
                Accepted
              </span>
            ) : proposal.status === "rejected" ? (
              <span className="rounded-md bg-[#fee2e2] px-3 py-1 text-xs font-black text-[#991b1b]">
                Rejected
              </span>
            ) : proposal.receiverAcceptedAt ? (
              <span className="rounded-md bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#116b35]">
                You accepted
              </span>
            ) : (
              <span className="rounded-md bg-[#fee8ba] px-3 py-1 text-xs font-black text-[#4d3510]">
                Your decision
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[#d6e5cf] px-4 pb-4">
          <div className="grid gap-4 py-4 lg:grid-cols-[1fr_1fr_0.86fr_auto]">
            <ReceiverInfoBlock
              icon="marker"
              title="Pickup location"
              body={[
                donorName ?? "Donor",
                donation?.pickupLocation.addressLine1 ??
                  "Jl. Kemang Raya No.10",
                [donation?.pickupLocation.city, donation?.pickupLocation.region]
                  .filter(Boolean)
                  .join(", ") || "Jakarta",
              ]}
              action="Open in Maps"
              onActionClick={() => openMaps(donation?.pickupLocation)}
            />
            <ReceiverInfoBlock
              icon="marker"
              title="Delivery to"
              body={[
                proposal.receiverProfile?.displayName ?? "Receiver",
                proposal.receiverProfile?.location.addressLine1 ??
                  "Jl. Damai No. 25",
                [
                  proposal.receiverProfile?.location.city,
                  proposal.receiverProfile?.location.region,
                ]
                  .filter(Boolean)
                  .join(", ") || "Jakarta",
              ]}
              action="Open in Maps"
              onActionClick={() => openMaps(proposal.receiverProfile?.location)}
            />
            <ReceiverEtaBlock donation={donation} />
            <div className="grid content-center gap-3">
              {proposal.status === "accepted" ? (
                <div className="text-center p-3 bg-[#e8f1e6] rounded-md border border-[#93c7a2] text-[#14351f] font-bold text-xs">
                  Proposal Accepted! Delivery has been assigned to volunteer.
                </div>
              ) : proposal.status === "rejected" ? (
                <div className="text-center p-3 bg-[#fff0eb] rounded-md border border-[#f0a59b] text-[#80251d] font-bold text-xs">
                  Proposal Rejected.
                </div>
              ) : proposal.receiverAcceptedAt ? (
                <div className="text-center p-3 bg-[#e8f1e6] rounded-md border border-[#93c7a2] text-[#14351f] font-bold text-xs">
                  Accepted. Awaiting donor confirmation.
                </div>
              ) : (
                <>
                  <button
                    className={primaryButton}
                    type="button"
                    onClick={() =>
                      runAction(async () => {
                        await acceptDeliveryProposal(token, proposal.id);
                      }, "Proposal accepted.")
                    }
                  >
                    Accept proposal
                  </button>
                  <button
                    className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#ef3e32] px-5 text-sm font-black text-white shadow-[0_0.75rem_1.5rem_rgba(160,46,32,0.15)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                    type="button"
                    onClick={() =>
                      runAction(async () => {
                        await rejectDeliveryProposal(token, proposal.id);
                      }, "Proposal rejected.")
                    }
                  >
                    Reject proposal
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 border-t border-[#d6e5cf] pt-4 lg:grid-cols-3 lg:divide-x lg:divide-[#d6e5cf]">
            <ReceiverDetailNote
              icon="check"
              title="Safe handling notes"
              body={[
                "Food is freshly packed and ready for same-day delivery.",
                "Keep refrigerated if not consumed immediately.",
              ]}
            />
            <ReceiverDetailNote
              icon="message"
              title="Contact volunteer"
              body={[volunteerContactMethodLabel, volunteerContactValue]}
              action="Message on WhatsApp"
              onActionClick={() => {
                const cleanNumber = volunteerContactValue.replace(/\D/g, "");
                if (cleanNumber) {
                  window.open(
                    `https://wa.me/${cleanNumber}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }
              }}
            />
            <ReceiverRouteSummary from={donorName} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReceiverInfoBlock({
  icon,
  title,
  body,
  action,
  onActionClick,
}: {
  icon: IconName;
  title: string;
  body: string[];
  action: string;
  onActionClick?: () => void;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
        <AppIcon name={icon} className="h-5 w-5 text-[#14733a]" />
        {title}
      </h3>
      {body.map((line) => (
        <span className="block text-xs font-bold text-[#1f2a23]" key={line}>
          {line}
        </span>
      ))}
      <button
        className="mt-2 inline-flex min-h-9 w-max items-center rounded-md border border-[#9eb69f] bg-[#fffdf8] px-3 text-xs font-black text-[#064c25]"
        type="button"
        onClick={onActionClick}
      >
        {action}
      </button>
    </div>
  );
}

function ReceiverEtaBlock({ donation }: { donation?: Donation }) {
  return (
    <div className="grid gap-4 text-sm">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
          <AppIcon name="clock" className="h-5 w-5 text-[#14733a]" />
          ETA
        </h3>
        <p className="mt-2 text-xs font-bold text-[#1f2a23]">
          {donation ? `Today, ${formatTime(donation.availableUntil)}` : "Today"}
          {" - "}
          {donation ? "30 min window" : "Awaiting schedule"}
        </p>
      </div>
      <div>
        <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
          <AppIcon name="pickup" className="h-5 w-5 text-[#14733a]" />
          Est. duration
        </h3>
        <p className="mt-2 text-xs font-bold text-[#1f2a23]">35 min (12 km)</p>
      </div>
    </div>
  );
}

function ReceiverDetailNote({
  icon,
  title,
  body,
  action,
  onActionClick,
}: {
  icon: IconName;
  title: string;
  body: string[];
  action?: string;
  onActionClick?: () => void;
}) {
  return (
    <div className="grid content-start gap-2 px-1 lg:px-4 first:lg:pl-0">
      <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
        <AppIcon name={icon} className="h-5 w-5 text-[#14733a]" />
        {title}
      </h3>
      {body.map((line) => (
        <span
          className="block text-xs font-bold leading-5 text-[#1f2a23]"
          key={line}
        >
          {line}
        </span>
      ))}
      {action ? (
        <button
          className="mt-2 inline-flex min-h-10 w-max items-center gap-2 rounded-md border border-[#9eb69f] bg-[#e9f4e3] px-4 text-xs font-black text-[#064c25]"
          type="button"
          onClick={onActionClick}
        >
          <AppIcon name="message" className="h-4 w-4" />
          {action}
        </button>
      ) : null}
    </div>
  );
}

function ReceiverRouteSummary({ from }: { from: string }) {
  return (
    <div className="grid content-start gap-2 px-1 lg:px-4">
      <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
        <AppIcon name="map" className="h-5 w-5 text-[#14733a]" />
        Route summary
      </h3>
      <div className="grid gap-3 border-l border-dashed border-[#9eb69f] pl-4 text-xs font-bold text-[#1f2a23]">
        <span className="relative grid">
          <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-[#14733a]" />
          <strong>{from}</strong>
          Kemang, Jakarta Selatan
        </span>
        <span className="relative grid">
          <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-[#ef3e32]" />
          <strong>Panti Harapan</strong>
          Cilandak, Jakarta Selatan
        </span>
      </div>
    </div>
  );
}

function ReceiverTimelineCard({
  proposal,
  donation,
  pickup,
  allProposals,
  donationsById,
  token,
  runAction,
}: {
  proposal?: DeliveryProposal;
  donation?: Donation;
  pickup?: Pickup;
  allProposals: DeliveryProposal[];
  donationsById: Map<string, Donation>;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const [showAllDeliveries, setShowAllDeliveries] = useState(false);
  const receiverAccepted =
    Boolean(proposal?.receiverAcceptedAt) || proposal?.status === "accepted";

  const pickedUp =
    pickup?.status === "picked_up" || pickup?.status === "delivered";
  const delivered = pickup?.status === "delivered";
  const timelineItems: Array<{
    title: string;
    detail: string;
    time: string;
    done: boolean;
  }> = [
    {
      title:
        proposal?.status === "accepted"
          ? "Proposal accepted"
          : "Awaiting acceptance",
      detail:
        proposal?.status === "accepted"
          ? "Accepted by both parties"
          : receiverAccepted
            ? "You accepted proposal. Waiting for donor."
            : "Awaiting your decision",
      time: proposal?.receiverAcceptedAt
        ? formatTime(proposal.receiverAcceptedAt)
        : "",
      done: receiverAccepted,
    },
    {
      title: "Pickup assigned",
      detail: pickup
        ? "Volunteer is on the way"
        : "Waiting for delivery assignment",
      time: pickup?.createdAt ? formatTime(pickup.createdAt) : "",
      done: Boolean(pickup),
    },
    {
      title: "Picked up",
      detail: pickedUp ? "Volunteer has food" : "Waiting for volunteer update",
      time: pickup?.pickedUpAt ? formatTime(pickup.pickedUpAt) : "",
      done: pickedUp,
    },
    {
      title: "Delivered",
      detail: delivered
        ? "Food delivered safely"
        : "Waiting for delivery update",
      time: pickup?.deliveredAt ? formatTime(pickup.deliveredAt) : "",
      done: delivered,
    },
  ];

  return (
    <>
      <section className={cx(panel, "grid gap-4 p-5")}>
        <header>
          <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
            Accepted delivery timeline
          </h2>
          <p className="mt-2 text-xs font-bold text-[#46534a]">
            Latest accepted delivery
          </p>
        </header>
        <article className="grid grid-cols-[4.6rem_1fr] gap-3 rounded-lg border border-[#b9d4b7] bg-[#e7f3df] p-3">
          <DonationThumbnail donation={donation} size="md" />
          <div className="min-w-0">
            <strong className="block truncate text-sm font-black">
              {donation?.title ?? "Fresh Fruit & Bread Pack"}
            </strong>
            <span className="mt-1 block truncate text-xs font-bold text-[#46534a]">
              {donorDisplayName(donation)}
            </span>
            <span className="mt-2 block text-xs font-bold text-[#46534a]">
              Today,{" "}
              {donation ? formatTime(donation.availableUntil) : "02:00 PM"}
            </span>
          </div>
        </article>
        <ol className="grid gap-0">
          {timelineItems.map(({ title, detail, time, done }) => (
            <li className="grid grid-cols-[2rem_1fr] gap-3" key={title}>
              <span className="grid justify-items-center">
                <span
                  className={cx(
                    "grid h-7 w-7 place-items-center rounded-full text-white",
                    done ? "bg-[#14733a]" : "bg-[#a9aaa4]",
                  )}
                >
                  <AppIcon
                    name={done ? "check" : "clock"}
                    className="h-4 w-4"
                  />
                </span>
                <span className="h-10 w-px bg-[#c6c9c0] last:hidden" />
              </span>
              <span className="grid pb-3 text-xs font-bold text-[#46534a]">
                <strong className="text-sm font-black text-[#101812]">
                  {title}
                </strong>
                {detail}
                {time ? <span className="mt-1">{time}</span> : null}
              </span>
            </li>
          ))}
        </ol>
        {pickup?.status === "picked_up" && (
          <button
            className={cx(primaryButton, "w-full")}
            type="button"
            onClick={() =>
              runAction(async () => {
                await markPickupDelivered(token, pickup.id);
              }, "Delivery confirmed successfully.")
            }
          >
            Confirm delivery received
          </button>
        )}
        <button
          type="button"
          className="flex min-h-11 items-center justify-center gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] text-sm font-black text-[#064c25] hover:bg-[#f4f0e8]"
          onClick={() => setShowAllDeliveries(true)}
        >
          View all deliveries <AppIcon name="arrow" className="h-4 w-4" />
        </button>
      </section>

      {showAllDeliveries && (
        <SlidePanel
          title="All deliveries"
          icon="pickup"
          onClose={() => setShowAllDeliveries(false)}
        >
          <div className="grid gap-3 p-1">
            {allProposals.length === 0 ? (
              <p className="py-8 text-center text-sm font-bold text-[#46534a]">
                No deliveries yet.
              </p>
            ) : (
              allProposals.map((p) => {
                const don = p.donation ?? donationsById.get(p.donationId);
                const statusColors: Record<string, string> = {
                  pending: "bg-[#fff3cd] text-[#7a4f00]",
                  accepted: "bg-[#dbeafe] text-[#1e40af]",
                  rejected: "bg-[#fee2e2] text-[#991b1b]",
                  canceled: "bg-[#f3f4f6] text-[#6b7280]",
                };
                return (
                  <article
                    key={p.id}
                    className="grid grid-cols-[3rem_1fr_auto] items-start gap-3 rounded-xl border border-[#ded7c9] bg-[#fafaf7] p-4"
                  >
                    <DonationThumbnail donation={don} size="sm" />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black text-[#101812]">
                        {don?.title ?? "Donation"}
                      </strong>
                      <span className="mt-1 block text-xs font-bold text-[#46534a]">
                        {don ? formatDate(don.availableFrom) : ""}
                      </span>
                    </div>
                    <span
                      className={cx(
                        "rounded-full px-2 py-1 text-[0.65rem] font-black capitalize",
                        statusColors[p.status] ?? "bg-[#f3f4f6] text-[#6b7280]",
                      )}
                    >
                      {p.status}
                    </span>
                  </article>
                );
              })
            )}
          </div>
        </SlidePanel>
      )}
    </>
  );
}

function DonorMetricStrip({
  availableCount,
  pendingCount,
  deliveredCount,
}: {
  availableCount: number;
  pendingCount: number;
  deliveredCount: number;
}) {
  const metrics = [
    { label: "Available", value: availableCount, icon: "bag" as IconName },
    { label: "Pending", value: pendingCount, icon: "box" as IconName },
    { label: "Delivered", value: deliveredCount, icon: "check" as IconName },
  ];

  return (
    <section
      className="grid grid-cols-3 gap-2 lg:hidden"
      aria-label="Donation summary"
    >
      {metrics.map((metric) => (
        <div
          className="min-w-0 rounded-lg border border-[#ded7c9] bg-[#fffdf8] p-3 shadow-sm"
          key={metric.label}
        >
          <AppIcon name={metric.icon} className="mb-2 h-4 w-4 text-[#14733a]" />
          <strong className="block text-lg font-black leading-none text-[#101812]">
            {metric.value}
          </strong>
          <span className="mt-1 block truncate text-[0.68rem] font-bold text-[#46534a]">
            {metric.label}
          </span>
        </div>
      ))}
    </section>
  );
}

function ReceiverNeedsCard({
  profile,
  token,
  runAction,
}: {
  profile: Profile;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const [showAllNeeds, setShowAllNeeds] = useState(false);
  const needs = [
    [
      "Cooked meals for 30 children",
      "Balanced meals with protein and vegetables.",
      "May 19",
    ],
    [
      "Staple food & snacks",
      "Rice, eggs, fruits, milk, healthy snacks.",
      "May 18",
    ],
    [
      "Hygiene & daily needs",
      "Soap, shampoo, toothpaste, sanitary supplies.",
      "May 16",
    ],
  ];

  function handleUpdateNeeds() {
    const notes = window.prompt("Update needs notes", profile.notes ?? "");
    if (notes === null) {
      return;
    }
    void runAction(async () => {
      await updateMyProfile(token, {
        displayName: profile.displayName,
        contactMethod: profile.contactMethod,
        contactValue: profile.contactValue,
        location: profile.location,
        entityType: profile.entityType,
        operationalHours: profile.operationalHours,
        notes,
      });
    }, "Needs updated.");
  }

  return (
    <>
      <section className={cx(panel, "grid gap-4 p-5")} id="my-food-requests">
        <header className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-[1.15rem] leading-none tracking-[-0.035em] text-[#061e0e]">
            My food requests / needs
          </h2>
          <button
            className="rounded-md bg-[#ffbd1a] px-3 py-2 text-xs font-black text-[#10140d]"
            type="button"
            onClick={handleUpdateNeeds}
          >
            Update needs
          </button>
        </header>
        <div className="grid gap-3">
          {needs.map(([title, description, date], index) => (
            <article
              className="grid grid-cols-[3rem_1fr_auto] items-start gap-3"
              key={title}
            >
              <span
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-full",
                  index === 1
                    ? "bg-[#fee8ba] text-[#4d3510]"
                    : "bg-[#dcebd5] text-[#064c25]",
                )}
              >
                <AppIcon
                  name={index === 2 ? "leaf" : index === 1 ? "package" : "bag"}
                  className="h-5 w-5"
                />
              </span>
              <span className="grid">
                <strong className="text-xs font-black text-[#101812]">
                  {title}
                </strong>
                <span className="mt-1 text-xs font-bold leading-5 text-[#46534a]">
                  {index === 0 && profile.notes ? profile.notes : description}
                </span>
              </span>
              <span className="text-[0.65rem] font-bold text-[#7a817b]">
                Updated
                <br />
                {date}
              </span>
            </article>
          ))}
        </div>
        <button
          type="button"
          className="flex min-h-10 items-center justify-center gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] text-xs font-black text-[#064c25] hover:bg-[#f4f0e8]"
          onClick={() => setShowAllNeeds(true)}
        >
          View all needs <AppIcon name="arrow" className="h-4 w-4" />
        </button>
      </section>

      {showAllNeeds && (
        <SlidePanel
          title="My food requests / needs"
          icon="bag"
          onClose={() => setShowAllNeeds(false)}
        >
          <div className="grid gap-4 p-1">
            <button
              className="justify-self-end rounded-md bg-[#ffbd1a] px-3 py-2 text-xs font-black text-[#10140d] hover:bg-[#f0ac00]"
              type="button"
              onClick={handleUpdateNeeds}
            >
              Update needs
            </button>
            <div className="grid gap-4">
              {needs.map(([title, description, date], index) => (
                <article
                  className="grid grid-cols-[3rem_1fr_auto] items-start gap-3 rounded-xl border border-[#ded7c9] bg-[#fafaf7] p-4"
                  key={title}
                >
                  <span
                    className={cx(
                      "grid h-10 w-10 place-items-center rounded-full",
                      index === 1
                        ? "bg-[#fee8ba] text-[#4d3510]"
                        : "bg-[#dcebd5] text-[#064c25]",
                    )}
                  >
                    <AppIcon
                      name={
                        index === 2 ? "leaf" : index === 1 ? "package" : "bag"
                      }
                      className="h-5 w-5"
                    />
                  </span>
                  <span className="grid">
                    <strong className="text-sm font-black text-[#101812]">
                      {title}
                    </strong>
                    <span className="mt-1 text-xs font-bold leading-5 text-[#46534a]">
                      {index === 0 && profile.notes
                        ? profile.notes
                        : description}
                    </span>
                  </span>
                  <span className="text-[0.65rem] font-bold text-[#7a817b]">
                    Updated
                    <br />
                    {date}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </SlidePanel>
      )}
    </>
  );
}

function ProposalQueue({
  donations,
  proposals,
  viewerRole,
  token,
  runAction,
}: {
  donations: Donation[];
  proposals: DeliveryProposal[];
  viewerRole: "donor" | "receiver";
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const donationsById = useMemo(
    () => new Map(donations.map((donation) => [donation.id, donation])),
    [donations],
  );
  const [detailProposal, setDetailProposal] = useState<{
    proposal: DeliveryProposal;
    donation?: Donation;
  } | null>(null);

  return (
    <>
      <section
        className={cx(panel, "min-h-full min-w-0 p-5 sm:p-6")}
        id="proposal-queue"
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e5f1df] text-[#064c25]">
              <AppIcon name="team" className="h-6 w-6" />
            </span>
            <div>
              <h2 className={heading}>Proposal queue</h2>
              <p className="mt-1 text-xs font-bold text-[#1f2a23]">
                {viewerRole === "donor"
                  ? "Review proposals from volunteers and receivers."
                  : "Review food offers."}
              </p>
            </div>
          </div>
          <a className="text-xs font-black text-[#064c25]" href="#my-donations">
            View all
          </a>
        </header>
        <div className="grid gap-3">
          {proposals.length > 0 ? (
            proposals.map((proposal) => {
              const donation =
                proposal.donation ?? donationsById.get(proposal.donationId);
              const donorAccepted = Boolean(proposal.donorAcceptedAt);
              const receiverAccepted = Boolean(proposal.receiverAcceptedAt);

              const volunteerName =
                proposal.volunteerProfile?.displayName ??
                (proposal.volunteerId === "user_volunteer" ||
                proposal.volunteerId === "demo_volunteer"
                  ? "Budi Santoso"
                  : proposal.volunteerId
                      .replace(/^(user_|demo_)/, "")
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase()));
              const receiverName =
                proposal.receiverProfile?.displayName ??
                (proposal.receiverId === "user_receiver" ||
                proposal.receiverId === "demo_receiver"
                  ? "Panti Harapan"
                  : proposal.receiverId
                      .replace(/^(user_|demo_)/, "")
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase()));

              const volunteerInitials = volunteerName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <article
                  className="grid min-w-0 gap-4 rounded-lg border border-[#ded7c9] bg-[#fffdf8] p-3 sm:grid-cols-[6rem_minmax(0,1fr)]"
                  key={proposal.id}
                >
                  <DonationThumbnail donation={donation} size="lg" />
                  <div className="min-w-0">
                    <strong className="block text-sm font-black text-[#101812]">
                      {donation
                        ? donation.title
                        : `Donation ${proposal.donationId}`}
                    </strong>
                    <p className="mt-1 text-xs font-bold text-[#111a14]">
                      {donation ? formatDate(donation.availableFrom) : "Today"}{" "}
                      <span className="px-2">•</span>
                      {donation?.quantity ?? "Open quantity"}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs font-bold">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[#5c6860]">Volunteer</span>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ead7c5] text-[0.65rem] font-bold text-[#5c3e21]">
                          {volunteerInitials}
                        </span>
                        <span className="truncate font-black text-[#101812]">
                          {volunteerName}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[#5c6860]">Receiver</span>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#fff4df] text-[#c46b00]">
                          <AppIcon name="leaf" className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate font-black text-[#101812]">
                          {receiverName}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:col-start-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <span
                        className={cx(
                          badgeBase,
                          donorAccepted
                            ? "bg-[#e4f1e0] text-[#116b35]"
                            : "bg-[#fff3df] text-[#c46b00]",
                        )}
                      >
                        Donor {donorAccepted ? "Accepted" : "Pending"}
                      </span>
                      <span
                        className={cx(
                          badgeBase,
                          receiverAccepted
                            ? "bg-[#e4f1e0] text-[#116b35]"
                            : proposal.status === "rejected"
                              ? "bg-[#fde9e4] text-[#9b2118]"
                              : "bg-[#fff3df] text-[#c46b00]",
                        )}
                      >
                        Receiver{" "}
                        {proposal.status === "rejected"
                          ? "Rejected"
                          : receiverAccepted
                            ? "Accepted"
                            : "Pending"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-self-start">
                      {viewerRole === "donor" &&
                        (() => {
                          const rawPhone =
                            proposal.volunteerContactOverride ??
                            proposal.volunteerProfile?.contactValue ??
                            "";
                          if (!rawPhone) return null;
                          const digits = rawPhone.replace(/\D/g, "");
                          const number = digits.startsWith("0")
                            ? `62${digits.slice(1)}`
                            : digits;
                          const text = encodeURIComponent(
                            `Halo ${volunteerName}, saya donor dari FoodLink. Ingin konfirmasi proposal pengiriman untuk donasi "${donation?.title ?? ""}". Terima kasih!`,
                          );
                          return (
                            <a
                              href={`https://wa.me/${number}?text=${text}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cx(
                                ghostButton,
                                "inline-flex items-center gap-1.5 !text-[#14733a]",
                              )}
                            >
                              <svg
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                                focusable="false"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.882l6.198-1.624A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.368l-.36-.214-3.68.964.981-3.595-.234-.37A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
                              </svg>
                              WhatsApp
                            </a>
                          );
                        })()}
                      <button
                        className={ghostButton}
                        type="button"
                        onClick={() =>
                          runAction(async () => {
                            await rejectDeliveryProposal(token, proposal.id);
                          }, "Proposal rejected.")
                        }
                      >
                        Reject
                      </button>
                      {proposal.status === "pending" ? (
                        <button
                          className={primaryButton}
                          type="button"
                          onClick={() =>
                            runAction(async () => {
                              await acceptDeliveryProposal(token, proposal.id);
                            }, "Proposal accepted.")
                          }
                        >
                          Accept
                        </button>
                      ) : (
                        <button
                          className={ghostButton}
                          type="button"
                          onClick={() =>
                            setDetailProposal({ proposal, donation })
                          }
                        >
                          View details
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#d8cfba] bg-[#fffdf8] p-6 text-sm font-bold text-[#46534a]">
              No proposals yet.
            </div>
          )}
        </div>
      </section>

      {detailProposal && (
        <Modal title="Proposal details" onClose={() => setDetailProposal(null)}>
          <div className="grid gap-5">
            <div className="flex gap-4">
              <DonationThumbnail donation={detailProposal.donation} size="lg" />
              <div className="min-w-0">
                <strong className="block text-lg font-black text-[#101812]">
                  {detailProposal.donation?.title ??
                    readableDonationId(detailProposal.proposal.donationId)}
                </strong>
                <p className="mt-1 text-sm font-bold text-[#46534a]">
                  {detailProposal.donation?.description ?? "Food donation"}
                </p>
                <span
                  className={cx(
                    badgeBase,
                    statusClass(detailProposal.proposal.status),
                    "mt-2 inline-block",
                  )}
                >
                  {detailProposal.proposal.status}
                </span>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f7f5f0] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Donor accepted
                  </span>
                  <strong
                    className={cx(
                      "mt-1 block font-black",
                      detailProposal.proposal.donorAcceptedAt
                        ? "text-[#14733a]"
                        : "text-[#9d5b00]",
                    )}
                  >
                    {detailProposal.proposal.donorAcceptedAt
                      ? "Yes"
                      : "Pending"}
                  </strong>
                </div>
                <div className="rounded-lg bg-[#f7f5f0] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Receiver accepted
                  </span>
                  <strong
                    className={cx(
                      "mt-1 block font-black",
                      detailProposal.proposal.receiverAcceptedAt
                        ? "text-[#14733a]"
                        : "text-[#9d5b00]",
                    )}
                  >
                    {detailProposal.proposal.receiverAcceptedAt
                      ? "Yes"
                      : "Pending"}
                  </strong>
                </div>
              </div>
              {detailProposal.proposal.volunteerProfile && (
                <div className="rounded-lg border border-[#e4ddcf] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Volunteer
                  </span>
                  <span className="mt-1 block font-black text-[#101812]">
                    {detailProposal.proposal.volunteerProfile.displayName}
                  </span>
                  <span className="text-xs font-bold text-[#46534a]">
                    {detailProposal.proposal.volunteerProfile.contactValue}
                  </span>
                </div>
              )}
              {detailProposal.proposal.receiverProfile && (
                <div className="rounded-lg border border-[#e4ddcf] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Receiver
                  </span>
                  <span className="mt-1 block font-black text-[#101812]">
                    {detailProposal.proposal.receiverProfile.displayName}
                  </span>
                  <span className="text-xs font-bold text-[#46534a]">
                    {detailProposal.proposal.receiverProfile.location.city}
                  </span>
                </div>
              )}
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Created
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {formatDate(detailProposal.proposal.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function DonationsTable({
  donations,
  proposals = [],
  title,
  compact = false,
}: {
  donations: Donation[];
  proposals?: DeliveryProposal[];
  title: string;
  compact?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [detailDonation, setDetailDonation] = useState<Donation | null>(null);

  const statuses = [...new Set(donations.map((d) => d.status))];
  const visible =
    statusFilter === "all"
      ? donations
      : donations.filter((d) => d.status === statusFilter);

  return (
    <>
      <section
        className={cx(panel, "min-w-0 p-5 sm:p-6", compact && "min-h-full")}
        id="my-donations"
      >
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f4ead6] text-[#064c25]">
              <AppIcon name="package" className="h-6 w-6" />
            </span>
            <h2 className={heading}>{title}</h2>
          </div>
          <select
            className={cx(ghostButton, "cursor-pointer pr-2")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </header>
        <div className="mt-3 grid gap-3 md:hidden">
          {visible.length > 0 ? (
            visible.map((donation) => {
              const proposalCount = proposals.filter(
                (proposal) => proposal.donationId === donation.id,
              ).length;

              return (
                <article
                  className="grid min-w-0 gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] p-3"
                  key={donation.id}
                >
                  <div className="flex min-w-0 gap-3">
                    <DonationThumbnail donation={donation} />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-[#101812]">
                        {donation.title}
                      </strong>
                      <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#46534a]">
                        {donation.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-[#46534a]">
                    <span className="rounded-md bg-[#f7f5f0] p-2">
                      <strong className="block text-[#101812]">
                        {donation.quantity}
                      </strong>
                      Quantity
                    </span>
                    <span className="rounded-md bg-[#f7f5f0] p-2">
                      <strong className="block text-[#101812]">
                        {proposalCount}
                      </strong>
                      Proposals
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(badgeBase, statusClass(donation.status))}
                    >
                      {donation.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-bold text-[#46534a]">
                      Updated {formatDate(donation.updatedAt)}
                    </span>
                  </div>
                  <div className="rounded-md border border-[#e4ddcf] bg-[#faf8f2] p-2 text-xs font-bold leading-5 text-[#1f2a23]">
                    {formatDate(donation.availableFrom)} -{" "}
                    {formatDate(donation.availableUntil)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={cx(ghostButton, "min-h-11 flex-1")}
                      type="button"
                      onClick={() => setDetailDonation(donation)}
                    >
                      View
                    </button>
                    <button
                      className={cx(ghostButton, "min-h-11 flex-1")}
                      type="button"
                      onClick={() => navigator.clipboard.writeText(donation.id)}
                    >
                      Copy ID
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#d8cfba] bg-[#fffdf8] p-4 text-sm font-bold text-[#46534a]">
              No donations visible yet.
            </div>
          )}
        </div>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[56rem] border-collapse">
            <thead className="text-left">
              <tr>
                {[
                  "Donation",
                  "Quantity",
                  "Available window",
                  "Status",
                  "Latest update",
                  "Proposals",
                  "Actions",
                ].map((label) => (
                  <th
                    className="border-b border-[#ded7c9] px-3 py-3 text-xs font-black text-[#111a14]"
                    key={label}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length > 0 ? (
                visible.map((donation) => (
                  <tr key={donation.id}>
                    <td className="border-b border-[#ded7c9] px-3 py-3 font-black">
                      <div className="flex items-center gap-3">
                        <DonationThumbnail donation={donation} />
                        <div>
                          <strong className="block text-sm">
                            {donation.title}
                          </strong>
                          <small className="block text-xs font-bold text-[#46534a]">
                            {donation.description}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {donation.quantity}
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {formatDate(donation.availableFrom)} –{" "}
                      {formatDate(donation.availableUntil)}
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3">
                      <span
                        className={cx(badgeBase, statusClass(donation.status))}
                      >
                        {donation.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {formatDate(donation.updatedAt)}
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {
                        proposals.filter(
                          (proposal) => proposal.donationId === donation.id,
                        ).length
                      }
                    </td>
                    <td className="relative border-b border-[#ded7c9] px-3 py-3">
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md border border-[#ded7c9] bg-[#fffdf8] font-black"
                        type="button"
                        aria-label={`Donation actions for ${donation.title}`}
                        onClick={() =>
                          setMenuId(menuId === donation.id ? null : donation.id)
                        }
                      >
                        ⋮
                      </button>
                      {menuId === donation.id && (
                        <div className="absolute right-3 top-12 z-20 min-w-[9rem] rounded-lg border border-[#ded7c9] bg-[#fffdf8] py-1 shadow-lg">
                          <button
                            className="block w-full px-4 py-2 text-left text-xs font-bold text-[#1f2a23] hover:bg-[#f4f1eb]"
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(donation.id);
                              setMenuId(null);
                            }}
                          >
                            Copy ID
                          </button>
                          <button
                            className="block w-full px-4 py-2 text-left text-xs font-bold text-[#1f2a23] hover:bg-[#f4f1eb]"
                            type="button"
                            onClick={() => {
                              setDetailDonation(donation);
                              setMenuId(null);
                            }}
                          >
                            View details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="border-b border-[#ded7c9] px-3 py-4 font-bold text-[#34443a]"
                    colSpan={7}
                  >
                    No donations visible yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visible.length > 0 ? (
          <div className="mt-5 text-center text-xs font-bold text-[#5c6860] border-t border-[#ded7c9]/40 pt-4">
            Showing {visible.length} of {donations.length} donations
          </div>
        ) : null}
      </section>

      {detailDonation && (
        <Modal title="Donation details" onClose={() => setDetailDonation(null)}>
          <div className="grid gap-5">
            <div className="flex gap-4">
              <DonationThumbnail donation={detailDonation} size="lg" />
              <div className="min-w-0">
                <strong className="block text-lg font-black text-[#101812]">
                  {detailDonation.title}
                </strong>
                <p className="mt-1 text-sm font-bold text-[#46534a]">
                  {detailDonation.description}
                </p>
                <span
                  className={cx(
                    badgeBase,
                    statusClass(detailDonation.status),
                    "mt-2 inline-block",
                  )}
                >
                  {detailDonation.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#f7f5f0] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Quantity
                </span>
                <strong className="mt-1 block text-base font-black text-[#101812]">
                  {detailDonation.quantity}
                </strong>
              </div>
              <div className="rounded-lg bg-[#f7f5f0] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Proposals
                </span>
                <strong className="mt-1 block text-base font-black text-[#101812]">
                  {
                    proposals.filter((p) => p.donationId === detailDonation.id)
                      .length
                  }
                </strong>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Available window
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {formatDate(detailDonation.availableFrom)} –{" "}
                  {formatDate(detailDonation.availableUntil)}
                </span>
              </div>
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Pickup location
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {detailDonation.pickupLocation.addressLine1},{" "}
                  {detailDonation.pickupLocation.city}
                </span>
              </div>
              {detailDonation.specialInstructions && (
                <div className="rounded-lg bg-[#f0f7eb] p-3">
                  <span className="block text-xs font-black text-[#2f7a46]">
                    Special instructions
                  </span>
                  <p className="mt-1 font-bold leading-5 text-[#1f2a23]">
                    {detailDonation.specialInstructions}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Last updated
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {formatDate(detailDonation.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function NotificationsPanel({
  notifications,
  viewerRole,
  token,
  runAction,
}: {
  notifications: Notification[];
  viewerRole: User["role"];
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const unread = notifications.filter((item) => !item.read).length;
  const receiverVariant = viewerRole === "receiver";
  const [notificationFilter, setNotificationFilter] = useState<
    "all" | "unread"
  >("all");
  const [showAllModal, setShowAllModal] = useState(false);
  const visibleNotifications =
    receiverVariant && notificationFilter === "unread"
      ? notifications.filter((item) => !item.read)
      : notifications;

  return (
    <>
      <aside
        className={cx(panel, "sticky top-5 p-6")}
        id="notifications"
        aria-label="Notifications"
      >
        <header className="mb-3 flex items-center gap-3">
          <h2 className={heading}>Notifications</h2>
          {unread > 0 ? (
            <span className="rounded-md bg-[#e5f1df] px-2 py-1 text-xs font-black text-[#064c25]">
              {unread} unread
            </span>
          ) : null}
          <button
            className="ml-auto text-[#101812]"
            type="button"
            aria-label="Notification settings"
          >
            <AppIcon name="settings" className="h-5 w-5" />
          </button>
          <button className="text-[#101812]" type="button" aria-label="Close">
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </header>
        {receiverVariant ? (
          <div className="mb-4 grid grid-cols-2 border-b border-[#ded7c9] text-center text-sm font-bold">
            <button
              className={cx(
                "py-3",
                notificationFilter === "all"
                  ? "border-b-2 border-[#0b5b2b] text-[#064c25]"
                  : "text-[#46534a]",
              )}
              type="button"
              onClick={() => setNotificationFilter("all")}
            >
              All
            </button>
            <button
              className={cx(
                "py-3",
                notificationFilter === "unread"
                  ? "border-b-2 border-[#0b5b2b] text-[#064c25]"
                  : "text-[#46534a]",
              )}
              type="button"
              onClick={() => setNotificationFilter("unread")}
            >
              Unread ({unread})
            </button>
          </div>
        ) : null}
        <div className="grid">
          {visibleNotifications.length > 0
            ? visibleNotifications.map((notification) => (
                <article
                  className={cx(
                    "grid grid-cols-[3rem_1fr] gap-3 border-t border-[#ded7c9] py-5 first:border-t-0",
                    receiverVariant && "grid-cols-[3.5rem_1fr]",
                    notification.read && "opacity-60",
                  )}
                  key={notification.id}
                >
                  <span
                    className={cx(
                      "grid h-11 w-11 place-items-center rounded-full",
                      notification.type === "proposal_accepted"
                        ? "bg-[#ffe9c1] text-[#dd6700]"
                        : notification.type === "pickup_assigned"
                          ? "bg-[#deedf8] text-[#1c6796]"
                          : notification.type === "pickup_completed"
                            ? "bg-[#dfeedd] text-[#116b35]"
                            : "bg-[#e5f1df] text-[#064c25]",
                    )}
                    aria-hidden="true"
                  >
                    <AppIcon
                      name={
                        notification.type === "pickup_assigned"
                          ? "pickup"
                          : notification.type === "pickup_completed"
                            ? "check"
                            : notification.type === "proposal_created"
                              ? "package"
                              : "team"
                      }
                      className="h-5 w-5"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="block text-sm font-black text-[#101812] min-w-0">
                        {receiverNotificationTitle(notification)}
                      </strong>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="whitespace-nowrap text-xs font-bold text-[#46534a]">
                          {formatDate(notification.createdAt)}
                        </span>
                        {!notification.read ? (
                          <span className="h-2 w-2 rounded-full bg-[#ffbd1a]" />
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#1f2a23]">
                      {notification.body}
                    </p>
                  </div>
                  {!notification.read ? (
                    <button
                      className="col-start-2 justify-self-start border-0 bg-transparent p-0 text-sm font-black text-[#064c25] transition hover:text-[#116b35]"
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await markNotificationRead(token, notification.id);
                        }, "Notification marked read.")
                      }
                    >
                      Mark read
                    </button>
                  ) : null}
                </article>
              ))
            : emptyCopy(
                notificationFilter === "unread"
                  ? "No unread notifications."
                  : "No notifications yet.",
              )}
        </div>
        <button
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[#9eb69f] bg-[#fffdf8] text-sm font-black text-[#064c25] transition hover:bg-[#f0f7eb]"
          type="button"
          onClick={() => setShowAllModal(true)}
        >
          View all notifications <span className="text-lg">→</span>
        </button>
      </aside>

      {showAllModal && (
        <SlidePanel
          title="All notifications"
          icon="bell"
          onClose={() => setShowAllModal(false)}
        >
          <div className="grid">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <article
                  className={cx(
                    "grid grid-cols-[3rem_1fr] gap-3 border-t border-[#e4ddcf] py-4 first:border-t-0",
                    notification.read && "opacity-60",
                  )}
                  key={notification.id}
                >
                  <span
                    className={cx(
                      "grid h-11 w-11 place-items-center rounded-full",
                      notification.type === "proposal_accepted"
                        ? "bg-[#ffe9c1] text-[#dd6700]"
                        : notification.type === "pickup_assigned"
                          ? "bg-[#deedf8] text-[#1c6796]"
                          : notification.type === "pickup_completed"
                            ? "bg-[#dfeedd] text-[#116b35]"
                            : "bg-[#e5f1df] text-[#064c25]",
                    )}
                  >
                    <AppIcon
                      name={
                        notification.type === "pickup_assigned"
                          ? "pickup"
                          : notification.type === "pickup_completed"
                            ? "check"
                            : notification.type === "proposal_created"
                              ? "package"
                              : "team"
                      }
                      className="h-5 w-5"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="block text-sm font-black text-[#101812]">
                        {receiverNotificationTitle(notification)}
                      </strong>
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ffbd1a]" />
                      )}
                    </div>
                    <span className="mt-0.5 block text-xs font-bold text-[#46534a]">
                      {formatDate(notification.createdAt)}
                    </span>
                    {!notification.read && (
                      <button
                        className="mt-2 text-xs font-black text-[#064c25] hover:text-[#116b35]"
                        type="button"
                        onClick={() =>
                          runAction(async () => {
                            await markNotificationRead(token, notification.id);
                          }, "Notification marked read.")
                        }
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="py-8 text-center text-sm font-bold text-[#46534a]">
                No notifications yet.
              </p>
            )}
          </div>
        </SlidePanel>
      )}
    </>
  );
}

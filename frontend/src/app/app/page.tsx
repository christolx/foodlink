"use client";

import {
  ArrowRight,
  Bell,
  Box,
  CalendarDays,
  ChartColumn,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Filter,
  LayoutDashboard,
  Leaf,
  type LucideIcon,
  MapIcon,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CldUploadWidget,
  type CloudinaryUploadWidgetInfo,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  acceptDeliveryProposal,
  createDeliveryProposal,
  createDonation,
  type DeliveryProposal,
  type Donation,
  listDeliveryProposals,
  listDonations,
  listNotifications,
  listReceivers,
  markNotificationRead,
  markPickupDelivered,
  markPickupPickedUp,
  type Notification,
  type Profile,
  rejectDeliveryProposal,
  type User,
} from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { getMe, getMyProfile } from "@/lib/session";

type DashboardData = {
  user: User;
  profile: Profile;
  donations: Donation[];
  proposals: DeliveryProposal[];
  receivers: Profile[];
  notifications: Notification[];
};

type ActionState = {
  message: string;
  tone: "success" | "error";
} | null;

const demoLocation = {
  addressLine1: "Jl. Sudirman 1",
  city: "Jakarta",
  region: "DKI Jakarta",
  postalCode: "10220",
  country: "ID",
};

const roleLabels = {
  donor: "Donor",
  volunteer: "Volunteer",
  receiver: "Receiver",
};

const leafMark =
  "inline-block h-6 w-6 rotate-[-28deg] rounded-[100%_0_100%_0] border-[3px] border-current text-[#ffb91f]";
const panel =
  "rounded-[0.85rem] border border-[#ded7c9] bg-[#fffdf7]/82 shadow-[0_1rem_2.5rem_rgba(50,43,28,0.08)]";
const heading =
  "font-serif text-[1.55rem] font-normal leading-none tracking-[-0.035em] text-[#061e0e]";
const input =
  "min-h-10 w-full rounded-md border border-[#cfc8ba] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#111a14] outline-none transition placeholder:text-[#7a817b] focus:border-[#116b35] focus:ring-2 focus:ring-[#116b35]/15";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#ffbd1a] px-5 font-black text-[#10140d] shadow-[0_0.75rem_1.5rem_rgba(167,111,2,0.16)] transition hover:-translate-y-0.5 hover:bg-[#f4b30e] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const ghostButton =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-[#9eb69f] bg-[#fffdf8] px-4 text-sm font-black text-[#064c25] transition hover:-translate-y-0.5 hover:bg-[#f6fbf3] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const badgeBase =
  "inline-flex min-h-6 items-center rounded-md px-2.5 text-xs font-black";
const defaultDonationImage = "/landing/cards/donate-card.webp";
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const cloudinaryUploadEnabled =
  Boolean(cloudinaryCloudName) && Boolean(cloudinaryUploadPreset);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusClass(status: Donation["status"] | DeliveryProposal["status"]) {
  if (status === "rejected" || status === "canceled") {
    return "bg-[#f7d8d1] text-[#8a2e22]";
  }
  if (
    status === "accepted" ||
    status === "picked_up" ||
    status === "delivered"
  ) {
    return "bg-[#dcebd5] text-[#14351f]";
  }
  if (
    status === "proposal_pending" ||
    status === "pending" ||
    status === "pickup_assigned"
  ) {
    return "bg-[#f7dfaa] text-[#332309]";
  }

  return "bg-[#dcebd5] text-[#14351f]";
}

function emptyCopy(value: string) {
  return <p className="font-bold text-[#34443a]">{value}</p>;
}

type IconName =
  | "arrow"
  | "bag"
  | "bell"
  | "box"
  | "calendar"
  | "chart"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "dashboard"
  | "filter"
  | "leaf"
  | "map"
  | "marker"
  | "message"
  | "navigation"
  | "package"
  | "pickup"
  | "profile"
  | "search"
  | "settings"
  | "team";

const icons: Record<IconName, LucideIcon> = {
  arrow: ArrowRight,
  bag: ShoppingBag,
  bell: Bell,
  box: Box,
  calendar: CalendarDays,
  chart: ChartColumn,
  check: Check,
  chevron: ChevronDown,
  clock: Clock3,
  close: X,
  dashboard: LayoutDashboard,
  filter: Filter,
  leaf: Leaf,
  map: MapIcon,
  marker: MapPin,
  message: MessageSquare,
  navigation: Navigation,
  package: Package,
  pickup: Truck,
  profile: CircleUserRound,
  search: Search,
  settings: Settings,
  team: Users,
};

function AppIcon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const Icon = icons[name];

  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}

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
    const [user, profile, donations, proposals, notifications] =
      await Promise.all([
        getMe(activeToken),
        getMyProfile(activeToken),
        listDonations(activeToken),
        listDeliveryProposals(activeToken),
        listNotifications(activeToken),
      ]);
    const receivers =
      user.role === "volunteer" ? await listReceivers(activeToken) : null;

    setData({
      user,
      profile,
      donations: donations.items,
      proposals: proposals.items,
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
    <main className="grid min-h-screen bg-[#f8f6ef] text-[#101812] lg:grid-cols-[13.75rem_minmax(0,1fr)]">
      <DashboardSidebar signOut={signOut} />

      <section
        className="mx-auto w-full max-w-[116rem] px-5 py-7 lg:px-8"
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
    </main>
  );
}

function DashboardSidebar({ signOut }: { signOut: () => void }) {
  const navItems: Array<{ label: string; icon: IconName; href: string }> = [
    { label: "Dashboard", icon: "dashboard", href: "#dashboard-title" },
    { label: "My donations", icon: "bag", href: "#my-donations" },
    { label: "Proposals", icon: "box", href: "#proposal-queue" },
    { label: "Pickups", icon: "pickup", href: "#work" },
    { label: "Messages", icon: "message", href: "#notifications" },
    { label: "Reports", icon: "chart", href: "#my-donations" },
    { label: "Profile", icon: "profile", href: "#dashboard-title" },
    { label: "Settings", icon: "settings", href: "#dashboard-title" },
  ];

  return (
    <aside
      className="sticky top-0 grid min-h-screen grid-rows-[auto_1fr_auto_auto] gap-8 bg-[radial-gradient(circle_at_70%_92%,rgba(30,112,48,0.32),transparent_12rem),linear-gradient(180deg,#063514_0%,#052b12_52%,#031b0c_100%)] px-4 py-9 text-[#f8f5ea] max-lg:static max-lg:min-h-0"
      aria-label="Dashboard navigation"
    >
      <Link className="mx-auto text-[#ffbf1c]" href="/" aria-label="FoodLink">
        <AppIcon name="leaf" className="h-14 w-14" />
      </Link>
      <nav className="grid content-start gap-3">
        {navItems.map((item, index) => (
          <a
            className={cx(
              "flex min-h-12 items-center gap-4 rounded-lg px-5 text-sm font-black transition hover:bg-white/10",
              index === 0 &&
                "bg-[#116b35] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
            )}
            href={item.href}
            key={item.label}
          >
            <AppIcon name={item.icon} className="h-5 w-5 shrink-0" />
            {item.label}
          </a>
        ))}
      </nav>
      <div className="rounded-lg border border-white/10 bg-[#0b4c25]/45 p-5">
        <AppIcon name="leaf" className="mb-6 h-9 w-9 text-[#1ea35a]" />
        <strong className="block text-sm font-black leading-5">
          Every meal makes a difference
        </strong>
        <p className="mt-4 text-xs font-bold leading-5 text-[#dfe8dc]">
          Thank you for feeding our community.
        </p>
      </div>
      <button
        className="flex min-h-11 items-center gap-4 rounded-lg px-5 text-sm font-black transition hover:bg-white/10"
        type="button"
        onClick={signOut}
      >
        <AppIcon name="pickup" className="h-5 w-5 rotate-180" />
        Log out
      </button>
    </aside>
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
      className="mb-6 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center"
      id="overview"
    >
      <Link
        className="font-serif text-[2.35rem] leading-none tracking-[-0.055em] text-[#061e0e]"
        href="/"
      >
        FoodLink
      </Link>
      <Link
        className="grid min-w-36 gap-1 justify-self-start rounded-md border border-[#d2cbbd] bg-[#fffdf8] px-3 py-1.5 text-xs font-bold shadow-sm"
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
      <div className="flex items-center gap-6 justify-self-start md:justify-self-end">
        <a
          className="relative text-[#101812]"
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
        <span className="h-10 w-px bg-[#d2cbbd]" aria-hidden="true" />
        <div className="flex items-center gap-4">
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
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <button
      className="grid gap-1 justify-self-start text-left text-xs font-bold text-[#5d675f]"
      type="button"
    >
      {label ? <span>{label}</span> : null}
      <span className="grid min-h-11 grid-cols-[1.75rem_1fr_1rem] items-center gap-2 rounded-lg border border-[#d7d0c2] bg-[#fffdf8] px-3 text-sm font-black text-[#111a14] shadow-sm">
        <AppIcon name={icon} className="h-5 w-5 text-[#101812]" />
        <span className="truncate">{value}</span>
        <AppIcon name="chevron" className="h-4 w-4 text-[#101812]" />
      </span>
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

  async function handleCreateDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const now = new Date();
    const later = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    await runAction(async () => {
      await createDonation(token, {
        title: String(form.get("title") || "Fresh prepared meals"),
        description: String(
          form.get("description") || "Safe surplus food ready for pickup.",
        ),
        quantity: String(form.get("quantity") || "10 packs"),
        imageUrl: uploadedImageUrl || defaultDonationImage,
        pickupLocation: demoLocation,
        availableFrom: now.toISOString(),
        availableUntil: later.toISOString(),
        specialInstructions: String(form.get("instructions") || ""),
      });
      formElement.reset();
      setUploadedImageUrl("");
      setUploadError("");
    }, "Donation posted.");
  }

  return (
    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="grid gap-5" id="work">
        <section className="grid gap-5 lg:grid-cols-[minmax(28rem,1.08fr)_minmax(24rem,0.92fr)]">
          <form
            className={cx(panel, "grid gap-4 p-6")}
            onSubmit={handleCreateDonation}
          >
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f4ead6] text-[#064c25]">
                <AppIcon name="leaf" className="h-6 w-6" />
              </span>
              <h2 className={heading}>Create donation</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
              <label className="grid gap-2 text-xs font-black text-[#1a281f]">
                Title
                <input
                  className={input}
                  name="title"
                  placeholder="e.g. Fresh vegetables from today"
                  required
                />
              </label>
              <label className="grid gap-2 text-xs font-black text-[#1a281f]">
                Quantity
                <input
                  className={input}
                  name="quantity"
                  placeholder="e.g. 15 kg, 10 packs"
                  required
                />
              </label>
            </div>

            <label className="grid gap-2 text-xs font-black text-[#1a281f]">
              Description
              <textarea
                className={cx(input, "min-h-20 resize-y")}
                name="description"
                placeholder="Describe the food, condition, and anything important."
                required
              />
            </label>

            <label className="grid gap-2 text-xs font-black text-[#1a281f]">
              Pickup location
              <span className="grid grid-cols-[2.5rem_1fr_2.5rem] overflow-hidden rounded-md border border-[#cfc8ba] bg-[#fffdf8]">
                <span className="grid place-items-center text-[#064c25]">
                  <AppIcon name="map" className="h-5 w-5" />
                </span>
                <input
                  className="min-h-10 bg-transparent px-2 text-sm font-bold outline-none"
                  name="location"
                  placeholder="Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan"
                />
                <span className="grid place-items-center border-l border-[#cfc8ba] text-[#064c25]">
                  <AppIcon name="map" className="h-5 w-5" />
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-black text-[#1a281f]">
                Available from
                <input
                  className={input}
                  name="availableFrom"
                  type="datetime-local"
                />
              </label>
              <label className="grid gap-2 text-xs font-black text-[#1a281f]">
                Available until
                <input
                  className={input}
                  name="availableUntil"
                  type="datetime-local"
                />
              </label>
            </div>

            <label className="grid gap-2 text-xs font-black text-[#1a281f]">
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
              <p className="text-xs font-black text-[#80251d]">{uploadError}</p>
            ) : null}

            <button className={primaryButton} type="submit">
              <AppIcon name="leaf" className="h-5 w-5" />
              Post donation
            </button>
          </form>

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
  const availableDonation = data.donations.find(
    (donation) => donation.status === "available",
  );
  const receiver = data.receivers[0];
  const activePickup = useMemo(
    () => data.notifications.find((item) => item.pickupId)?.pickupId,
    [data.notifications],
  );
  const pendingProposals = data.proposals.filter(
    (proposal) => proposal.status === "pending",
  ).length;
  const availableDonations = data.donations.filter(
    (donation) => donation.status === "available",
  );

  async function handleCreateProposal() {
    if (!availableDonation || !receiver) {
      throw new Error("Need available donation and receiver first.");
    }

    await createDeliveryProposal(token, {
      donationId: availableDonation.id,
      receiverId: receiver.userId,
    });
  }

  return (
    <div className="grid gap-3">
      <section className="grid min-h-[41rem] gap-0 overflow-hidden rounded-xl border border-[#ded7c9] bg-[#fffdf8]/78 shadow-[0_1rem_2.8rem_rgba(49,43,24,0.08)] 2xl:grid-cols-[minmax(23rem,1.04fr)_minmax(21rem,0.96fr)_minmax(19rem,0.78fr)]">
        <VolunteerDonationsPanel
          donations={data.donations}
          selectedDonation={availableDonation}
        />
        <VolunteerMapPanel donation={availableDonation} receiver={receiver} />
        <VolunteerReceiversPanel
          receivers={data.receivers}
          selectedReceiver={receiver}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_18rem]">
        <VolunteerProposalPanel
          donation={availableDonation}
          receiver={receiver}
          onCreate={() =>
            runAction(handleCreateProposal, "Delivery proposal created.")
          }
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
        pickupCount={activePickup ? 1 : 0}
      />
    </div>
  );
}

function VolunteerDonationsPanel({
  donations,
  selectedDonation,
}: {
  donations: Donation[];
  selectedDonation?: Donation;
}) {
  const sortedDonations = [...donations].sort((a, b) =>
    a.status === "available" && b.status !== "available" ? -1 : 1,
  );

  return (
    <section className="grid content-start gap-4 border-[#ded7c9] p-5 2xl:border-r">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Available donations
        </h2>
        <span className="rounded-full bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#14351f]">
          {donations.length}
        </span>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["All", "Available", "Proposal pending"].map((item, index) => (
            <button
              className={cx(
                "min-h-9 rounded-full border px-4 text-xs font-black",
                index === 0
                  ? "border-[#2f7a46] bg-[#3f7d48] text-white"
                  : "border-[#d9d1c2] bg-[#fffdf8] text-[#1f2a23]",
              )}
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d9d1c2] bg-[#fffdf8] px-3 text-xs font-black"
          type="button"
        >
          Nearest <AppIcon name="chevron" className="h-4 w-4" />
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
}: {
  donation: Donation;
  selected: boolean;
  index: number;
}) {
  const distance = `${(1.2 + index * 0.6).toFixed(1)} km`;

  return (
    <article
      className={cx(
        "grid grid-cols-[1.75rem_5.4rem_1fr_auto] items-center gap-3 rounded-lg border bg-[#fffdf8] p-3 transition",
        selected
          ? "border-[#2f7a46] bg-[#f8fbf3] shadow-[0_0.7rem_1.7rem_rgba(47,122,70,0.09)]"
          : "border-[#e4ddcf]",
      )}
    >
      <span
        className={cx(
          "grid h-6 w-6 place-items-center rounded-full border",
          selected
            ? "border-[#14733a] bg-[#14733a] text-white"
            : "border-[#b8b8ae] bg-white",
        )}
        aria-hidden="true"
      >
        {selected ? <AppIcon name="check" className="h-4 w-4" /> : null}
      </span>
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
        <span className={cx(badgeBase, statusClass(donation.status))}>
          {donation.status === "proposal_pending"
            ? "Proposal pending"
            : donation.status.replace("_", " ")}
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
      <div className="relative mx-4 min-h-[28rem] overflow-hidden rounded-lg border border-[#e4ddcf] bg-[#eef0ea]">
        <div className="absolute inset-0 bg-[linear-gradient(30deg,rgba(255,255,255,0.62)_12%,transparent_12%,transparent_88%,rgba(255,255,255,0.62)_88%),linear-gradient(120deg,rgba(255,255,255,0.5)_9%,transparent_9%,transparent_91%,rgba(255,255,255,0.5)_91%),linear-gradient(#d9dfd5_1px,transparent_1px),linear-gradient(90deg,#d9dfd5_1px,transparent_1px)] bg-[length:7rem_4rem,8rem_5rem,2.1rem_2.1rem,2.1rem_2.1rem] opacity-80" />
        <div className="absolute left-[34%] top-[15%] h-[18rem] w-[9rem] rotate-[-18deg] rounded-[60%] border-r-[6px] border-dashed border-[#0b4c25]" />
        <span className="absolute left-[34%] top-[16%] grid rounded-lg border border-[#d9d1c2] bg-[#fffdf8] p-3 shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.12)]">
          <span className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2f7a46] text-white">
              <AppIcon name="package" className="h-4 w-4" />
            </span>
            <span className="grid text-xs font-bold">
              <strong className="text-sm font-black text-[#101812]">
                {donation?.description?.split(" ")[0] ?? "Warteg"} Berkah
              </strong>
              Donor
            </span>
          </span>
        </span>
        <span className="absolute left-[35%] top-[43%] grid h-5 w-5 place-items-center rounded-full border-4 border-white bg-[#287bd5] shadow-md" />
        <span className="absolute left-[55%] top-[66%] grid rounded-lg border border-[#d9d1c2] bg-[#fffdf8] p-3 shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.12)]">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ffb91f] text-white">
              <AppIcon name="marker" className="h-5 w-5" />
            </span>
            <span className="grid text-xs font-bold">
              <strong className="text-sm font-black text-[#101812]">
                {receiver?.displayName ?? "Panti Harapan"}
              </strong>
              Receiver
            </span>
          </span>
        </span>
        <div className="absolute right-4 top-4 grid overflow-hidden rounded-lg border border-[#d9d1c2] bg-[#fffdf8] shadow-sm">
          {["+", "-", "⌖"].map((item) => (
            <button
              className="grid h-11 w-11 place-items-center border-b border-[#d9d1c2] text-xl font-bold last:border-b-0"
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        {donation ? (
          <article className="absolute inset-x-4 bottom-4 grid grid-cols-[4.8rem_1fr_auto] items-center gap-3 rounded-lg border border-[#d9d1c2] bg-[#fffdf8] p-3 shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.12)]">
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
            <span className="rounded-lg bg-[#dcebd5] px-3 py-2 text-xs font-black text-[#14351f]">
              1.2 km
            </span>
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
}: {
  receivers: Profile[];
  selectedReceiver?: Profile;
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
}: {
  receiver: Profile;
  selected: boolean;
  index: number;
}) {
  const accent = ["#2f7a46", "#e18a18", "#2f7a46", "#d8841a"][index % 4];

  return (
    <article
      className={cx(
        "grid grid-cols-[1.5rem_4.2rem_1fr] gap-3 rounded-lg border bg-[#fffdf8] p-4",
        selected ? "border-[#2f7a46] bg-[#f8fbf3]" : "border-[#e4ddcf]",
      )}
    >
      <span
        className={cx(
          "mt-7 grid h-6 w-6 place-items-center rounded-full border",
          selected
            ? "border-[#14733a] bg-[#14733a] text-white"
            : "border-[#b8b8ae] bg-white",
        )}
        aria-hidden="true"
      >
        {selected ? <AppIcon name="check" className="h-4 w-4" /> : null}
      </span>
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
  activePickup?: string;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  return (
    <section className={cx(panel, "grid gap-4 p-5")}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Active pickup
        </h2>
        <span className="rounded-full bg-[#fee6bf] px-3 py-1 text-xs font-black text-[#9d5b00]">
          Assigned
        </span>
      </header>
      <div>
        <strong className="block text-lg font-black">
          {activePickup ? `Pickup #${activePickup.slice(0, 6)}` : "No pickup"}
        </strong>
        <span className="text-xs font-bold text-[#46534a]">
          {activePickup ? "Assigned today" : "Waiting for accepted proposal"}
        </span>
      </div>
      <ol className="grid gap-3">
        {["Assigned", "Picked up", "Delivered"].map((step, index) => (
          <li className="grid grid-cols-[1.75rem_1fr_auto] gap-3" key={step}>
            <span
              className={cx(
                "grid h-7 w-7 place-items-center rounded-full text-xs font-black",
                index === 0
                  ? "bg-[#14733a] text-white"
                  : "bg-[#eeece3] text-[#46534a]",
              )}
            >
              {index + 1}
            </span>
            <span className="grid text-xs font-bold text-[#46534a]">
              <strong className="text-sm font-black text-[#101812]">
                {step}
              </strong>
              {index === 0 ? "You accepted task" : "Not started"}
            </span>
            {index === 0 ? (
              <span className="text-xs font-bold text-[#46534a]">10:24</span>
            ) : null}
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <button
          className={ghostButton}
          type="button"
          disabled={!activePickup}
          onClick={() =>
            activePickup
              ? runAction(async () => {
                  await markPickupPickedUp(token, activePickup);
                }, "Pickup marked picked up.")
              : undefined
          }
        >
          Mark picked up
        </button>
        <button
          className={primaryButton}
          type="button"
          disabled={!activePickup}
          onClick={() =>
            activePickup
              ? runAction(async () => {
                  await markPickupDelivered(token, activePickup);
                }, "Pickup marked delivered.")
              : undefined
          }
        >
          Mark delivered
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
  const activeProposal =
    pendingProposals.find((proposal) => proposal.donorAcceptedAt) ??
    pendingProposals[0] ??
    data.proposals[0];
  const activeDonation = activeProposal
    ? donationsById.get(activeProposal.donationId)
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
          token={token}
          runAction={runAction}
        />
        <div className="grid gap-4">
          <ReceiverTimelineCard donation={activeDonation} />
          <ReceiverNeedsCard profile={data.profile} />
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
  token,
  runAction,
}: {
  proposals: DeliveryProposal[];
  donationsById: Map<string, Donation>;
  activeProposalId?: string;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const sortedProposals = [...proposals].sort((a, b) =>
    a.id === activeProposalId ? -1 : b.id === activeProposalId ? 1 : 0,
  );

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
        >
          Sort: Newest <AppIcon name="chevron" className="h-4 w-4" />
        </button>
      </header>

      <div className="grid gap-3">
        {sortedProposals.length > 0
          ? sortedProposals.map((proposal, index) => {
              const donation = donationsById.get(proposal.donationId);
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
}: {
  proposal: DeliveryProposal;
  donation?: Donation;
  expanded: boolean;
  index: number;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const title = donation?.title ?? readableDonationId(proposal.donationId);
  const donorName = donorDisplayName(donation);
  const volunteerName =
    index % 2 === 0 ? "Siti Nur A. (Volunteer)" : "Budi Santoso (Volunteer)";

  return (
    <article
      className={cx(
        "rounded-lg border bg-[#fffdf8] transition",
        expanded
          ? "border-[#b9d4b7] bg-[#f4fbef] shadow-[0_0.8rem_2.2rem_rgba(47,122,70,0.08)]"
          : "border-[#ded7c9]",
      )}
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
              {volunteerName}
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
            <span className="rounded-md bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#116b35]">
              Donor accepted
            </span>
            <span className="rounded-md bg-[#fee8ba] px-3 py-1 text-xs font-black text-[#4d3510]">
              Your decision
            </span>
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
                donorName,
                "Jl. Kemang Raya No.10",
                "Kemang, Jakarta Selatan",
              ]}
              action="Open in Maps"
            />
            <ReceiverInfoBlock
              icon="marker"
              title="Delivery to"
              body={[
                "Panti Harapan",
                "Jl. Damai No. 25",
                "Cilandak, Jakarta Selatan",
              ]}
              action="Open in Maps"
            />
            <ReceiverEtaBlock donation={donation} />
            <div className="grid content-center gap-3">
              <button
                className={primaryButton}
                type="button"
                onClick={() =>
                  runAction(async () => {
                    await acceptDeliveryProposal(token, proposal.id);
                  }, "Proposal accepted.")
                }
                disabled={proposal.status !== "pending"}
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
                disabled={proposal.status !== "pending"}
              >
                Reject proposal
              </button>
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
              body={["WhatsApp", "+62 812-3456-7890"]}
              action="Message on WhatsApp"
            />
            <ReceiverRouteSummary from={donorName} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ReceiverInfoBlock({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string[];
  action: string;
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
}: {
  icon: IconName;
  title: string;
  body: string[];
  action?: string;
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

function ReceiverTimelineCard({ donation }: { donation?: Donation }) {
  const timelineItems: Array<{
    title: string;
    detail: string;
    time: string;
    done: boolean;
  }> = [
    {
      title: "Proposal accepted",
      detail: "You accepted this proposal",
      time: "Today, 10:05 AM",
      done: true,
    },
    {
      title: "Pickup assigned",
      detail: "Volunteer is on the way",
      time: "Today, 01:30 PM",
      done: true,
    },
    {
      title: "Picked up",
      detail: "Waiting for volunteer update",
      time: "",
      done: false,
    },
    {
      title: "Delivered",
      detail: "Waiting for delivery update",
      time: "",
      done: false,
    },
  ];

  return (
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
            Today, {donation ? formatTime(donation.availableUntil) : "02:00 PM"}
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
                <AppIcon name={done ? "check" : "clock"} className="h-4 w-4" />
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
      <a
        className="flex min-h-11 items-center justify-center gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] text-sm font-black text-[#064c25]"
        href="#proposal-queue"
      >
        View all deliveries <AppIcon name="arrow" className="h-4 w-4" />
      </a>
    </section>
  );
}

function ReceiverNeedsCard({ profile }: { profile: Profile }) {
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

  return (
    <section className={cx(panel, "grid gap-4 p-5")}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[1.15rem] leading-none tracking-[-0.035em] text-[#061e0e]">
          My food requests / needs
        </h2>
        <button
          className="rounded-md bg-[#ffbd1a] px-3 py-2 text-xs font-black text-[#10140d]"
          type="button"
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
      <a
        className="flex min-h-10 items-center justify-center gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] text-xs font-black text-[#064c25]"
        href="#proposal-queue"
      >
        View all needs <AppIcon name="arrow" className="h-4 w-4" />
      </a>
    </section>
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

  return (
    <section className={cx(panel, "min-h-full p-4")} id="proposal-queue">
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
            const donation = donationsById.get(proposal.donationId);
            const donorAccepted = Boolean(proposal.donorAcceptedAt);
            const receiverAccepted = Boolean(proposal.receiverAcceptedAt);

            return (
              <article
                className="grid gap-4 rounded-lg border border-[#ded7c9] bg-[#fffdf8] p-3 2xl:grid-cols-[6rem_1fr_auto]"
                key={proposal.id}
              >
                <DonationThumbnail donation={donation} size="lg" />
                <div>
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
                    <span className="flex items-center gap-2">
                      Volunteer
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ead7c5] text-[0.65rem]">
                        V
                      </span>
                      {proposal.volunteerId}
                    </span>
                    <span className="flex items-center gap-2">
                      Receiver
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e5f1df] text-[#064c25]">
                        <AppIcon name="leaf" className="h-3.5 w-3.5" />
                      </span>
                      {proposal.receiverId}
                    </span>
                  </div>
                </div>
                <div className="grid content-between gap-3">
                  <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
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
                  <div className="flex flex-wrap gap-2 justify-self-end">
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
                      <button className={ghostButton} type="button">
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
  return (
    <section
      className={cx(panel, "p-5", compact && "min-h-full")}
      id="my-donations"
    >
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f4ead6] text-[#064c25]">
            <AppIcon name="package" className="h-6 w-6" />
          </span>
          <h2 className={heading}>{title}</h2>
        </div>
        <button className={ghostButton} type="button">
          All statuses <span className="ml-3 text-lg leading-none">⌄</span>
        </button>
      </header>
      <div className="mt-3 overflow-x-auto">
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
            {donations.length > 0 ? (
              donations.map((donation) => (
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
                      {donation.status.replace("_", " ")}
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
                  <td className="border-b border-[#ded7c9] px-3 py-3">
                    <button
                      className="grid h-8 w-8 place-items-center rounded-md border border-[#ded7c9] bg-[#fffdf8] font-black"
                      type="button"
                      aria-label={`Donation actions for ${donation.title}`}
                    >
                      ⋮
                    </button>
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
    </section>
  );
}

function DonationThumbnail({
  donation,
  size = "md",
}: {
  donation?: Donation;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = donation?.imageUrl;
  const boxClass =
    size === "lg"
      ? "h-24 w-24 rounded-md"
      : size === "sm"
        ? "h-12 w-12 rounded-md"
        : "h-11 w-16 rounded-md";

  if (imageUrl && !failed) {
    return (
      // biome-ignore lint/performance/noImgElement: Donation image URLs are user-provided and can be arbitrary remote or root-relative URLs.
      <img
        alt={donation?.title ?? "Donation image"}
        className={cx(boxClass, "shrink-0 object-cover")}
        src={imageUrl}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        boxClass,
        "grid shrink-0 place-items-center bg-[#e8f1e6] text-[#2f7a46] shadow-[inset_0_0_0_1px_rgba(47,122,70,0.12)]",
      )}
    >
      <span className={cx(leafMark, "h-5 w-5 border-2")} />
    </span>
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

  return (
    <aside
      className={cx(
        panel,
        "sticky top-5 p-4",
        receiverVariant &&
          "rounded-none border-y-0 border-r-0 bg-[#fffdf8]/72 shadow-none xl:-my-7 xl:min-h-screen xl:pt-7",
      )}
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
            className="border-b-2 border-[#0b5b2b] py-3 text-[#064c25]"
            type="button"
          >
            All
          </button>
          <button className="py-3 text-[#46534a]" type="button">
            Unread ({unread})
          </button>
        </div>
      ) : null}
      <div className="grid">
        {notifications.length > 0
          ? notifications.map((notification) => (
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
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <strong className="block text-sm font-black text-[#101812]">
                      {receiverNotificationTitle(notification)}
                    </strong>
                    <span className="whitespace-nowrap text-xs font-bold text-[#46534a]">
                      {formatDate(notification.createdAt)}
                    </span>
                    {!notification.read ? (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-[#ffbd1a]" />
                    ) : null}
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
          : emptyCopy("No notifications yet.")}
      </div>
      <a
        className="mt-4 flex min-h-12 items-center justify-center gap-3 rounded-md border border-[#9eb69f] bg-[#fffdf8] text-sm font-black text-[#064c25]"
        href="#notifications"
      >
        View all notifications <span className="text-lg">→</span>
      </a>
    </aside>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function quantityNumber(value: string) {
  const match = value.match(/\d+/);

  return match ? Number(match[0]) : 0;
}

function readableDonationId(value: string) {
  return value
    .replace(/^demo_donation_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function donorDisplayName(donation?: Donation) {
  if (!donation?.description) {
    return "Kedai Roti Hangat";
  }

  const description = donation.description.trim();

  if (description.length <= 28) {
    return description;
  }

  return ["Kedai Roti Hangat", "Dapur Baik Warteg", "Restoran Nusantara"][
    quantityNumber(donation.quantity) % 3
  ];
}

function compactFoodDescription(donation?: Donation) {
  if (!donation?.description) {
    return "Fresh meals ready for delivery";
  }

  const description = donation.description.replace(/\.$/, "");

  return description.length > 52
    ? `${description.slice(0, 49).trim()}...`
    : description;
}

function receiverNotificationTitle(notification: Notification) {
  if (notification.type === "proposal_created") {
    return "New proposal from donor";
  }
  if (notification.type === "proposal_accepted") {
    return "Donor accepted proposal";
  }
  if (notification.type === "pickup_assigned") {
    return "Pickup assigned";
  }
  if (notification.type === "pickup_completed") {
    return "Thank you!";
  }

  return notification.title;
}

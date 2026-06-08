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
const kicker =
  "text-[0.78rem] font-black uppercase tracking-[0.12em] text-[#064c25]";
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
          <>
            {data.user.role !== "volunteer" ? (
              <StatusStrip data={data} />
            ) : null}
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
                token={token}
                runAction={runAction}
              />
            </div>
          </>
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
      <span>{label}</span>
      <span className="grid min-h-11 grid-cols-[1.75rem_1fr_1rem] items-center gap-2 rounded-lg border border-[#d7d0c2] bg-[#fffdf8] px-3 text-sm font-black text-[#111a14] shadow-sm">
        <AppIcon name={icon} className="h-5 w-5 text-[#101812]" />
        <span className="truncate">{value}</span>
        <AppIcon name="chevron" className="h-4 w-4 text-[#101812]" />
      </span>
    </button>
  );
}

function StatusStrip({ data }: { data: DashboardData }) {
  const unread = data.notifications.filter((item) => !item.read).length;

  return (
    <section
      className="mb-5 grid gap-3 md:grid-cols-3"
      id="overview"
      aria-label="Dashboard stats"
    >
      <article className="rounded-lg border border-[#d8cfba]/85 bg-[#fffdf5]/62 p-5 shadow-[0_0.8rem_2.2rem_rgba(49,43,24,0.06)]">
        <strong className="block font-serif text-5xl font-normal leading-none tracking-[-0.05em] text-[#073515]">
          {data.donations.length}
        </strong>
        <span className="font-black text-[#34443a]">Donations visible</span>
      </article>
      <article className="rounded-lg border border-[#d8cfba]/85 bg-[#fffdf5]/62 p-5 shadow-[0_0.8rem_2.2rem_rgba(49,43,24,0.06)]">
        <strong className="block font-serif text-5xl font-normal leading-none tracking-[-0.05em] text-[#073515]">
          {data.proposals.length}
        </strong>
        <span className="font-black text-[#34443a]">Delivery proposals</span>
      </article>
      <article className="rounded-lg border border-[#d8cfba]/85 bg-[#fffdf5]/62 p-5 shadow-[0_0.8rem_2.2rem_rgba(49,43,24,0.06)]">
        <strong className="block font-serif text-5xl font-normal leading-none tracking-[-0.05em] text-[#073515]">
          {unread}
        </strong>
        <span className="font-black text-[#34443a]">Unread notifications</span>
      </article>
    </section>
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
  return (
    <>
      <ProposalQueue
        donations={data.donations}
        proposals={data.proposals}
        viewerRole="receiver"
        token={token}
        runAction={runAction}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <section className={panel}>
          <p className={kicker}>Accepted delivery timeline</p>
          <h2 className={heading}>Track proposal to doorstep.</h2>
          <ol className="mt-5 grid gap-3 [counter-reset:steps]">
            {[
              "Proposal received",
              "Both parties accept",
              "Volunteer picks up",
              "Delivered",
            ].map((step) => (
              <li
                className="flex items-center gap-3 font-black text-[#34443a] before:grid before:h-7 before:w-7 before:place-items-center before:rounded-full before:border before:border-[#d8cfba] before:content-[counter(steps)] before:[counter-increment:steps] first:before:border-[#2f7a46] first:before:bg-[#2f7a46] first:before:text-white"
                key={step}
              >
                {step}
              </li>
            ))}
          </ol>
        </section>
        <section className={panel}>
          <p className={kicker}>Needs notes</p>
          <h2 className={heading}>
            {data.profile.entityType ?? "Community receiver"}
          </h2>
          <p className="mt-4 font-bold leading-7 text-[#34443a]">
            {data.profile.notes ??
              "Keep profile current so volunteers can match food with care."}
          </p>
          <span className="mt-4 block font-black text-[#073515]">
            {data.profile.contactMethod}: {data.profile.contactValue}
          </span>
        </section>
      </section>
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
  token,
  runAction,
}: {
  notifications: Notification[];
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <aside
      className={cx(panel, "sticky top-5 p-4")}
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
      <div className="grid">
        {notifications.length > 0
          ? notifications.map((notification) => (
              <article
                className={cx(
                  "grid grid-cols-[3rem_1fr] gap-3 border-t border-[#ded7c9] py-5 first:border-t-0",
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
                      {notification.title}
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

"use client";

import {
  Bell,
  Box,
  ChartColumn,
  Check,
  CircleUserRound,
  LayoutDashboard,
  Leaf,
  type LucideIcon,
  MapIcon,
  MessageSquare,
  Package,
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
  | "bag"
  | "bell"
  | "box"
  | "chart"
  | "check"
  | "close"
  | "dashboard"
  | "leaf"
  | "map"
  | "message"
  | "package"
  | "pickup"
  | "profile"
  | "settings"
  | "team";

const icons: Record<IconName, LucideIcon> = {
  bag: ShoppingBag,
  bell: Bell,
  box: Box,
  chart: ChartColumn,
  check: Check,
  close: X,
  dashboard: LayoutDashboard,
  leaf: Leaf,
  map: MapIcon,
  message: MessageSquare,
  package: Package,
  pickup: Truck,
  profile: CircleUserRound,
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
            <StatusStrip data={data} />
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
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <DonationsTable
          donations={data.donations}
          title="Available donations"
          compact
        />
        <section className={panel}>
          <p className={kicker}>Receiver directory</p>
          <h2 className={heading}>Match food to need.</h2>
          <div className="mt-4 grid gap-3">
            {data.receivers.length > 0 ? (
              data.receivers.map((item) => (
                <article
                  className="grid gap-1 rounded-lg border border-[#d8cfba] bg-[#f7f4e9]/75 p-4"
                  key={item.userId}
                >
                  <strong className="text-[#0e1b14]">{item.displayName}</strong>
                  <span className="font-bold text-[#34443a]">
                    {item.entityType ?? "receiver"} / {item.location.city}
                  </span>
                  <small className="font-bold text-[#5a6259]">
                    {item.operationalHours ?? "Hours on request"}
                  </small>
                </article>
              ))
            ) : (
              <p className="font-bold text-[#34443a]">
                No receiver profiles available.
              </p>
            )}
          </div>
        </section>
      </section>

      <section
        className={cx(
          panel,
          "grid gap-4 lg:grid-cols-[1fr_max-content] lg:items-center",
        )}
      >
        <div>
          <p className={kicker}>Create delivery proposal</p>
          <h2 className={heading}>
            {availableDonation && receiver
              ? `${availableDonation.title} to ${receiver.displayName}`
              : "Select available donation and receiver"}
          </h2>
          <p className="mt-3 max-w-2xl font-bold leading-7 text-[#34443a]">
            Volunteers pair one available donation with one receiver. Donor and
            receiver both accept before pickup is assigned.
          </p>
        </div>
        <button
          className={primaryButton}
          type="button"
          onClick={() =>
            runAction(handleCreateProposal, "Delivery proposal created.")
          }
          disabled={!availableDonation || !receiver}
        >
          Create proposal
        </button>
      </section>

      <section
        className={cx(
          panel,
          "grid gap-4 lg:grid-cols-[minmax(12rem,0.7fr)_1fr_max-content] lg:items-center",
        )}
      >
        <div>
          <p className={kicker}>Pickup workflow</p>
          <h2 className={heading}>
            {activePickup ? "Pickup assigned" : "Waiting for acceptance"}
          </h2>
        </div>
        <ol className="grid gap-2 [counter-reset:steps]">
          {["Assigned", "Picked up", "Delivered"].map((step) => (
            <li
              className="flex items-center gap-3 font-black text-[#34443a] before:grid before:h-7 before:w-7 before:place-items-center before:rounded-full before:border before:border-[#d8cfba] before:content-[counter(steps)] before:[counter-increment:steps] first:before:border-[#2f7a46] first:before:bg-[#2f7a46] first:before:text-white"
              key={step}
            >
              {step}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
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
    </>
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

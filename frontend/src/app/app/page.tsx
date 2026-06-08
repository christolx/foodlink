"use client";

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
  "rounded-xl border border-[#d8cfba] bg-[#fffdf5]/80 p-5 shadow-[0_1.4rem_3rem_rgba(61,55,36,0.10)]";
const kicker =
  "mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#2f7a46]";
const heading = "font-serif text-3xl font-normal leading-none text-[#073515]";
const input =
  "min-h-11 w-full rounded-lg border border-[#d8cfba] bg-white px-4 py-3 font-bold text-[#0e1b14] outline-none transition focus:border-[#2f7a46] focus:ring-2 focus:ring-[#2f7a46]/20";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-gradient-to-b from-[#ffca39] to-[#f5a623] px-5 font-black text-[#171206] shadow-[0_1rem_2rem_rgba(116,72,3,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const ghostButton =
  "inline-flex min-h-12 items-center justify-center rounded-lg border border-[#d8cfba] bg-[#fffdf5]/70 px-5 font-black text-[#14351f] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
const badgeBase =
  "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-black";
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
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_12%_18%,rgba(199,224,189,0.58),transparent_22rem),radial-gradient(circle_at_88%_82%,rgba(255,200,77,0.20),transparent_18rem),#f7f4e9] text-[#0e1b14] md:grid-cols-[minmax(14rem,17rem)_minmax(0,1fr)]">
      <aside
        className="sticky top-0 grid min-h-screen content-start gap-8 bg-[radial-gradient(circle_at_10%_90%,rgba(245,166,35,0.18),transparent_12rem),linear-gradient(180deg,#073515,#0b2214)] p-5 text-[#f7f4e9] max-md:static max-md:min-h-0"
        aria-label="Dashboard navigation"
      >
        <Link
          className="inline-flex items-center gap-3 font-serif text-3xl"
          href="/"
        >
          <span className={leafMark} aria-hidden="true" />
          FoodLink
        </Link>
        <nav className="grid gap-2 max-md:grid-cols-3">
          {["Overview", "Work queue", "Notifications"].map((item) => (
            <a
              className="flex min-h-11 items-center rounded-lg bg-white/10 px-4 font-black"
              href={`#${item === "Overview" ? "overview" : item === "Work queue" ? "work" : "notifications"}`}
              key={item}
            >
              {item}
            </a>
          ))}
        </nav>
        <button
          className="mt-[clamp(4rem,32vh,22rem)] flex min-h-11 items-center rounded-lg border border-white/20 px-4 font-black max-md:mt-0"
          type="button"
          onClick={signOut}
        >
          Sign out
        </button>
      </aside>

      <section
        className="mx-auto w-[min(100%,1500px)] p-4 md:p-8"
        aria-labelledby="dashboard-title"
      >
        <header className="mb-5 flex items-center justify-between gap-4 max-md:grid">
          <div>
            <p className={kicker}>{roleLabels[data.user.role]} dashboard</p>
            <h1
              id="dashboard-title"
              className="font-serif text-[clamp(2.4rem,5vw,4.6rem)] leading-none tracking-[-0.04em] text-[#073515]"
            >
              {data.profile.displayName}
            </h1>
          </div>
          <Link className={ghostButton} href="/demo">
            Switch role
          </Link>
        </header>

        <StatusStrip data={data} />
        {action ? (
          <p
            className={cx(
              "mb-4 rounded-lg border p-4 font-black",
              action.tone === "success"
                ? "border-[#93c7a2] bg-[#e8f1e6] text-[#14351f]"
                : "border-[#f0a59b] bg-[#fff0eb] text-[#80251d]",
            )}
          >
            {action.message}
          </p>
        ) : null}

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <div className="grid gap-4" id="work">
            {data.user.role === "donor" ? (
              <DonorDashboard data={data} token={token} runAction={runAction} />
            ) : null}
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
      </section>
    </main>
  );
}

function StatusStrip({ data }: { data: DashboardData }) {
  const unread = data.notifications.filter((item) => !item.read).length;

  return (
    <section
      className="mb-4 grid gap-3 md:grid-cols-3"
      id="overview"
      aria-label="Dashboard stats"
    >
      <article className="rounded-xl border border-[#d8cfba] bg-gradient-to-b from-[#f7f4e9] to-[#eee7d7] p-5">
        <strong className="block font-serif text-5xl font-normal leading-none text-[#073515]">
          {data.donations.length}
        </strong>
        <span className="font-black text-[#34443a]">Donations visible</span>
      </article>
      <article className="rounded-xl border border-[#d8cfba] bg-gradient-to-b from-[#f7f4e9] to-[#eee7d7] p-5">
        <strong className="block font-serif text-5xl font-normal leading-none text-[#073515]">
          {data.proposals.length}
        </strong>
        <span className="font-black text-[#34443a]">Delivery proposals</span>
      </article>
      <article className="rounded-xl border border-[#d8cfba] bg-gradient-to-b from-[#f7f4e9] to-[#eee7d7] p-5">
        <strong className="block font-serif text-5xl font-normal leading-none text-[#073515]">
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
      if (!uploadedImageUrl) {
        throw new Error("Upload donation image first.");
      }
      await createDonation(token, {
        title: String(form.get("title") || "Fresh prepared meals"),
        description: String(
          form.get("description") || "Safe surplus food ready for pickup.",
        ),
        quantity: String(form.get("quantity") || "10 packs"),
        imageUrl: uploadedImageUrl,
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
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <form
          className={cx(panel, "grid gap-4")}
          onSubmit={handleCreateDonation}
        >
          <p className={kicker}>Create donation</p>
          <h2 className={heading}>Post food while it is still useful.</h2>
          <label className="grid gap-2 text-sm font-black text-[#34443a]">
            Title
            <input
              className={input}
              name="title"
              placeholder="Fresh produce boxes"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#34443a]">
            Quantity
            <input
              className={input}
              name="quantity"
              placeholder="12 boxes"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#34443a]">
            Description
            <textarea
              className={cx(input, "min-h-28 resize-y")}
              name="description"
              placeholder="Prepared today, safe for same-day pickup."
              required
            />
          </label>
          <div className="grid gap-2 text-sm font-black text-[#34443a]">
            Donation image
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
                    className={ghostButton}
                    type="button"
                    onClick={() => open()}
                  >
                    {uploadedImageUrl ? "Replace image" : "Upload image"}
                  </button>
                )}
              </CldUploadWidget>
            ) : (
              <p className="rounded-lg border border-[#f0a59b] bg-[#fff0eb] p-3 text-[#80251d]">
                Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and
                NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to enable image uploads.
              </p>
            )}
            <input
              name="imageUrl"
              readOnly
              required
              type="hidden"
              value={uploadedImageUrl}
            />
            {uploadedImageUrl ? (
              // biome-ignore lint/performance/noImgElement: Cloudinary upload preview uses a freshly returned remote CDN URL.
              <img
                alt="Uploaded donation preview"
                className="h-40 w-full rounded-lg object-cover"
                src={uploadedImageUrl}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-[#d8cfba] bg-white/60 p-3 text-[#5d685f]">
                Image required before posting donation.
              </p>
            )}
            {uploadError ? (
              <p className="text-[#80251d]">{uploadError}</p>
            ) : null}
          </div>
          <label className="grid gap-2 text-sm font-black text-[#34443a]">
            Special instructions
            <input
              className={input}
              name="instructions"
              placeholder="Use rear entrance"
            />
          </label>
          <button
            className={primaryButton}
            type="submit"
            disabled={!uploadedImageUrl}
          >
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

      <DonationsTable donations={data.donations} title="My donations" />
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
    <section className={panel}>
      <p className={kicker}>Proposal queue</p>
      <h2 className={heading}>
        {viewerRole === "donor"
          ? "Review volunteer matches."
          : "Review food offers."}
      </h2>
      <div className="mt-4 grid gap-3">
        {proposals.length > 0 ? (
          proposals.map((proposal) => {
            const donation = donationsById.get(proposal.donationId);

            return (
              <article
                className="grid gap-3 rounded-lg border border-[#d8cfba] bg-[#f7f4e9]/75 p-4"
                key={proposal.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[#0e1b14]">{proposal.id}</strong>
                  <span className={cx(badgeBase, statusClass(proposal.status))}>
                    {proposal.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <DonationThumbnail donation={donation} size="sm" />
                  <p className="font-bold leading-6 text-[#34443a]">
                    {donation
                      ? donation.title
                      : `Donation ${proposal.donationId}`}{" "}
                    / Receiver {proposal.receiverId}
                  </p>
                </div>
                <small className="font-bold text-[#5a6259]">
                  Donor {proposal.donorAcceptedAt ? "accepted" : "pending"} /
                  Receiver{" "}
                  {proposal.receiverAcceptedAt ? "accepted" : "pending"}
                </small>
                {proposal.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="min-h-10 rounded-md bg-[#2f7a46] px-4 font-black text-[#fffdf5]"
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await acceptDeliveryProposal(token, proposal.id);
                        }, "Proposal accepted.")
                      }
                    >
                      Accept
                    </button>
                    <button
                      className="min-h-10 rounded-md border border-[#d8cfba] px-4 font-black text-[#8a2e22]"
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await rejectDeliveryProposal(token, proposal.id);
                        }, "Proposal rejected.")
                      }
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="font-bold text-[#34443a]">No proposals yet.</p>
        )}
      </div>
    </section>
  );
}

function DonationsTable({
  donations,
  title,
  compact = false,
}: {
  donations: Donation[];
  title: string;
  compact?: boolean;
}) {
  return (
    <section className={cx(panel, compact && "min-h-full")}>
      <p className={kicker}>{title}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse">
          <thead className="text-left">
            <tr>
              {["Item", "Quantity", "Status", "Window"].map((label) => (
                <th
                  className="border-b border-[#d8cfba] px-3 py-3 text-xs font-black uppercase text-[#5a6259]"
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
                  <td className="border-b border-[#d8cfba] px-3 py-4 font-black">
                    <div className="flex items-center gap-3">
                      <DonationThumbnail donation={donation} />
                      <div>
                        <strong className="block">{donation.title}</strong>
                        <small className="block font-bold text-[#5a6259]">
                          {donation.pickupLocation.city}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-[#d8cfba] px-3 py-4 font-bold">
                    {donation.quantity}
                  </td>
                  <td className="border-b border-[#d8cfba] px-3 py-4">
                    <span
                      className={cx(badgeBase, statusClass(donation.status))}
                    >
                      {donation.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="border-b border-[#d8cfba] px-3 py-4 font-bold">
                    {formatDate(donation.availableUntil)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="border-b border-[#d8cfba] px-3 py-4 font-bold text-[#34443a]"
                  colSpan={4}
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
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = donation?.imageUrl;
  const boxClass =
    size === "sm"
      ? "h-12 w-12 rounded-lg"
      : "h-14 w-16 rounded-lg md:h-16 md:w-20";

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
        "grid shrink-0 place-items-center bg-[#e8f1e6] text-[#2f7a46]",
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
  return (
    <aside
      className={cx(panel, "sticky top-4")}
      id="notifications"
      aria-label="Notifications"
    >
      <div>
        <p className={kicker}>Notifications</p>
        <h2 className={heading}>Live updates</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {notifications.length > 0
          ? notifications.map((notification) => (
              <article
                className={cx(
                  "grid grid-cols-[0.75rem_1fr] gap-3 rounded-lg border border-[#d8cfba] bg-[#f7f4e9]/75 p-4",
                  notification.read && "opacity-60",
                )}
                key={notification.id}
              >
                <span
                  className={cx(
                    "mt-1.5 h-3 w-3 rounded-full",
                    notification.read ? "bg-[#d8cfba]" : "bg-[#ffca39]",
                  )}
                  aria-hidden="true"
                />
                <div>
                  <strong className="block text-[#0e1b14]">
                    {notification.title}
                  </strong>
                  <p className="mt-1 font-bold leading-6 text-[#34443a]">
                    {notification.body}
                  </p>
                  <small className="mt-2 block font-bold text-[#5a6259]">
                    {formatDate(notification.createdAt)}
                  </small>
                </div>
                {!notification.read ? (
                  <button
                    className="col-start-2 justify-self-start border-0 bg-transparent p-0 font-black text-[#073515]"
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

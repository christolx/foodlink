"use client";

import { useState } from "react";
import {
  acceptDeliveryProposal,
  type DeliveryProposal,
  type Donation,
  markPickupDelivered,
  type Pickup,
  type Profile,
  rejectDeliveryProposal,
} from "@/lib/api";
import { SlidePanel } from "../../_components/AppShell";
import {
  AppIcon,
  badgeBase,
  compactFoodDescription,
  cx,
  DonationThumbnail,
  donorDisplayName,
  formatDate,
  ghostButton,
  type IconName,
  leafMark,
  primaryButton,
  readableDonationId,
  statusClass,
} from "../../_components/ui";
import { ReceiverNeedsCard } from "./ReceiverNeedsCard";
import {
  ReceiverDetailNote,
  ReceiverEtaBlock,
  ReceiverInfoBlock,
} from "./receiver-details";

export function ReceiverMobileDashboard({
  acceptedCount,
  activeDonation,
  activePickup,
  activeProposal,
  deliveredMeals,
  donationsById,
  pendingCount,
  profile,
  proposals,
  runAction,
  token,
}: {
  acceptedCount: number;
  activeDonation?: Donation;
  activePickup?: Pickup;
  activeProposal?: DeliveryProposal;
  deliveredMeals: number;
  donationsById: Map<string, Donation>;
  pendingCount: number;
  profile: Profile;
  proposals: DeliveryProposal[];
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  token: string;
}) {
  return (
    <div className="grid gap-4 lg:hidden">
      <ReceiverMobileHero
        acceptedCount={acceptedCount}
        deliveredMeals={deliveredMeals}
        pendingCount={pendingCount}
      />
      <ReceiverPriorityProposalCard
        donation={activeDonation}
        donationsById={donationsById}
        proposal={activeProposal}
        runAction={runAction}
        token={token}
      />
      <ReceiverCompactTimeline
        activePickup={activePickup}
        donation={activePickup?.donation ?? activeDonation}
        donationsById={donationsById}
        proposal={activeProposal}
        proposals={proposals}
        runAction={runAction}
        token={token}
      />
      <ReceiverNeedsCard
        profile={profile}
        token={token}
        runAction={runAction}
      />
    </div>
  );
}

function ReceiverMobileHero({
  acceptedCount,
  deliveredMeals,
  pendingCount,
}: {
  acceptedCount: number;
  deliveredMeals: number;
  pendingCount: number;
}) {
  const stats = [
    { label: "Pending", value: pendingCount, icon: "package" as IconName },
    { label: "Accepted", value: acceptedCount, icon: "check" as IconName },
    { label: "Delivered", value: deliveredMeals, icon: "leaf" as IconName },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_78%_78%,rgba(255,189,26,0.14),transparent_7rem),linear-gradient(135deg,#073515_0%,#0a401d_100%)] p-5 text-[#fffdf7] shadow-[0_1.5rem_3rem_rgba(6,30,14,0.22)]">
      <div
        className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-[#ffbd1a]/25"
        aria-hidden="true"
      />
      <div
        className="absolute right-8 top-20 h-24 w-24 rounded-full border border-dashed border-[#fff5d8]/25"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-4 right-5 hidden h-16 w-16 place-items-center rounded-xl bg-[#d7b45d] text-[#173215] shadow-[0_1rem_2rem_rgba(0,0,0,0.18)] min-[390px]:grid"
        aria-hidden="true"
      >
        <AppIcon name="package" className="h-9 w-9" />
      </div>
      <div className="relative grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffdf8b]">
              Today
            </p>
            <h2 className="mt-2 font-serif text-[1.78rem] leading-none tracking-[-0.045em]">
              Today&apos;s food flow
            </h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#ffbd1a] text-[#0f240f]">
            <AppIcon name="leaf" className="h-6 w-6" />
          </span>
        </div>
        <div className="grid grid-cols-3 gap-0 rounded-2xl bg-white/[0.04] min-[390px]:mr-20">
          {stats.map((stat, index) => (
            <article
              className={cx(
                "grid justify-items-center gap-2 px-3 py-3 text-center",
                index > 0 && "border-l border-[#ffdf8b]/28",
              )}
              key={stat.label}
            >
              <span
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-full",
                  index === 0
                    ? "bg-[#ffbd1a] text-[#173215]"
                    : "bg-[#dcebd5]/38 text-white",
                )}
              >
                <AppIcon name={stat.icon} className="h-5 w-5" />
              </span>
              <strong className="block text-3xl font-black leading-none">
                {stat.value}
              </strong>
              <span className="block text-xs font-black lowercase text-[#dcebd5]">
                {stat.label}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReceiverPriorityProposalCard({
  donation,
  donationsById,
  proposal,
  runAction,
  token,
}: {
  donation?: Donation;
  donationsById: Map<string, Donation>;
  proposal?: DeliveryProposal;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  token: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (!proposal) {
    return (
      <section
        className="rounded-[1.1rem] border border-dashed border-[#d8cfba] bg-[#fffdf8] p-5 text-sm font-bold text-[#46534a]"
        id="receiver-priority"
      >
        No proposals yet. New food offers will appear here.
      </section>
    );
  }

  const activeDonation =
    donation ?? proposal.donation ?? donationsById.get(proposal.donationId);
  const volunteerName =
    proposal.volunteerProfile?.displayName ??
    (proposal.volunteerId === "user_volunteer" ||
    proposal.volunteerId === "demo_volunteer"
      ? "Budi Santoso"
      : "Siti Nur A.");
  const needsDecision =
    proposal.status === "pending" && !proposal.receiverAcceptedAt;

  return (
    <>
      <section
        className="grid gap-4 rounded-[1.25rem] border border-[#ded7c9] bg-[#fffdf8] p-4 shadow-[0_1rem_2.25rem_rgba(50,43,28,0.08)]"
        id="receiver-priority"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
              Priority proposal
            </h2>
            <p className="mt-1 text-xs font-bold text-[#46534a]">
              Review latest food offer
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {proposal.donorAcceptedAt || proposal.status === "accepted" ? (
              <span className={cx(badgeBase, "bg-[#dcebd5] text-[#116b35]")}>
                Donor accepted
              </span>
            ) : null}
            <span
              className={cx(
                badgeBase,
                needsDecision
                  ? "bg-[#fee8ba] text-[#4d3510]"
                  : statusClass(proposal.status),
              )}
            >
              {needsDecision ? "Your decision" : proposal.status}
            </span>
          </div>
        </header>

        <div className="grid gap-4 min-[390px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] min-[390px]:items-start">
          <MobileDonationPhoto donation={activeDonation} />

          <div className="grid gap-3">
            <div>
              <strong className="block text-lg font-black leading-tight text-[#101812]">
                {activeDonation?.title ??
                  readableDonationId(proposal.donationId)}
              </strong>
              <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-[#46534a]">
                {activeDonation?.quantity ?? "Open quantity"}
                <span className="px-2">•</span>
                {compactFoodDescription(activeDonation)}
              </p>
            </div>
            <div className="grid gap-2 text-sm font-bold text-[#1f2a23]">
              <span className="inline-flex items-center gap-2">
                <AppIcon name="calendar" className="h-5 w-5" />
                {activeDonation?.quantity ?? "Open quantity"}
              </span>
              <span className="inline-flex items-center gap-2">
                <AppIcon name="profile" className="h-5 w-5" />
                Volunteer: {volunteerName}
              </span>
              <span className="inline-flex items-center gap-2">
                <AppIcon name="clock" className="h-5 w-5" />
                ETA: 35 min
              </span>
            </div>
          </div>
        </div>

        <div className="hidden flex-wrap gap-2">
          {proposal.donorAcceptedAt || proposal.status === "accepted" ? (
            <span className="rounded-full bg-[#dcebd5] px-3 py-1.5 text-xs font-black text-[#116b35]">
              Donor accepted
            </span>
          ) : (
            <span className="rounded-full bg-[#f2ede4] px-3 py-1.5 text-xs font-black text-[#746957]">
              Awaiting donor
            </span>
          )}
          <span className="rounded-full bg-[#fff4df] px-3 py-1.5 text-xs font-black text-[#7a4f00]">
            ETA 35 min
          </span>
        </div>

        {needsDecision ? (
          <div className="grid grid-cols-[1fr_0.88fr] gap-2">
            <button
              className={cx(primaryButton, "min-h-12 rounded-xl")}
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
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#efb0a8] bg-[#fff7f3] px-4 text-sm font-black text-[#9b2118] transition active:scale-[0.98]"
              type="button"
              onClick={() =>
                runAction(async () => {
                  await rejectDeliveryProposal(token, proposal.id);
                }, "Proposal rejected.")
              }
            >
              Decline
            </button>
          </div>
        ) : (
          <button
            className={cx(ghostButton, "min-h-12 w-full rounded-xl")}
            type="button"
            onClick={() => setShowDetails(true)}
          >
            View proposal details
          </button>
        )}
        {needsDecision ? (
          <button
            className="text-center text-xs font-black text-[#064c25]"
            type="button"
            onClick={() => setShowDetails(true)}
          >
            View pickup, contact, and safety notes
          </button>
        ) : null}
      </section>

      {showDetails ? (
        <ReceiverMobileProposalDetails
          donation={activeDonation}
          proposal={proposal}
          onClose={() => setShowDetails(false)}
        />
      ) : null}
    </>
  );
}

function MobileDonationPhoto({ donation }: { donation?: Donation }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = donation?.imageUrl;

  if (imageUrl && !failed) {
    return (
      // biome-ignore lint/performance/noImgElement: Donation image URLs are user-provided and can be arbitrary remote or root-relative URLs.
      <img
        alt={donation?.title ?? "Donation image"}
        className="h-40 w-full rounded-[1rem] object-cover shadow-[inset_0_0_0_1px_rgba(47,122,70,0.12)] min-[390px]:h-[9.6rem]"
        src={imageUrl}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="grid h-40 place-items-center rounded-[1rem] bg-[#e7f3df] text-[#064c25] min-[390px]:h-[9.6rem]">
      <span className={cx(leafMark, "h-12 w-12")} />
    </div>
  );
}

function ReceiverMobileProposalDetails({
  donation,
  proposal,
  onClose,
}: {
  donation?: Donation;
  proposal: DeliveryProposal;
  onClose: () => void;
}) {
  const donorName =
    proposal.donorProfile?.displayName ?? donorDisplayName(donation);
  const volunteerContactValue =
    proposal.volunteerContactOverride ??
    proposal.volunteerProfile?.contactValue ??
    "+62 812-3456-7890";

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
      return;
    }
    const addr = [loc.addressLine1, loc.city, loc.region]
      .filter(Boolean)
      .join(", ");
    window.open(
      `https://www.google.com/maps/search/${encodeURIComponent(addr)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function openWhatsApp() {
    const cleanNumber = volunteerContactValue.replace(/\D/g, "");
    if (!cleanNumber) return;
    window.open(
      `https://wa.me/${cleanNumber}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <SlidePanel title="Proposal details" icon="package" onClose={onClose}>
      <div className="grid gap-4">
        <div className="flex gap-3">
          <DonationThumbnail donation={donation} size="lg" />
          <div className="min-w-0">
            <strong className="block text-base font-black text-[#101812]">
              {donation?.title ?? readableDonationId(proposal.donationId)}
            </strong>
            <p className="mt-1 text-xs font-bold leading-5 text-[#46534a]">
              {donation?.quantity ?? "Open quantity"} ·{" "}
              {compactFoodDescription(donation)}
            </p>
          </div>
        </div>
        <ReceiverInfoBlock
          icon="marker"
          title="Pickup location"
          body={[
            donorName,
            donation?.pickupLocation.addressLine1 ?? "Jl. Kemang Raya No.10",
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
            proposal.receiverProfile?.displayName ?? "Panti Harapan",
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
          body={[
            proposal.volunteerProfile?.displayName ?? "Volunteer",
            volunteerContactValue,
          ]}
          action="Message on WhatsApp"
          onActionClick={openWhatsApp}
        />
      </div>
    </SlidePanel>
  );
}

function ReceiverCompactTimeline({
  activePickup,
  donation,
  donationsById,
  proposal,
  proposals,
  runAction,
  token,
}: {
  activePickup?: Pickup;
  donation?: Donation;
  donationsById: Map<string, Donation>;
  proposal?: DeliveryProposal;
  proposals: DeliveryProposal[];
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  token: string;
}) {
  const [showAllDeliveries, setShowAllDeliveries] = useState(false);
  const receiverAccepted =
    Boolean(proposal?.receiverAcceptedAt) || proposal?.status === "accepted";
  const pickedUp =
    activePickup?.status === "picked_up" ||
    activePickup?.status === "delivered";
  const delivered = activePickup?.status === "delivered";
  const steps = [
    {
      label: proposal?.status === "accepted" ? "Accepted" : "Awaiting",
      done: receiverAccepted,
    },
    { label: "Assigned", done: Boolean(activePickup) },
    { label: "Picked up", done: pickedUp },
    { label: "Delivered", done: delivered },
  ];

  return (
    <>
      <section
        className="grid gap-4 rounded-[1.1rem] border border-[#ded7c9] bg-[#fffdf8] p-4 shadow-[0_1rem_2.25rem_rgba(50,43,28,0.07)]"
        id="deliveries"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-[1.25rem] leading-none tracking-[-0.04em] text-[#061e0e]">
              Accepted delivery
            </h2>
            <p className="mt-1 text-xs font-bold text-[#46534a]">
              Latest accepted delivery
            </p>
          </div>
          <button
            className="rounded-full bg-[#e5f1df] px-3 py-2 text-xs font-black text-[#064c25]"
            type="button"
            onClick={() => setShowAllDeliveries(true)}
          >
            View all
          </button>
        </header>

        <div className="grid gap-4 min-[390px]:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] min-[390px]:items-center">
          <article className="grid grid-cols-[4.25rem_1fr] gap-3 rounded-2xl bg-[#e7f3df] p-3 min-[390px]:grid-cols-1 min-[390px]:justify-items-center min-[390px]:text-center">
            <DonationThumbnail donation={donation} size="md" />
            <div className="min-w-0">
              <strong className="block truncate text-sm font-black text-[#101812]">
                {donation?.title ?? "Fresh Fruit & Bread Pack"}
              </strong>
              <span className="mt-1 block truncate text-xs font-bold text-[#46534a]">
                From: {donorDisplayName(donation)}
              </span>
              <span className="mt-2 block text-xs font-bold text-[#46534a]">
                ETA: 35 min
              </span>
            </div>
          </article>

          <ol className="grid gap-1.5">
            {steps.map((step, index) => (
              <li
                className="grid grid-cols-[1.8rem_1fr] gap-3"
                key={step.label}
              >
                <span className="grid justify-items-center">
                  <span
                    className={cx(
                      "grid h-7 w-7 place-items-center rounded-full text-xs font-black",
                      step.done
                        ? "bg-[#14733a] text-white"
                        : "bg-[#eeece3] text-[#46534a]",
                    )}
                  >
                    <AppIcon
                      name={step.done ? "check" : "clock"}
                      className="h-4 w-4"
                    />
                  </span>
                  {index < steps.length - 1 ? (
                    <span className="h-5 w-px bg-[#9eb69f]" />
                  ) : null}
                </span>
                <strong className="self-start pt-1 text-sm font-black text-[#101812]">
                  {step.label}
                </strong>
              </li>
            ))}
          </ol>
        </div>

        {activePickup?.status === "picked_up" ? (
          <button
            className={cx(primaryButton, "w-full rounded-xl")}
            type="button"
            onClick={() =>
              runAction(async () => {
                await markPickupDelivered(token, activePickup.id);
              }, "Delivery confirmed successfully.")
            }
          >
            Confirm delivery received
          </button>
        ) : null}
      </section>

      {showAllDeliveries ? (
        <SlidePanel
          title="All deliveries"
          icon="pickup"
          onClose={() => setShowAllDeliveries(false)}
        >
          <div className="grid gap-3 p-1">
            {proposals.length === 0 ? (
              <p className="py-8 text-center text-sm font-bold text-[#46534a]">
                No deliveries yet.
              </p>
            ) : (
              proposals.map((item) => {
                const itemDonation =
                  item.donation ?? donationsById.get(item.donationId);

                return (
                  <article
                    className="grid grid-cols-[3rem_1fr_auto] items-start gap-3 rounded-xl border border-[#ded7c9] bg-[#fafaf7] p-4"
                    key={item.id}
                  >
                    <DonationThumbnail donation={itemDonation} size="sm" />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black text-[#101812]">
                        {itemDonation?.title ??
                          readableDonationId(item.donationId)}
                      </strong>
                      <span className="mt-1 block text-xs font-bold text-[#46534a]">
                        {itemDonation
                          ? formatDate(itemDonation.availableFrom)
                          : ""}
                      </span>
                    </div>
                    <span
                      className={cx(
                        badgeBase,
                        statusClass(item.status),
                        "capitalize",
                      )}
                    >
                      {item.status}
                    </span>
                  </article>
                );
              })
            )}
          </div>
        </SlidePanel>
      ) : null}
    </>
  );
}

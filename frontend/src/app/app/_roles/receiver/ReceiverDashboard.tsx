"use client";

import { useMemo, useState } from "react";
import {
  acceptDeliveryProposal,
  type DeliveryProposal,
  type Donation,
  markPickupDelivered,
  type Pickup,
  rejectDeliveryProposal,
} from "@/lib/api";
import { SlidePanel } from "../../_components/AppShell";
import {
  AppIcon,
  compactFoodDescription,
  cx,
  DonationThumbnail,
  donorDisplayName,
  emptyCopy,
  formatDate,
  formatTime,
  type IconName,
  panel,
  primaryButton,
  quantityNumber,
  readableDonationId,
} from "../../_components/ui";
import type { DashboardData } from "../../_types/dashboard";
import { ReceiverMobileDashboard } from "./ReceiverMobileDashboard";
import { ReceiverNeedsCard } from "./ReceiverNeedsCard";
import {
  ReceiverDetailNote,
  ReceiverEtaBlock,
  ReceiverInfoBlock,
  ReceiverRouteSummary,
} from "./receiver-details";

export function ReceiverDashboard({
  data,
  token,
  runAction,
  openChat,
}: {
  data: DashboardData;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  openChat: (userId: string) => void;
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
    <>
      <ReceiverMobileDashboard
        acceptedCount={acceptedProposals.length}
        activeDonation={activeDonation}
        activePickup={activePickup}
        activeProposal={activeProposal}
        deliveredMeals={deliveredMeals}
        donationsById={donationsById}
        pendingCount={pendingProposals.length}
        profile={data.profile}
        proposals={data.proposals}
        runAction={runAction}
        token={token}
      />

      <div className="hidden gap-5 lg:grid">
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
            openChat={openChat}
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
    </>
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
  openChat,
}: {
  proposals: DeliveryProposal[];
  donationsById: Map<string, Donation>;
  activeProposalId?: string;
  onSelectProposalId: (id: string) => void;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  openChat: (userId: string) => void;
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
          ? sortedProposals.map((proposal) => {
              const donation =
                proposal.donation ?? donationsById.get(proposal.donationId);
              const expanded = proposal.id === activeProposalId;

              return (
                <ReceiverProposalCard
                  donation={donation}
                  expanded={expanded}
                  key={proposal.id}
                  proposal={proposal}
                  token={token}
                  runAction={runAction}
                  openChat={openChat}
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
  token,
  runAction,
  openChat,
  onSelect,
}: {
  proposal: DeliveryProposal;
  donation?: Donation;
  expanded: boolean;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  openChat: (userId: string) => void;
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
  const volunteerName = proposal.volunteerProfile?.displayName ?? "Volunteer";
  const volunteerContactValue =
    proposal.volunteerContactOverride ??
    proposal.volunteerProfile?.contactValue ??
    "";
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
                  "Address not available",
                [donation?.pickupLocation.city, donation?.pickupLocation.region]
                  .filter(Boolean)
                  .join(", ") || "—",
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
                  "Address not available",
                [
                  proposal.receiverProfile?.location.city,
                  proposal.receiverProfile?.location.region,
                ]
                  .filter(Boolean)
                  .join(", ") || "—",
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

          <div className="grid gap-4 border-t border-[#d6e5cf] pt-4 lg:grid-cols-4 lg:divide-x lg:divide-[#d6e5cf]">
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
                volunteerContactMethodLabel,
                ...(volunteerContactValue ? [volunteerContactValue] : []),
              ]}
              action={volunteerContactValue ? "Message on WhatsApp" : undefined}
              onActionClick={
                volunteerContactValue
                  ? () => {
                      const cleanNumber = volunteerContactValue.replace(
                        /\D/g,
                        "",
                      );
                      if (cleanNumber) {
                        window.open(
                          `https://wa.me/${cleanNumber}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }
                  : undefined
              }
            />
            <ReceiverDetailNote
              icon="message"
              title="In-app chat"
              body={[
                "Conversation stays with this delivery context.",
                volunteerName,
              ]}
              action="Chat in-app"
              onActionClick={() => openChat(proposal.volunteerId)}
            />
            <ReceiverRouteSummary
              from={donorName}
              fromCity={
                [donation?.pickupLocation.city, donation?.pickupLocation.region]
                  .filter(Boolean)
                  .join(", ") || undefined
              }
              toName={proposal.receiverProfile?.displayName}
              toCity={
                [
                  proposal.receiverProfile?.location.city,
                  proposal.receiverProfile?.location.region,
                ]
                  .filter(Boolean)
                  .join(", ") || undefined
              }
            />
          </div>
        </div>
      ) : null}
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

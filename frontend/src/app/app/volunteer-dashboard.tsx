"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  createDeliveryProposal,
  type Donation,
  markPickupDelivered,
  markPickupPickedUp,
  type Pickup,
  type Profile,
} from "@/lib/api";
import { VolunteerMapDynamic } from "./dashboard-maps";
import type { DashboardData } from "./dashboard-types";
import {
  AppIcon,
  badgeBase,
  cx,
  DonationThumbnail,
  donorDisplayName,
  emptyCopy,
  formatTime,
  ghostButton,
  type IconName,
  panel,
  primaryButton,
  statusClass,
} from "./dashboard-ui";
import { VolunteerMobileDashboard } from "./volunteer-mobile";

export function VolunteerDashboard({
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
      <VolunteerMobileDashboard
        data={data}
        availableDonations={availableDonations}
        selectedDonation={availableDonation}
        selectedReceiver={receiver}
        activePickup={activePickup}
        pendingProposals={pendingProposals}
        onSelectDonation={setSelectedDonationId}
        onSelectReceiver={setSelectedReceiverId}
        onCreate={() => setShowProposalModal(true)}
      />

      <div className="hidden gap-3 lg:grid">
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
    <section
      className="grid content-start gap-4 border-[#ded7c9] p-5 2xl:border-r"
      id="available-donations"
    >
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
        href="#available-donations"
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
  const [searchQuery, setSearchQuery] = useState("");
  const filteredReceivers = receivers.filter((r) =>
    r.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <section className="grid content-start gap-4 p-5" id="receiver-directory">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[1.35rem] leading-none tracking-[-0.045em] text-[#061e0e]">
          Receiver directory
        </h2>
        <span className="rounded-full bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#14351f]">
          {filteredReceivers.length}
        </span>
      </header>
      <label className="grid min-h-11 grid-cols-[2.5rem_1fr] items-center rounded-lg border border-[#d7d0c2] bg-[#fffdf8] shadow-sm">
        <span className="grid place-items-center text-[#526158]">
          <AppIcon name="search" className="h-5 w-5" />
        </span>
        <input
          className="h-full bg-transparent pr-3 text-sm font-bold outline-none placeholder:text-[#7b837c]"
          placeholder="Search receivers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </label>
      <div className="grid gap-2">
        {filteredReceivers.length > 0
          ? filteredReceivers
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
      id="my-proposals"
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
    <section className={cx(panel, "grid gap-4 p-5")} id="active-pickup">
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
    <section className={cx(panel, "grid gap-3 p-5")} id="today-at-a-glance">
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

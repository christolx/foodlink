"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { Donation, Pickup, Profile } from "@/lib/api";
import {
  AppIcon,
  compactFoodDescription,
  cx,
  DonationThumbnail,
  donorDisplayName,
  emptyCopy,
  formatTime,
  quantityNumber,
  receiverNotificationTitle,
  roleLabels,
} from "../../_components/ui";
import type { DashboardData } from "../../_types/dashboard";

const VolunteerMapDynamic = dynamic(() => import("./VolunteerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm font-bold text-[#46534a]">
      Loading map…
    </div>
  ),
});

export function VolunteerMobileDashboard({
  data,
  availableDonations,
  selectedDonation,
  selectedReceiver,
  activePickup,
  pendingProposals,
  onSelectDonation,
  onSelectReceiver,
  onCreate,
}: {
  data: DashboardData;
  availableDonations: Donation[];
  selectedDonation?: Donation;
  selectedReceiver?: Profile;
  activePickup?: Pickup;
  pendingProposals: number;
  onSelectDonation: (id: string) => void;
  onSelectReceiver: (id: string) => void;
  onCreate: () => void;
}) {
  const unread = data.notifications.filter((item) => !item.read).length;
  const visibleDonations = availableDonations.slice(0, 2);
  const visibleReceivers = data.receivers.slice(0, 2);
  const routeDistance =
    selectedDonation && selectedReceiver
      ? `${(3.4 + quantityNumber(selectedDonation.quantity) / 20).toFixed(1)} km`
      : "3.8 km";
  const city = data.profile.location.city || "Jakarta Selatan";

  return (
    <div
      className="-mx-4 grid gap-5 px-4 pb-28 lg:hidden"
      id="volunteer-mobile-top"
    >
      <header className="flex items-center justify-between gap-3 pt-1">
        <Link
          className="inline-flex items-center gap-2 text-[#063514]"
          href="/"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f1df] text-[#31583c]">
            <AppIcon name="leaf" className="h-6 w-6" />
          </span>
          <span className="text-xl font-black tracking-[-0.035em]">
            FoodLink
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            className="relative grid min-h-11 min-w-11 place-items-center rounded-full text-[#101812]"
            href="#volunteer-mobile-messages"
            aria-label="Notifications"
          >
            <AppIcon name="bell" className="h-7 w-7" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ffbd1a] px-1 text-[0.58rem] font-black text-[#10140d]" />
            ) : null}
          </a>
        </div>
      </header>

      <div className="grid gap-3">
        <div>
          <h1 className="font-serif text-[1.75rem] leading-none tracking-[-0.05em] text-[#063514]">
            Morning, {data.profile.displayName}
          </h1>
          <p className="mt-2 text-sm font-bold text-[#46534a]">
            Routes, matches, and pickup progress for today.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 w-max items-center gap-2 rounded-full bg-[#e9efe1] px-4 text-sm font-black text-[#23452b]"
          href="/demo"
        >
          <AppIcon name="marker" className="h-5 w-5 text-[#2f7a46]" />
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[#0c7438] bg-[#e7f1e5]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0c7438]" />
          </span>
          {roleLabels[data.user.role]} · {city}
          <span className="text-lg leading-none">⌄</span>
        </Link>
      </div>

      <section className="relative isolate overflow-hidden rounded-[1.55rem] bg-[#073515] p-5 text-[#fffdf7] shadow-[0_1.4rem_2.8rem_rgba(6,30,14,0.22)]">
        {selectedDonation?.imageUrl ? (
          // biome-ignore lint/performance/noImgElement: user-provided donation image creates volunteer dashboard context.
          <img
            alt=""
            className="absolute inset-y-0 right-0 z-[-2] h-full w-1/2 object-cover opacity-24"
            src={selectedDonation.imageUrl}
          />
        ) : null}
        <div
          className="absolute inset-0 z-[-1] bg-[linear-gradient(90deg,#073515_0%,rgba(7,53,21,0.92)_45%,rgba(7,53,21,0.62)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute -right-7 top-7 h-24 w-24 rounded-full border border-[#ffdf8b]/25"
          aria-hidden="true"
        />
        <div className="relative grid gap-5">
          <div>
            <p className="text-sm font-black text-[#ffdf8b]">
              {data.profile.location.city || "Jakarta"} route
            </p>
            <h1 className="mt-2 text-[2rem] font-black leading-[1.02] tracking-[-0.04em]">
              Today&apos;s rescues
            </h1>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#ffdf8b]/24 rounded-2xl bg-white/[0.08] ring-1 ring-white/10">
            <VolunteerHeroStat
              value={availableDonations.length}
              label="ready"
            />
            <VolunteerHeroStat value={routeDistance} label="route" />
            <VolunteerHeroStat value={pendingProposals} label="pending" />
          </div>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffbd1a] px-5 text-sm font-black text-[#10140d] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.2)] disabled:opacity-55"
            type="button"
            onClick={onCreate}
            disabled={!selectedDonation || !selectedReceiver}
          >
            Plan pickup <AppIcon name="navigation" className="h-5 w-5" />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-3 rounded-2xl border border-[#d8d1c3] bg-[#fffdf8] p-1 text-sm font-black text-[#566159] shadow-[0_0.7rem_1.6rem_rgba(49,43,24,0.05)]">
        {["Available", "Proposals", "Active"].map((item, index) => (
          <a
            className={cx(
              "grid min-h-10 place-items-center rounded-lg",
              index === 0 && "bg-[#e5f1df] text-[#064c25]",
            )}
            href={
              index === 0
                ? "#volunteer-mobile-donations"
                : index === 1
                  ? "#volunteer-mobile-proposals"
                  : "#volunteer-mobile-active"
            }
            key={item}
          >
            {item}
          </a>
        ))}
      </div>

      <section className="grid gap-3" id="volunteer-mobile-donations">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#061e0e]">
            Available donations
          </h2>
          <span className="rounded-full bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#14351f]">
            {availableDonations.length}
          </span>
        </div>
        <div className="grid gap-3">
          {visibleDonations.length > 0
            ? visibleDonations.map((donation, index) => (
                <VolunteerMobileDonationCard
                  donation={donation}
                  index={index}
                  key={donation.id}
                  selected={donation.id === selectedDonation?.id}
                  onSelect={onSelectDonation}
                />
              ))
            : emptyCopy("No available donations yet.")}
        </div>
      </section>

      <VolunteerMobileRoutePreview
        donation={selectedDonation}
        receiver={selectedReceiver}
      />

      <section className="grid gap-3" id="volunteer-mobile-receivers">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#061e0e]">
            Receiver match
          </h2>
          <span className="rounded-full bg-[#dcebd5] px-3 py-1 text-xs font-black text-[#14351f]">
            {data.receivers.length}
          </span>
        </div>
        <div className="grid gap-3">
          {visibleReceivers.length > 0
            ? visibleReceivers.map((receiver, index) => (
                <VolunteerMobileReceiverCard
                  receiver={receiver}
                  index={index}
                  key={receiver.userId}
                  selected={receiver.userId === selectedReceiver?.userId}
                  onSelect={onSelectReceiver}
                />
              ))
            : emptyCopy("No receiver profiles available.")}
        </div>
      </section>

      <VolunteerMobileProposalCard
        donation={selectedDonation}
        receiver={selectedReceiver}
        distance={routeDistance}
        pendingProposals={pendingProposals}
        onCreate={onCreate}
      />

      <VolunteerMobilePickupCard activePickup={activePickup} />

      <section
        className="rounded-[1.25rem] border border-[#d8d1c3] bg-[#fffdf8] p-4 shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.05)]"
        id="volunteer-mobile-messages"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#061e0e]">
            Messages
          </h2>
          {unread > 0 ? (
            <span className="rounded-full bg-[#ffbd1a] px-2.5 py-1 text-xs font-black text-[#10140d]">
              {unread} new
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3">
          {data.notifications.slice(0, 2).map((notification) => (
            <article
              className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-[#ece5d8] pt-3 first:border-t-0 first:pt-0"
              key={notification.id}
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f1df] text-[#064c25]">
                <AppIcon
                  name={
                    notification.type === "pickup_assigned"
                      ? "pickup"
                      : notification.type === "pickup_completed"
                        ? "check"
                        : "message"
                  }
                  className="h-5 w-5"
                />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-black text-[#101812]">
                  {receiverNotificationTitle(notification)}
                </strong>
                <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#46534a]">
                  {notification.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <button
        className="inline-flex min-h-13 items-center justify-center gap-2 rounded-[1.1rem] bg-[#ffbd1a] px-5 text-sm font-black text-[#10140d] shadow-[0_0.9rem_1.8rem_rgba(167,111,2,0.18)] disabled:opacity-55"
        type="button"
        onClick={onCreate}
        disabled={!selectedDonation || !selectedReceiver}
      >
        Create proposal <AppIcon name="arrow" className="h-5 w-5" />
      </button>
    </div>
  );
}

function VolunteerHeroStat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <span className="grid justify-items-center gap-1 px-2 py-3 text-center">
      <strong className="text-2xl font-black leading-none">{value}</strong>
      <span className="text-xs font-black text-[#dcebd5]">{label}</span>
    </span>
  );
}

function VolunteerMobileDonationCard({
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
  return (
    <button
      className={cx(
        "grid grid-cols-[5.5rem_1fr] gap-3 rounded-[1.25rem] border bg-[#fffdf8] p-3 text-left shadow-[0_0.8rem_1.6rem_rgba(49,43,24,0.055)] transition",
        selected
          ? "border-[#2f7a46] bg-[#f9fcf5] ring-1 ring-[#2f7a46]/15"
          : "border-[#e2dacb]",
      )}
      type="button"
      onClick={() => onSelect(donation.id)}
    >
      <DonationThumbnail donation={donation} size="lg" />
      <span className="grid min-w-0 gap-2">
        <span className="flex items-start justify-between gap-2">
          <strong className="min-w-0 truncate text-base font-black tracking-[-0.02em] text-[#101812]">
            {donation.title}
          </strong>
          <span className="shrink-0 text-xs font-black text-[#46534a]">
            {(1.2 + index * 0.7).toFixed(1)} km
          </span>
        </span>
        <span className="line-clamp-2 text-xs font-bold leading-5 text-[#46534a]">
          {compactFoodDescription(donation)}
        </span>
        <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#46534a]">
          <span className="inline-flex items-center gap-1">
            <AppIcon name="package" className="h-3.5 w-3.5" />
            {donation.quantity}
          </span>
          <span className="inline-flex items-center gap-1">
            <AppIcon name="clock" className="h-3.5 w-3.5" />
            {formatTime(donation.availableUntil)}
          </span>
          <span className="rounded-full bg-[#dcebd5] px-2 py-0.5 text-[#14351f]">
            available
          </span>
        </span>
      </span>
    </button>
  );
}

function VolunteerMobileRoutePreview({
  donation,
  receiver,
}: {
  donation?: Donation;
  receiver?: Profile;
}) {
  return (
    <section
      className="grid min-h-[30rem] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[1.25rem] border border-[#d8d1c3] bg-[#fffdf8] shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.05)]"
      id="volunteer-mobile-route"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-lg font-black tracking-[-0.02em] text-[#061e0e]">
          Live map
        </h2>
      </div>
      <div className="relative mx-4 min-h-[21rem] overflow-hidden rounded-lg border border-[#e4ddcf]">
        <VolunteerMapDynamic
          donorLocation={donation?.pickupLocation}
          receiverLocation={receiver?.location}
          donorLabel={
            donation ? (donorDisplayName(donation) ?? "Donor") : undefined
          }
          receiverLabel={receiver?.displayName}
        />
        {donation ? (
          <article className="absolute inset-x-3 bottom-3 z-[1000] grid grid-cols-[2.75rem_1fr] gap-3 rounded-xl border border-[#d8d1c3] bg-[#fffdf8]/96 p-2 shadow-[0_0.7rem_1.4rem_rgba(49,43,24,0.12)] backdrop-blur">
            <DonationThumbnail donation={donation} size="sm" />
            <span className="min-w-0">
              <strong className="block truncate text-sm font-black text-[#101812]">
                {donation.title}
              </strong>
              <span className="block truncate text-xs font-bold text-[#46534a]">
                to {receiver?.displayName ?? "receiver"}
              </span>
            </span>
          </article>
        ) : null}
      </div>
      <footer className="mx-4 mb-4 mt-3 grid min-h-14 grid-cols-3 items-center rounded-lg border border-[#e4ddcf] bg-[#fffdf8] px-4 text-xs font-bold">
        {[
          ["#2f7a46", "Donor"],
          ["#ffb91f", "Receiver"],
          ["#287bd5", "You"],
        ].map(([color, label]) => (
          <span className="inline-flex items-center gap-2" key={label}>
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

function VolunteerMobileReceiverCard({
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
  return (
    <button
      className={cx(
        "grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-[1.25rem] border bg-[#fffdf8] p-4 text-left shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.05)] transition",
        selected
          ? "border-[#2f7a46] bg-[#f9fcf5] ring-1 ring-[#2f7a46]/15"
          : "border-[#e2dacb]",
      )}
      type="button"
      onClick={() => onSelect(receiver.userId)}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e5f1df] text-[#2f7a46]">
        <AppIcon name={index === 0 ? "team" : "leaf"} className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm font-black text-[#101812]">
          {receiver.displayName}
        </strong>
        <span className="mt-1 block text-xs font-bold capitalize text-[#46534a]">
          {(1.5 + index * 0.6).toFixed(1)} km ·{" "}
          {receiver.entityType ?? "Receiver"}
        </span>
        <span className="mt-2 block rounded-xl bg-[#e7f0df] p-3 text-xs font-bold leading-5 text-[#1f2a23]">
          Needs: {receiver.notes ?? "Fresh meals and vegetables."}
        </span>
      </span>
      {selected ? (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#14733a] text-white">
          <AppIcon name="check" className="h-4 w-4" />
        </span>
      ) : null}
    </button>
  );
}

function VolunteerMobileProposalCard({
  donation,
  receiver,
  distance,
  pendingProposals,
  onCreate,
}: {
  donation?: Donation;
  receiver?: Profile;
  distance: string;
  pendingProposals: number;
  onCreate: () => void;
}) {
  const ready = !!donation && !!receiver;

  return (
    <section
      className="rounded-[1.25rem] border border-[#d8d1c3] bg-[#fffdf8] p-4 shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.05)]"
      id="volunteer-mobile-proposals"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-[-0.02em] text-[#061e0e]">
          Proposal
        </h2>
        <span className="rounded-full bg-[#e9efe1] px-3 py-1 text-xs font-black text-[#23452b]">
          {pendingProposals} pending
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <article className="grid grid-cols-[3.5rem_1fr] gap-3 rounded-xl border border-[#e4ddcf] bg-[#fbfaf3] p-3">
          <DonationThumbnail donation={donation} size="sm" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#46534a]">
              Selected donation
            </span>
            <strong className="mt-1 block truncate text-sm font-black text-[#101812]">
              {donation?.title ?? "Choose available donation"}
            </strong>
            <span className="mt-1 block truncate text-xs font-bold text-[#46534a]">
              {donation
                ? `${donation.quantity} · ${formatTime(donation.availableUntil)}`
                : "Pick from Available"}
            </span>
          </div>
        </article>
        <article className="grid grid-cols-[3.5rem_1fr] gap-3 rounded-xl border border-[#e4ddcf] bg-[#fbfaf3] p-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e5f1df] text-[#2f7a46]">
            <AppIcon name="team" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#46534a]">
              Selected receiver
            </span>
            <strong className="mt-1 block truncate text-sm font-black text-[#101812]">
              {receiver?.displayName ?? "Choose receiver match"}
            </strong>
            <span className="mt-1 block truncate text-xs font-bold text-[#46534a]">
              {receiver
                ? `${receiver.entityType ?? "Receiver"} · ${distance}`
                : "Pick from Receiver match"}
            </span>
          </div>
        </article>
      </div>
      <button
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ffbd1a] px-5 text-sm font-black text-[#10140d] shadow-[0_0.75rem_1.6rem_rgba(167,111,2,0.16)] disabled:opacity-55"
        type="button"
        onClick={onCreate}
        disabled={!ready}
      >
        Create proposal <AppIcon name="arrow" className="h-5 w-5" />
      </button>
    </section>
  );
}

function VolunteerMobilePickupCard({
  activePickup,
}: {
  activePickup?: Pickup;
}) {
  return (
    <section
      className="rounded-[1.25rem] border border-[#d8d1c3] bg-[#fffdf8] p-4 shadow-[0_0.8rem_1.8rem_rgba(49,43,24,0.05)]"
      id="volunteer-mobile-active"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-[-0.02em] text-[#061e0e]">
          Active pickup
        </h2>
        <span className="rounded-full bg-[#f7dfaa] px-3 py-1 text-xs font-black text-[#332309]">
          {activePickup ? activePickup.status.replace(/_/g, " ") : "waiting"}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {["Assigned", "Picked up", "Delivered"].map((step, index) => {
          const done =
            !!activePickup &&
            (index === 0 ||
              (index === 1 &&
                ["picked_up", "delivered"].includes(activePickup.status)) ||
              (index === 2 && activePickup.status === "delivered"));
          return (
            <div className="grid grid-cols-[2rem_1fr] gap-3" key={step}>
              <span
                className={cx(
                  "grid h-8 w-8 place-items-center rounded-full text-xs font-black",
                  done
                    ? "bg-[#14733a] text-white"
                    : "bg-[#eeece3] text-[#46534a]",
                )}
              >
                {index + 1}
              </span>
              <span className="grid text-sm font-black text-[#101812]">
                {step}
                <span className="text-xs font-bold text-[#46534a]">
                  {done ? "Complete" : "Not started"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

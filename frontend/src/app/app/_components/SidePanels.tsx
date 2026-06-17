"use client";

import { useState } from "react";
import type { Donation, Profile } from "@/lib/api";
import type { DashboardData } from "../_types/dashboard";
import {
  AppIcon,
  badgeBase,
  cx,
  DonationThumbnail,
  formatTime,
  haversineKm,
  statusClass,
} from "./ui";

export function ProfilePanelContent({
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

function loadPref(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(`foodlink_${key}`);
    return v !== null ? v === "true" : def;
  } catch {
    return def;
  }
}

function savePref(key: string, value: boolean) {
  try {
    localStorage.setItem(`foodlink_${key}`, String(value));
  } catch {}
}

export function SettingsPanelContent() {
  const [notifPickup, setNotifPickup] = useState(() =>
    loadPref("notifPickup", true),
  );
  const [notifProposal, setNotifProposal] = useState(() =>
    loadPref("notifProposal", true),
  );
  const [notifDelivery, setNotifDelivery] = useState(() =>
    loadPref("notifDelivery", false),
  );
  const [compactMode, setCompactMode] = useState(() =>
    loadPref("compactMode", false),
  );

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
            onChange={() =>
              setNotifPickup((v) => {
                const next = !v;
                savePref("notifPickup", next);
                return next;
              })
            }
            label="Pickup assigned"
            description="When a new pickup is assigned to you"
          />
          <Toggle
            checked={notifProposal}
            onChange={() =>
              setNotifProposal((v) => {
                const next = !v;
                savePref("notifProposal", next);
                return next;
              })
            }
            label="Proposal accepted"
            description="When your proposal is accepted"
          />
          <Toggle
            checked={notifDelivery}
            onChange={() =>
              setNotifDelivery((v) => {
                const next = !v;
                savePref("notifDelivery", next);
                return next;
              })
            }
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
            onChange={() =>
              setCompactMode((v) => {
                const next = !v;
                savePref("compactMode", next);
                return next;
              })
            }
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
          Preferences are saved in your browser.
        </div>
      </div>
    </div>
  );
}

export function ReportsPanelContent({ data }: { data: DashboardData }) {
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

export function HelpPanelContent() {
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

export function AllDonationsPanelContent({
  donations,
  volunteerLocation,
}: {
  donations: Donation[];
  volunteerLocation: { latitude?: number; longitude?: number };
}) {
  const relevant = donations.filter(
    (d) => d.status === "available" || d.status === "proposal_pending",
  );

  if (relevant.length === 0) {
    return (
      <p className="text-sm font-bold text-[#46534a]">
        No available donations right now.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {relevant.map((donation) => (
        <article
          key={donation.id}
          className="grid grid-cols-[3.5rem_1fr] gap-3 rounded-lg border border-[#ded7c9] bg-[#fafaf7] p-3"
        >
          <DonationThumbnail donation={donation} size="sm" />
          <div className="min-w-0">
            <strong className="block truncate text-sm font-black text-[#101812]">
              {donation.title}
            </strong>
            <span className="mt-1 block text-xs font-bold text-[#46534a]">
              {donation.quantity} · until {formatTime(donation.availableUntil)}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
                  : "Available"}
              </span>
              <span className="text-xs font-bold text-[#46534a]">
                {haversineKm(volunteerLocation, donation.pickupLocation)}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AllReceiversPanelContent({
  receivers,
  volunteerLocation,
}: {
  receivers: Profile[];
  volunteerLocation: { latitude?: number; longitude?: number };
}) {
  if (receivers.length === 0) {
    return (
      <p className="text-sm font-bold text-[#46534a]">
        No receiver profiles available.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {receivers.map((receiver) => (
        <article
          key={receiver.userId}
          className="grid grid-cols-[3rem_1fr] gap-3 rounded-lg border border-[#ded7c9] bg-[#fafaf7] p-3"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e5f1df] text-[#2f7a46]">
            <AppIcon name="team" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-sm font-black text-[#101812]">
              {receiver.displayName}
            </strong>
            <span className="mt-1 block text-xs font-bold capitalize text-[#46534a]">
              {receiver.entityType ?? "Receiver"} ·{" "}
              {receiver.location.city || "—"} ·{" "}
              {haversineKm(volunteerLocation, receiver.location)}
            </span>
            {receiver.notes ? (
              <p className="mt-2 rounded-md bg-[#e7f0df] px-2 py-1.5 text-xs font-bold leading-5 text-[#1f2a23]">
                {receiver.notes}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

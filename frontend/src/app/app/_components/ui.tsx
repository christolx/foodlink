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
import { useState } from "react";
import type { DeliveryProposal, Donation, Notification } from "@/lib/api";

export const demoLocation = {
  addressLine1: "Jl. Sudirman 1",
  city: "Jakarta",
  region: "DKI Jakarta",
  postalCode: "10220",
  country: "ID",
};

export const roleLabels = {
  donor: "Donor",
  volunteer: "Volunteer",
  receiver: "Receiver",
};

export const leafMark =
  "inline-block h-6 w-6 rotate-[-28deg] rounded-[100%_0_100%_0] border-[3px] border-current text-[#ffb91f]";
export const panel =
  "rounded-[0.85rem] border border-[#ded7c9] bg-[#fffdf7]/82 shadow-[0_1rem_2.5rem_rgba(50,43,28,0.08)]";
export const heading =
  "font-serif text-[1.55rem] font-normal leading-none tracking-[-0.035em] text-[#061e0e]";
export const input =
  "min-h-10 w-full rounded-[0.65rem] border border-[#cfc8ba] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#111a14] outline-none transition placeholder:text-[#7a817b] focus:border-[#116b35] focus:ring-2 focus:ring-[#116b35]/15";
export const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-[0.65rem] bg-[#ffbd1a] px-5 font-black text-[#10140d] shadow-[0_0.75rem_1.5rem_rgba(167,111,2,0.16)] transition hover:-translate-y-0.5 hover:bg-[#f4b30e] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
export const ghostButton =
  "inline-flex min-h-10 items-center justify-center rounded-[0.65rem] border border-[#9eb69f] bg-[#fffdf8] px-4 text-sm font-black text-[#064c25] transition hover:-translate-y-0.5 hover:bg-[#f6fbf3] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";
export const badgeBase =
  "inline-flex min-h-6 items-center rounded-[0.45rem] px-2.5 text-xs font-black";

export const defaultDonationImage = "/landing/cards/donate-card.webp";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function statusClass(
  status: Donation["status"] | DeliveryProposal["status"],
) {
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

export function emptyCopy(value: string) {
  return <p className="font-bold text-[#34443a]">{value}</p>;
}

export type IconName =
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

export function AppIcon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const Icon = icons[name];

  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}

export function DonationThumbnail({
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

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function quantityNumber(value: string) {
  const match = value.match(/\d+/);

  return match ? Number(match[0]) : 0;
}

export function readableDonationId(value: string) {
  return value
    .replace(/^demo_donation_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function donorDisplayName(donation?: Donation): string {
  return donation?.title ?? "Donor";
}

export function haversineKm(
  a: { latitude?: number; longitude?: number },
  b: { latitude?: number; longitude?: number },
): string {
  if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) return "—";
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinA = Math.sin(dLat / 2);
  const sinB = Math.sin(dLon / 2);
  const h =
    sinA * sinA +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinB *
      sinB;
  const km = R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return `${km.toFixed(1)} km`;
}

export function compactFoodDescription(donation?: Donation) {
  if (!donation?.description) {
    return "Fresh meals ready for delivery";
  }

  const description = donation.description.replace(/\.$/, "");

  return description.length > 52
    ? `${description.slice(0, 49).trim()}...`
    : description;
}

export function receiverNotificationTitle(notification: Notification) {
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

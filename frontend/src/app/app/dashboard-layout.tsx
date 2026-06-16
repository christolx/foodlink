"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HelpPanelContent,
  ProfilePanelContent,
  ReportsPanelContent,
  SettingsPanelContent,
} from "./dashboard-panels";
import type { DashboardData, SidePanelType } from "./dashboard-types";
import { AppIcon, cx, type IconName, roleLabels } from "./dashboard-ui";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <>
      <button
        aria-label="Close modal"
        className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="fixed left-1/2 top-1/2 z-[1101] max-h-[88vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-[#fffdf8] shadow-2xl">
        <header className="sticky top-0 flex items-center gap-3 border-b border-[#e4ddcf] bg-[#fffdf8] px-6 py-5">
          <h2 className="flex-1 font-serif text-lg font-black tracking-tight text-[#061e0e]">
            {title}
          </h2>
          <button
            className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f0ece4]"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </>,
    document.body,
  );
}

export function SlidePanel({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: IconName;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <>
      <button
        aria-label="Close panel"
        className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div className="fixed right-0 top-0 z-[1101] flex h-full w-full max-w-sm flex-col bg-[#fffdf8] shadow-2xl">
        <header className="flex items-center gap-3 border-b border-[#e4ddcf] px-6 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f1df] text-[#14733a]">
            <AppIcon name={icon} className="h-5 w-5" />
          </span>
          <h2 className="flex-1 font-serif text-lg font-black tracking-tight text-[#061e0e]">
            {title}
          </h2>
          <button
            className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f0ece4]"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>,
    document.body,
  );
}

export function DashboardSidebar({
  data,
  signOut,
  activePanel,
  setActivePanel,
}: {
  data: DashboardData;
  signOut: () => void;
  activePanel: SidePanelType | null;
  setActivePanel: (panel: SidePanelType | null) => void;
}) {
  const role = data.user.role;
  const initials = data.profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [activeHref, setActiveHref] = useState<string>("#dashboard-title");

  const navItems = useMemo(() => {
    if (role === "receiver") {
      const pendingCount = data.proposals.filter(
        (p) => p.status === "pending",
      ).length;
      return [
        {
          label: "Dashboard",
          icon: "dashboard" as IconName,
          href: "#dashboard-title",
        },
        {
          label: "Proposals",
          icon: "box" as IconName,
          href: "#proposal-queue",
          badge: pendingCount,
        },
        { label: "Deliveries", icon: "pickup" as IconName, href: "#work" },
        { label: "Needs", icon: "bag" as IconName, href: "#my-food-requests" },
        {
          label: "Messages",
          icon: "message" as IconName,
          href: "#notifications",
          badge: 2,
        },
      ];
    }
    if (role === "volunteer") {
      const availableCount = data.donations.filter(
        (d) => d.status === "available",
      ).length;
      return [
        {
          label: "Dashboard",
          icon: "dashboard" as IconName,
          href: "#dashboard-title",
        },
        {
          label: "Available donations",
          icon: "bag" as IconName,
          href: "#available-donations",
          badge: availableCount,
        },
        {
          label: "Receivers",
          icon: "team" as IconName,
          href: "#receiver-directory",
        },
        {
          label: "My proposals",
          icon: "box" as IconName,
          href: "#my-proposals",
        },
        {
          label: "Pickups",
          icon: "pickup" as IconName,
          href: "#active-pickup",
        },
        {
          label: "History",
          icon: "clock" as IconName,
          href: "#today-at-a-glance",
        },
        {
          label: "Messages",
          icon: "message" as IconName,
          href: "#notifications",
        },
        {
          label: "Reports",
          icon: "chart" as IconName,
          panel: "reports" as SidePanelType,
        },
        {
          label: "Profile",
          icon: "profile" as IconName,
          panel: "profile" as SidePanelType,
        },
        {
          label: "Settings",
          icon: "settings" as IconName,
          panel: "settings" as SidePanelType,
        },
        {
          label: "Help & support",
          icon: "message" as IconName,
          panel: "help" as SidePanelType,
        },
      ];
    }
    // Donor
    return [
      {
        label: "Dashboard",
        icon: "dashboard" as IconName,
        href: "#dashboard-title",
      },
      { label: "My donations", icon: "bag" as IconName, href: "#my-donations" },
      { label: "Proposals", icon: "box" as IconName, href: "#proposal-queue" },
      { label: "Pickups", icon: "pickup" as IconName, href: "#work" },
      {
        label: "Notifications",
        icon: "bell" as IconName,
        href: "#notifications",
      },
    ];
  }, [role, data]);

  const topHeader = useMemo(() => {
    if (role === "receiver") {
      return (
        <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#116b35] text-xl font-black text-[#ffbd1a] border-2 border-[#ffbd1a]/30 shadow-md">
            <AppIcon name="leaf" className="h-8 w-8 text-[#ffbd1a]" />
          </span>
          <div className="mt-2 grid justify-items-center">
            <strong className="flex items-center gap-1.5 text-base font-black">
              {data.profile.displayName}
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ffbd1a] text-[0.6rem] font-bold text-[#052b12]">
                ✓
              </span>
            </strong>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="profile" className="h-3.5 w-3.5" />
              Receiver
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="marker" className="h-3.5 w-3.5" />
              {data.profile.location.city || "Jakarta Selatan"}
            </span>
          </div>
        </div>
      );
    }
    if (role === "volunteer") {
      return (
        <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ffbd1a] text-xl font-black text-[#052b12] border-2 border-white/20 shadow-md">
            {initials}
          </span>
          <div className="mt-2 grid justify-items-center">
            <strong className="text-base font-black">
              {data.profile.displayName}
            </strong>
            <span className="mt-1 text-xs font-bold text-[#dfe8dc]/80">
              Volunteer
            </span>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#ffbd1a]/45 bg-[#ffbd1a]/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-[#ffbd1a]">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </div>
          </div>
        </div>
      );
    }
    if (role === "donor") {
      return (
        <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ffbd1a] text-xl font-black text-[#052b12] border-2 border-white/20 shadow-md">
            {initials}
          </span>
          <div className="mt-2 grid justify-items-center">
            <strong className="flex items-center gap-1.5 text-base font-black">
              {data.profile.displayName}
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ffbd1a] text-[0.6rem] font-bold text-[#052b12]">
                ✓
              </span>
            </strong>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="profile" className="h-3.5 w-3.5" />
              Donor
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#dfe8dc]/80">
              <AppIcon name="marker" className="h-3.5 w-3.5" />
              {data.profile.location.city || "Jakarta"}
            </span>
          </div>
        </div>
      );
    }
    return (
      <Link className="mx-auto text-[#ffbf1c]" href="/" aria-label="FoodLink">
        <AppIcon name="leaf" className="h-14 w-14" />
      </Link>
    );
  }, [role, data, initials]);

  const bottomCard = useMemo(() => {
    if (role === "receiver") {
      return (
        <div className="rounded-lg border border-white/10 bg-[#0b4c25]/45 p-5">
          <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ffbd1a]/15 text-[#ffbd1a]">
            <AppIcon name="leaf" className="h-5 w-5" />
          </span>
          <strong className="block text-sm font-black leading-5 text-[#ffbd1a]">
            Together we turn surplus into hope
          </strong>
          <p className="mt-3 text-xs font-bold leading-5 text-[#dfe8dc]">
            Thank you for serving your community.
          </p>
        </div>
      );
    }
    if (role === "volunteer") {
      return (
        <div className="rounded-lg border border-white/10 bg-[#0b4c25]/45 p-5">
          <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ffbd1a]/15 text-[#ffbd1a]">
            <AppIcon name="navigation" className="h-5 w-5" />
          </span>
          <strong className="block text-sm font-black leading-5 text-[#ffbd1a]">
            Every pickup makes a difference
          </strong>
          <p className="mt-3 text-xs font-bold leading-5 text-[#dfe8dc]">
            Thank you for showing up today.
          </p>
        </div>
      );
    }
    // Donor
    return (
      <div className="rounded-lg border border-white/10 bg-[#0b4c25]/45 p-5">
        <AppIcon name="leaf" className="mb-6 h-9 w-9 text-[#1ea35a]" />
        <strong className="block text-sm font-black leading-5">
          Every meal makes a difference
        </strong>
        <p className="mt-4 text-xs font-bold leading-5 text-[#dfe8dc]">
          Thank you for feeding our community.
        </p>
      </div>
    );
  }, [role]);

  const mobileSidebarClass = "max-lg:hidden";

  return (
    <aside
      className={cx(
        "sticky top-0 grid h-screen grid-rows-[auto_1fr_auto_auto] gap-6 bg-[radial-gradient(circle_at_70%_92%,rgba(30,112,48,0.32),transparent_12rem),linear-gradient(180deg,#063514_0%,#052b12_52%,#031b0c_100%)] px-4 py-6 text-[#f8f5ea]",
        mobileSidebarClass,
      )}
      aria-label="Dashboard navigation"
    >
      {topHeader}
      <nav className="flex flex-col gap-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            "panel" in item && item.panel
              ? activePanel === item.panel
              : "href" in item && item.href === activeHref;
          const sharedClass = cx(
            "flex min-h-10 items-center gap-3.5 rounded-lg px-4 text-sm font-black transition shrink-0",
            isActive
              ? "bg-[#116b35] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              : "hover:bg-white/10",
          );
          const badge =
            item.badge !== undefined && item.badge > 0 ? (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-[0.65rem] font-black text-[#052b12]">
                {item.badge}
              </span>
            ) : null;

          if ("panel" in item && item.panel) {
            return (
              <button
                key={item.label}
                type="button"
                className={sharedClass}
                onClick={() =>
                  setActivePanel(
                    activePanel === item.panel
                      ? null
                      : (item.panel as SidePanelType),
                  )
                }
              >
                <AppIcon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
                {badge}
              </button>
            );
          }

          return (
            <a
              key={item.label}
              className={sharedClass}
              href={item.href}
              onClick={() => {
                setActiveHref(item.href ?? "");
                setActivePanel(null);
              }}
            >
              <AppIcon name={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
              {badge}
            </a>
          );
        })}
      </nav>

      {activePanel && (
        <SlidePanel
          title={
            activePanel === "profile"
              ? "My profile"
              : activePanel === "settings"
                ? "Settings"
                : activePanel === "reports"
                  ? "Reports"
                  : "Help & support"
          }
          icon={
            activePanel === "profile"
              ? "profile"
              : activePanel === "settings"
                ? "settings"
                : activePanel === "reports"
                  ? "chart"
                  : "message"
          }
          onClose={() => setActivePanel(null)}
        >
          {activePanel === "profile" && (
            <ProfilePanelContent data={data} initials={initials} />
          )}
          {activePanel === "settings" && <SettingsPanelContent />}
          {activePanel === "reports" && <ReportsPanelContent data={data} />}
          {activePanel === "help" && <HelpPanelContent />}
        </SlidePanel>
      )}
      {bottomCard}
      <button
        className="flex min-h-10 items-center gap-3.5 rounded-lg px-4 text-sm font-black transition hover:bg-white/10 shrink-0"
        type="button"
        onClick={signOut}
      >
        <AppIcon name="pickup" className="h-5 w-5 rotate-180" />
        Log out
      </button>
    </aside>
  );
}

export function DonorBottomNavigation() {
  const items = [
    { label: "Home", icon: "dashboard" as IconName, href: "#dashboard-title" },
    { label: "Donations", icon: "bag" as IconName, href: "#my-donations" },
    { label: "Proposals", icon: "box" as IconName, href: "#proposal-queue" },
    { label: "Inbox", icon: "bell" as IconName, href: "#notifications" },
  ];

  return (
    <nav
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 grid grid-cols-4 rounded-[1.35rem] border border-[#ded7c9] bg-[#fffdf8]/96 p-2 shadow-[0_-0.75rem_2rem_rgba(49,43,24,0.12)] backdrop-blur lg:hidden"
      aria-label="Donor navigation"
    >
      {items.map((item) => (
        <a
          className="grid min-h-14 place-items-center gap-1 rounded-lg px-1 text-center text-[0.68rem] font-black text-[#46534a] transition hover:bg-[#f0f7eb] hover:text-[#064c25]"
          href={item.href}
          key={item.label}
        >
          <AppIcon name={item.icon} className="text-2xl" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function ReceiverBottomNavigation() {
  const items = [
    { label: "Home", icon: "dashboard" as IconName, href: "#dashboard-title" },
    { label: "Proposals", icon: "box" as IconName, href: "#receiver-priority" },
    { label: "Deliveries", icon: "pickup" as IconName, href: "#deliveries" },
    { label: "Inbox", icon: "bell" as IconName, href: "#notifications" },
  ];

  return (
    <nav
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 grid grid-cols-4 rounded-[1.35rem] border border-[#ded7c9] bg-[#fffdf8]/96 p-2 shadow-[0_-0.75rem_2rem_rgba(49,43,24,0.12)] backdrop-blur lg:hidden"
      aria-label="Receiver navigation"
    >
      {items.map((item) => (
        <a
          className="grid min-h-14 place-items-center gap-1 rounded-lg px-1 text-center text-[0.68rem] font-black text-[#46534a] transition hover:bg-[#f0f7eb] hover:text-[#064c25]"
          href={item.href}
          key={item.label}
        >
          <AppIcon name={item.icon} className="text-2xl" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function VolunteerBottomNavigation() {
  const items = [
    {
      label: "Home",
      icon: "dashboard" as IconName,
      href: "#volunteer-mobile-top",
    },
    {
      label: "Donations",
      icon: "bag" as IconName,
      href: "#volunteer-mobile-donations",
    },
    {
      label: "Route",
      icon: "navigation" as IconName,
      href: "#volunteer-mobile-route",
    },
    {
      label: "Messages",
      icon: "bell" as IconName,
      href: "#volunteer-mobile-messages",
    },
  ];

  return (
    <nav
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 grid grid-cols-4 rounded-[1.35rem] border border-[#ded7c9] bg-[#fffdf8]/96 p-2 shadow-[0_-0.75rem_2rem_rgba(49,43,24,0.12)] backdrop-blur lg:hidden"
      aria-label="Volunteer navigation"
    >
      {items.map((item) => (
        <a
          className="grid min-h-14 place-items-center gap-1 rounded-lg px-1 text-center text-[0.68rem] font-black text-[#46534a] transition hover:bg-[#f0f7eb] hover:text-[#064c25]"
          href={item.href}
          key={item.label}
        >
          <AppIcon name={item.icon} className="text-2xl" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function DashboardTopbar({ data }: { data: DashboardData }) {
  const [searchValue, setSearchValue] = useState("");
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
        className="mb-4 hidden gap-4 border-b border-[#ded7c9] pb-4 lg:grid xl:grid-cols-[max-content_1fr_auto] xl:items-center"
        id="volunteer-desktop-title"
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
            href="/demo"
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
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
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
        className="mb-4 grid gap-4 bg-transparent pt-1 lg:-mx-8 lg:border-b lg:border-[#ded7c9] lg:bg-[#fffdf8]/70 lg:px-8 lg:py-5 xl:grid-cols-[1fr_auto] xl:items-center"
        id="dashboard-title"
      >
        <div className="grid gap-3">
          <div className="flex items-center justify-between lg:hidden">
            <Link
              className="inline-flex items-center gap-3 text-[#063514]"
              href="/"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f1df] text-[#31583c]">
                <AppIcon name="leaf" className="h-6 w-6" />
              </span>
              <span className="text-xl font-black tracking-[-0.035em]">
                FoodLink
              </span>
            </Link>
            <a
              className="relative grid min-h-11 min-w-11 place-items-center rounded-full text-[#101812]"
              href="#notifications"
              aria-label="Notifications"
            >
              <AppIcon name="bell" className="h-7 w-7" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ffbd1a] px-1 text-[0.58rem] font-black text-[#10140d]" />
              ) : null}
            </a>
          </div>
          <div>
            <h1 className="font-serif text-[1.75rem] leading-none tracking-[-0.05em] text-[#063514] lg:flex lg:items-center lg:gap-2 lg:text-[1.45rem] lg:font-black lg:font-sans lg:tracking-[-0.02em] lg:text-[#101812]">
              Morning, {data.profile.displayName}
              <AppIcon
                name="leaf"
                className="hidden h-7 w-7 text-[#31583c] lg:block"
              />
            </h1>
            <p className="mt-2 text-sm font-bold text-[#46534a] lg:mt-1">
              Food arrivals, decisions, and needs for today.
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 w-max items-center gap-2 rounded-full bg-[#e9efe1] px-4 text-sm font-black text-[#23452b] lg:hidden"
            href="/demo"
          >
            <AppIcon name="marker" className="h-5 w-5 text-[#2f7a46]" />
            Receiver · {data.profile.location.city || "Jakarta Selatan"}
          </Link>
        </div>
        <div className="hidden flex-wrap items-center gap-3 xl:flex xl:justify-end">
          <TopbarSelect
            icon="profile"
            label="Role"
            value={`${roleLabels[data.user.role]} · ${data.profile.location.city || "Jakarta Selatan"}`}
            href="/demo"
          />
          <a
            className="relative grid min-h-11 min-w-11 place-items-center rounded-full border border-[#d2cbbd] bg-[#fffdf8] text-[#101812] shadow-sm lg:border-l lg:border-y-0 lg:border-r-0 lg:bg-transparent lg:pl-5 lg:shadow-none"
            href="#notifications"
            aria-label="Notifications"
          >
            <AppIcon name="bell" className="h-6 w-6 lg:h-8 lg:w-8" />
            {unread > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-xs font-black text-[#10140d]">
                {unread}
              </span>
            ) : null}
          </a>
          <span
            className="hidden h-10 w-px bg-[#ded7c9] lg:block"
            aria-hidden="true"
          />
          <div className="hidden items-center gap-3 lg:flex">
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
      className="mb-4 grid gap-4 bg-transparent pt-1 md:mx-0 md:rounded-xl md:border md:border-[#ded7c9] md:bg-[#fffdf8]/70 md:px-5 md:py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
      id="dashboard-title"
    >
      <div className="grid min-w-0 gap-3">
        <div className="flex items-center justify-between md:block">
          <Link
            className="inline-flex items-center gap-3 text-[#063514] md:block"
            href="/"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f1df] text-[#31583c] md:hidden">
              <AppIcon name="leaf" className="h-6 w-6" />
            </span>
            <span className="text-xl font-black tracking-[-0.035em] md:font-serif md:text-[2.35rem] md:font-normal md:leading-none md:tracking-[-0.055em]">
              FoodLink
            </span>
          </Link>
          <a
            className="relative grid min-h-11 min-w-11 place-items-center rounded-full text-[#101812] md:hidden"
            href="#notifications"
            aria-label="Notifications"
          >
            <AppIcon name="bell" className="h-7 w-7" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ffbd1a] px-1 text-[0.58rem] font-black text-[#10140d]" />
            ) : null}
          </a>
        </div>
        <div className="md:hidden">
          <h1 className="font-serif text-[1.75rem] leading-none tracking-[-0.05em] text-[#063514]">
            Morning, {data.profile.displayName}
          </h1>
          <p className="mt-2 text-sm font-bold text-[#46534a]">
            Surplus posts, proposals, and pickups for today.
          </p>
        </div>
        <p className="hidden truncate text-sm font-black text-[#101812]">
          Good morning, {data.profile.displayName}
        </p>
      </div>
      <Link
        className="inline-flex min-h-10 w-max items-center gap-2 rounded-full bg-[#e9efe1] px-4 text-sm font-black text-[#23452b] md:grid md:min-w-0 md:gap-1 md:justify-self-start md:rounded-md md:border md:border-[#d2cbbd] md:bg-[#fffdf8] md:px-3 md:py-1.5 md:text-xs md:shadow-sm"
        href="/demo"
      >
        <span className="hidden text-[#111a14] md:block">Role</span>
        <span className="flex items-center gap-2 text-sm font-black">
          <AppIcon name="marker" className="h-5 w-5 text-[#2f7a46] md:hidden" />
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[#0c7438] bg-[#e7f1e5]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0c7438]" />
          </span>
          <span className="md:hidden">
            {roleLabels[data.user.role]} ·{" "}
            {data.profile.location.city || "Jakarta Selatan"}
          </span>
          <span className="hidden md:inline">{roleLabels[data.user.role]}</span>
          <span className="ml-auto text-lg leading-none">⌄</span>
        </span>
      </Link>
      <div className="absolute right-4 top-4 flex items-center gap-3 justify-self-start md:static md:gap-6 md:justify-self-end">
        <a
          className="relative grid min-h-11 min-w-11 place-items-center rounded-full border border-[#d2cbbd] bg-[#fffdf8] text-[#101812] md:min-h-0 md:min-w-0 md:border-0 md:bg-transparent"
          href="#notifications"
          aria-label="Notifications"
        >
          <AppIcon name="bell" className="h-6 w-6 md:h-8 md:w-8" />
          {unread > 0 ? (
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffbd1a] px-1 text-xs font-black text-[#10140d]">
              {unread}
            </span>
          ) : null}
        </a>
        <span
          className="hidden h-10 w-px bg-[#d2cbbd] md:block"
          aria-hidden="true"
        />
        <div className="hidden items-center gap-4 md:flex">
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
  href,
}: {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      {label ? <span>{label}</span> : null}
      <span className="grid min-h-11 grid-cols-[1.75rem_1fr_1rem] items-center gap-2 rounded-lg border border-[#d7d0c2] bg-[#fffdf8] px-3 text-sm font-black text-[#111a14] shadow-sm">
        <AppIcon name={icon} className="h-5 w-5 text-[#101812]" />
        <span className="truncate">{value}</span>
        <AppIcon name="chevron" className="h-4 w-4 text-[#101812]" />
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        className="grid gap-1 justify-self-start text-left text-xs font-bold text-[#5d675f]"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className="grid gap-1 justify-self-start text-left text-xs font-bold text-[#5d675f]"
      type="button"
    >
      {content}
    </button>
  );
}

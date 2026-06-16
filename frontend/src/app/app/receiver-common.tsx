"use client";

import type { Donation } from "@/lib/api";
import { AppIcon, formatTime, type IconName } from "./dashboard-ui";

export function ReceiverInfoBlock({
  icon,
  title,
  body,
  action,
  onActionClick,
}: {
  icon: IconName;
  title: string;
  body: string[];
  action: string;
  onActionClick?: () => void;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
        <AppIcon name={icon} className="h-5 w-5 text-[#14733a]" />
        {title}
      </h3>
      {body.map((line) => (
        <span className="block text-xs font-bold text-[#1f2a23]" key={line}>
          {line}
        </span>
      ))}
      <button
        className="mt-2 inline-flex min-h-9 w-max items-center rounded-md border border-[#9eb69f] bg-[#fffdf8] px-3 text-xs font-black text-[#064c25]"
        type="button"
        onClick={onActionClick}
      >
        {action}
      </button>
    </div>
  );
}

export function ReceiverEtaBlock({ donation }: { donation?: Donation }) {
  return (
    <div className="grid gap-4 text-sm">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
          <AppIcon name="clock" className="h-5 w-5 text-[#14733a]" />
          ETA
        </h3>
        <p className="mt-2 text-xs font-bold text-[#1f2a23]">
          {donation ? `Today, ${formatTime(donation.availableUntil)}` : "Today"}
          {" - "}
          {donation ? "30 min window" : "Awaiting schedule"}
        </p>
      </div>
      <div>
        <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
          <AppIcon name="pickup" className="h-5 w-5 text-[#14733a]" />
          Est. duration
        </h3>
        <p className="mt-2 text-xs font-bold text-[#1f2a23]">35 min (12 km)</p>
      </div>
    </div>
  );
}

export function ReceiverDetailNote({
  icon,
  title,
  body,
  action,
  onActionClick,
  secondaryAction,
  onSecondaryActionClick,
}: {
  icon: IconName;
  title: string;
  body: string[];
  action?: string;
  onActionClick?: () => void;
  secondaryAction?: string;
  onSecondaryActionClick?: () => void;
}) {
  return (
    <div className="grid content-start gap-2 px-1 lg:px-4 first:lg:pl-0">
      <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
        <AppIcon name={icon} className="h-5 w-5 text-[#14733a]" />
        {title}
      </h3>
      {body.map((line) => (
        <span
          className="block text-xs font-bold leading-5 text-[#1f2a23]"
          key={line}
        >
          {line}
        </span>
      ))}
      {(action || secondaryAction) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {action ? (
            <button
              className="inline-flex min-h-10 w-max items-center gap-2 rounded-md border border-[#9eb69f] bg-[#e9f4e3] px-4 text-xs font-black text-[#064c25]"
              type="button"
              onClick={onActionClick}
            >
              <AppIcon name="message" className="h-4 w-4" />
              {action}
            </button>
          ) : null}
          {secondaryAction ? (
            <button
              className="inline-flex min-h-10 w-max items-center gap-2 rounded-md border border-[#9eb69f] bg-[#e9f4e3] px-4 text-xs font-black text-[#064c25]"
              type="button"
              onClick={onSecondaryActionClick}
            >
              <AppIcon name="message" className="h-4 w-4" />
              {secondaryAction}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ReceiverRouteSummary({ from }: { from: string }) {
  return (
    <div className="grid content-start gap-2 px-1 lg:px-4">
      <h3 className="flex items-center gap-2 text-sm font-black text-[#101812]">
        <AppIcon name="map" className="h-5 w-5 text-[#14733a]" />
        Route summary
      </h3>
      <div className="grid gap-3 border-l border-dashed border-[#9eb69f] pl-4 text-xs font-bold text-[#1f2a23]">
        <span className="relative grid">
          <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-[#14733a]" />
          <strong>{from}</strong>
          Kemang, Jakarta Selatan
        </span>
        <span className="relative grid">
          <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-[#ef3e32]" />
          <strong>Panti Harapan</strong>
          Cilandak, Jakarta Selatan
        </span>
      </div>
    </div>
  );
}

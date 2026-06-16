"use client";

import { useState } from "react";
import { type Profile, updateMyProfile } from "@/lib/api";
import { SlidePanel } from "./dashboard-layout";
import { AppIcon, cx, panel } from "./dashboard-ui";

export function ReceiverNeedsCard({
  profile,
  token,
  runAction,
}: {
  profile: Profile;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const [showAllNeeds, setShowAllNeeds] = useState(false);
  const needs = [
    [
      "Cooked meals for 30 children",
      "Balanced meals with protein and vegetables.",
      "May 19",
    ],
    [
      "Staple food & snacks",
      "Rice, eggs, fruits, milk, healthy snacks.",
      "May 18",
    ],
    [
      "Hygiene & daily needs",
      "Soap, shampoo, toothpaste, sanitary supplies.",
      "May 16",
    ],
  ];

  function handleUpdateNeeds() {
    const notes = window.prompt("Update needs notes", profile.notes ?? "");
    if (notes === null) {
      return;
    }
    void runAction(async () => {
      await updateMyProfile(token, {
        displayName: profile.displayName,
        contactMethod: profile.contactMethod,
        contactValue: profile.contactValue,
        location: profile.location,
        entityType: profile.entityType,
        operationalHours: profile.operationalHours,
        notes,
      });
    }, "Needs updated.");
  }

  return (
    <>
      <section className={cx(panel, "grid gap-4 p-5")} id="my-food-requests">
        <header className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-[1.15rem] leading-none tracking-[-0.035em] text-[#061e0e]">
            My food requests / needs
          </h2>
          <button
            className="rounded-md bg-[#ffbd1a] px-3 py-2 text-xs font-black text-[#10140d]"
            type="button"
            onClick={handleUpdateNeeds}
          >
            Update needs
          </button>
        </header>
        <div className="grid gap-3">
          {needs.map(([title, description, date], index) => (
            <article
              className="grid grid-cols-[3rem_1fr_auto] items-start gap-3"
              key={title}
            >
              <span
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-full",
                  index === 1
                    ? "bg-[#fee8ba] text-[#4d3510]"
                    : "bg-[#dcebd5] text-[#064c25]",
                )}
              >
                <AppIcon
                  name={index === 2 ? "leaf" : index === 1 ? "package" : "bag"}
                  className="h-5 w-5"
                />
              </span>
              <span className="grid">
                <strong className="text-xs font-black text-[#101812]">
                  {title}
                </strong>
                <span className="mt-1 text-xs font-bold leading-5 text-[#46534a]">
                  {index === 0 && profile.notes ? profile.notes : description}
                </span>
              </span>
              <span className="text-[0.65rem] font-bold text-[#7a817b]">
                Updated
                <br />
                {date}
              </span>
            </article>
          ))}
        </div>
        <button
          type="button"
          className="flex min-h-10 items-center justify-center gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] text-xs font-black text-[#064c25] hover:bg-[#f4f0e8]"
          onClick={() => setShowAllNeeds(true)}
        >
          View all needs <AppIcon name="arrow" className="h-4 w-4" />
        </button>
      </section>

      {showAllNeeds && (
        <SlidePanel
          title="My food requests / needs"
          icon="bag"
          onClose={() => setShowAllNeeds(false)}
        >
          <div className="grid gap-4 p-1">
            <button
              className="justify-self-end rounded-md bg-[#ffbd1a] px-3 py-2 text-xs font-black text-[#10140d] hover:bg-[#f0ac00]"
              type="button"
              onClick={handleUpdateNeeds}
            >
              Update needs
            </button>
            <div className="grid gap-4">
              {needs.map(([title, description, date], index) => (
                <article
                  className="grid grid-cols-[3rem_1fr_auto] items-start gap-3 rounded-xl border border-[#ded7c9] bg-[#fafaf7] p-4"
                  key={title}
                >
                  <span
                    className={cx(
                      "grid h-10 w-10 place-items-center rounded-full",
                      index === 1
                        ? "bg-[#fee8ba] text-[#4d3510]"
                        : "bg-[#dcebd5] text-[#064c25]",
                    )}
                  >
                    <AppIcon
                      name={
                        index === 2 ? "leaf" : index === 1 ? "package" : "bag"
                      }
                      className="h-5 w-5"
                    />
                  </span>
                  <span className="grid">
                    <strong className="text-sm font-black text-[#101812]">
                      {title}
                    </strong>
                    <span className="mt-1 text-xs font-bold leading-5 text-[#46534a]">
                      {index === 0 && profile.notes
                        ? profile.notes
                        : description}
                    </span>
                  </span>
                  <span className="text-[0.65rem] font-bold text-[#7a817b]">
                    Updated
                    <br />
                    {date}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </SlidePanel>
      )}
    </>
  );
}

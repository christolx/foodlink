"use client";

import { useMemo, useState } from "react";
import {
  acceptDeliveryProposal,
  type DeliveryProposal,
  type Donation,
  markNotificationRead,
  type Notification,
  rejectDeliveryProposal,
  type User,
} from "@/lib/api";
import { Modal, SlidePanel } from "./AppShell";
import {
  AppIcon,
  badgeBase,
  cx,
  DonationThumbnail,
  emptyCopy,
  formatDate,
  ghostButton,
  heading,
  panel,
  primaryButton,
  readableDonationId,
  receiverNotificationTitle,
  statusClass,
} from "./ui";

export function ProposalQueue({
  donations,
  proposals,
  viewerRole,
  token,
  runAction,
  openChat,
}: {
  donations: Donation[];
  proposals: DeliveryProposal[];
  viewerRole: "donor" | "receiver";
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  openChat?: (userId: string) => void;
}) {
  const donationsById = useMemo(
    () => new Map(donations.map((donation) => [donation.id, donation])),
    [donations],
  );
  const [detailProposal, setDetailProposal] = useState<{
    proposal: DeliveryProposal;
    donation?: Donation;
  } | null>(null);

  return (
    <>
      <section
        className={cx(panel, "min-h-full min-w-0 p-5 sm:p-6")}
        id="proposal-queue"
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e5f1df] text-[#064c25]">
              <AppIcon name="team" className="h-6 w-6" />
            </span>
            <div>
              <h2 className={heading}>Proposal queue</h2>
              <p className="mt-1 text-xs font-bold text-[#1f2a23]">
                {viewerRole === "donor"
                  ? "Review proposals from volunteers and receivers."
                  : "Review food offers."}
              </p>
            </div>
          </div>
          <a className="text-xs font-black text-[#064c25]" href="#my-donations">
            View all
          </a>
        </header>
        <div className="grid gap-3">
          {proposals.length > 0 ? (
            proposals.map((proposal) => {
              const donation =
                proposal.donation ?? donationsById.get(proposal.donationId);
              const donorAccepted = Boolean(proposal.donorAcceptedAt);
              const receiverAccepted = Boolean(proposal.receiverAcceptedAt);

              const volunteerName =
                proposal.volunteerProfile?.displayName ??
                (proposal.volunteerId === "user_volunteer" ||
                proposal.volunteerId === "demo_volunteer"
                  ? "Budi Santoso"
                  : proposal.volunteerId
                      .replace(/^(user_|demo_)/, "")
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase()));
              const receiverName =
                proposal.receiverProfile?.displayName ??
                (proposal.receiverId === "user_receiver" ||
                proposal.receiverId === "demo_receiver"
                  ? "Panti Harapan"
                  : proposal.receiverId
                      .replace(/^(user_|demo_)/, "")
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase()));

              const volunteerInitials = volunteerName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <article
                  className="grid min-w-0 gap-4 rounded-lg border border-[#ded7c9] bg-[#fffdf8] p-3 sm:grid-cols-[6rem_minmax(0,1fr)]"
                  key={proposal.id}
                >
                  <DonationThumbnail donation={donation} size="lg" />
                  <div className="min-w-0">
                    <strong className="block text-sm font-black text-[#101812]">
                      {donation
                        ? donation.title
                        : `Donation ${proposal.donationId}`}
                    </strong>
                    <p className="mt-1 text-xs font-bold text-[#111a14]">
                      {donation ? formatDate(donation.availableFrom) : "Today"}{" "}
                      <span className="px-2">•</span>
                      {donation?.quantity ?? "Open quantity"}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs font-bold">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[#5c6860]">Volunteer</span>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ead7c5] text-[0.65rem] font-bold text-[#5c3e21]">
                          {volunteerInitials}
                        </span>
                        <span className="truncate font-black text-[#101812]">
                          {volunteerName}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[#5c6860]">Receiver</span>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#fff4df] text-[#c46b00]">
                          <AppIcon name="leaf" className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate font-black text-[#101812]">
                          {receiverName}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:col-start-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <span
                        className={cx(
                          badgeBase,
                          donorAccepted
                            ? "bg-[#e4f1e0] text-[#116b35]"
                            : "bg-[#fff3df] text-[#c46b00]",
                        )}
                      >
                        Donor {donorAccepted ? "Accepted" : "Pending"}
                      </span>
                      <span
                        className={cx(
                          badgeBase,
                          receiverAccepted
                            ? "bg-[#e4f1e0] text-[#116b35]"
                            : proposal.status === "rejected"
                              ? "bg-[#fde9e4] text-[#9b2118]"
                              : "bg-[#fff3df] text-[#c46b00]",
                        )}
                      >
                        Receiver{" "}
                        {proposal.status === "rejected"
                          ? "Rejected"
                          : receiverAccepted
                            ? "Accepted"
                            : "Pending"}
                      </span>
                    </div>
                    <div
                      className={cx(
                        "gap-2 justify-self-start",
                        viewerRole === "donor"
                          ? "grid w-full grid-cols-2"
                          : "flex flex-wrap",
                      )}
                    >
                      {viewerRole === "donor" &&
                        (() => {
                          const rawPhone =
                            proposal.volunteerContactOverride ??
                            proposal.volunteerProfile?.contactValue ??
                            "";
                          if (!rawPhone) return null;
                          const digits = rawPhone.replace(/\D/g, "");
                          const number = digits.startsWith("0")
                            ? `62${digits.slice(1)}`
                            : digits;
                          const text = encodeURIComponent(
                            `Halo ${volunteerName}, saya donor dari FoodLink. Ingin konfirmasi proposal pengiriman untuk donasi "${donation?.title ?? ""}". Terima kasih!`,
                          );
                          return (
                            <a
                              href={`https://wa.me/${number}?text=${text}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cx(
                                ghostButton,
                                viewerRole === "donor"
                                  ? "min-h-11 px-2 text-xs"
                                  : "inline-flex items-center gap-1.5",
                                "!text-[#14733a]",
                              )}
                            >
                              <svg
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                                focusable="false"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.882l6.198-1.624A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.368l-.36-.214-3.68.964.981-3.595-.234-.37A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
                              </svg>
                              WhatsApp
                            </a>
                          );
                        })()}
                      {viewerRole === "donor" && openChat ? (
                        <button
                          className={cx(
                            ghostButton,
                            "min-h-11 px-2 text-xs !text-[#14733a]",
                          )}
                          type="button"
                          onClick={() => openChat(proposal.volunteerId)}
                        >
                          Chat in-app
                        </button>
                      ) : null}
                      <button
                        className={cx(
                          ghostButton,
                          viewerRole === "donor" && "min-h-11 px-2 text-xs",
                        )}
                        type="button"
                        onClick={() =>
                          runAction(async () => {
                            await rejectDeliveryProposal(token, proposal.id);
                          }, "Proposal rejected.")
                        }
                      >
                        Reject
                      </button>
                      {proposal.status === "pending" ? (
                        <button
                          className={cx(
                            primaryButton,
                            viewerRole === "donor" && "min-h-11 px-2 text-xs",
                          )}
                          type="button"
                          onClick={() =>
                            runAction(async () => {
                              await acceptDeliveryProposal(token, proposal.id);
                            }, "Proposal accepted.")
                          }
                        >
                          Accept
                        </button>
                      ) : (
                        <button
                          className={cx(
                            ghostButton,
                            viewerRole === "donor" && "min-h-11 px-2 text-xs",
                          )}
                          type="button"
                          onClick={() =>
                            setDetailProposal({ proposal, donation })
                          }
                        >
                          View details
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#d8cfba] bg-[#fffdf8] p-6 text-sm font-bold text-[#46534a]">
              No proposals yet.
            </div>
          )}
        </div>
      </section>

      {detailProposal && (
        <Modal title="Proposal details" onClose={() => setDetailProposal(null)}>
          <div className="grid gap-5">
            <div className="flex gap-4">
              <DonationThumbnail donation={detailProposal.donation} size="lg" />
              <div className="min-w-0">
                <strong className="block text-lg font-black text-[#101812]">
                  {detailProposal.donation?.title ??
                    readableDonationId(detailProposal.proposal.donationId)}
                </strong>
                <p className="mt-1 text-sm font-bold text-[#46534a]">
                  {detailProposal.donation?.description ?? "Food donation"}
                </p>
                <span
                  className={cx(
                    badgeBase,
                    statusClass(detailProposal.proposal.status),
                    "mt-2 inline-block",
                  )}
                >
                  {detailProposal.proposal.status}
                </span>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f7f5f0] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Donor accepted
                  </span>
                  <strong
                    className={cx(
                      "mt-1 block font-black",
                      detailProposal.proposal.donorAcceptedAt
                        ? "text-[#14733a]"
                        : "text-[#9d5b00]",
                    )}
                  >
                    {detailProposal.proposal.donorAcceptedAt
                      ? "Yes"
                      : "Pending"}
                  </strong>
                </div>
                <div className="rounded-lg bg-[#f7f5f0] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Receiver accepted
                  </span>
                  <strong
                    className={cx(
                      "mt-1 block font-black",
                      detailProposal.proposal.receiverAcceptedAt
                        ? "text-[#14733a]"
                        : "text-[#9d5b00]",
                    )}
                  >
                    {detailProposal.proposal.receiverAcceptedAt
                      ? "Yes"
                      : "Pending"}
                  </strong>
                </div>
              </div>
              {detailProposal.proposal.volunteerProfile && (
                <div className="rounded-lg border border-[#e4ddcf] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Volunteer
                  </span>
                  <span className="mt-1 block font-black text-[#101812]">
                    {detailProposal.proposal.volunteerProfile.displayName}
                  </span>
                  <span className="text-xs font-bold text-[#46534a]">
                    {detailProposal.proposal.volunteerProfile.contactValue}
                  </span>
                </div>
              )}
              {detailProposal.proposal.receiverProfile && (
                <div className="rounded-lg border border-[#e4ddcf] p-3">
                  <span className="block text-xs font-bold text-[#46534a]">
                    Receiver
                  </span>
                  <span className="mt-1 block font-black text-[#101812]">
                    {detailProposal.proposal.receiverProfile.displayName}
                  </span>
                  <span className="text-xs font-bold text-[#46534a]">
                    {detailProposal.proposal.receiverProfile.location.city}
                  </span>
                </div>
              )}
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Created
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {formatDate(detailProposal.proposal.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function DonationsTable({
  donations,
  proposals = [],
  title,
  compact = false,
}: {
  donations: Donation[];
  proposals?: DeliveryProposal[];
  title: string;
  compact?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [detailDonation, setDetailDonation] = useState<Donation | null>(null);

  const statuses = [...new Set(donations.map((d) => d.status))];
  const visible =
    statusFilter === "all"
      ? donations
      : donations.filter((d) => d.status === statusFilter);

  return (
    <>
      <section
        className={cx(panel, "min-w-0 p-5 sm:p-6", compact && "min-h-full")}
        id="my-donations"
      >
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f4ead6] text-[#064c25]">
              <AppIcon name="package" className="h-6 w-6" />
            </span>
            <h2 className={heading}>{title}</h2>
          </div>
          <select
            className={cx(ghostButton, "cursor-pointer pr-2")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </header>
        <div className="mt-3 grid gap-3 md:hidden">
          {visible.length > 0 ? (
            visible.map((donation) => {
              const proposalCount = proposals.filter(
                (proposal) => proposal.donationId === donation.id,
              ).length;

              return (
                <article
                  className="grid min-w-0 gap-3 rounded-lg border border-[#ded7c9] bg-[#fffdf8] p-3"
                  key={donation.id}
                >
                  <div className="flex min-w-0 gap-3">
                    <DonationThumbnail donation={donation} />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-[#101812]">
                        {donation.title}
                      </strong>
                      <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#46534a]">
                        {donation.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-[#46534a]">
                    <span className="rounded-md bg-[#f7f5f0] p-2">
                      <strong className="block text-[#101812]">
                        {donation.quantity}
                      </strong>
                      Quantity
                    </span>
                    <span className="rounded-md bg-[#f7f5f0] p-2">
                      <strong className="block text-[#101812]">
                        {proposalCount}
                      </strong>
                      Proposals
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(badgeBase, statusClass(donation.status))}
                    >
                      {donation.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-bold text-[#46534a]">
                      Updated {formatDate(donation.updatedAt)}
                    </span>
                  </div>
                  <div className="rounded-md border border-[#e4ddcf] bg-[#faf8f2] p-2 text-xs font-bold leading-5 text-[#1f2a23]">
                    {formatDate(donation.availableFrom)} -{" "}
                    {formatDate(donation.availableUntil)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={cx(ghostButton, "min-h-11 flex-1")}
                      type="button"
                      onClick={() => setDetailDonation(donation)}
                    >
                      View
                    </button>
                    <button
                      className={cx(ghostButton, "min-h-11 flex-1")}
                      type="button"
                      onClick={() => navigator.clipboard.writeText(donation.id)}
                    >
                      Copy ID
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#d8cfba] bg-[#fffdf8] p-4 text-sm font-bold text-[#46534a]">
              No donations visible yet.
            </div>
          )}
        </div>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[56rem] border-collapse">
            <thead className="text-left">
              <tr>
                {[
                  "Donation",
                  "Quantity",
                  "Available window",
                  "Status",
                  "Latest update",
                  "Proposals",
                  "Actions",
                ].map((label) => (
                  <th
                    className="border-b border-[#ded7c9] px-3 py-3 text-xs font-black text-[#111a14]"
                    key={label}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length > 0 ? (
                visible.map((donation) => (
                  <tr key={donation.id}>
                    <td className="border-b border-[#ded7c9] px-3 py-3 font-black">
                      <div className="flex items-center gap-3">
                        <DonationThumbnail donation={donation} />
                        <div>
                          <strong className="block text-sm">
                            {donation.title}
                          </strong>
                          <small className="block text-xs font-bold text-[#46534a]">
                            {donation.description}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {donation.quantity}
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {formatDate(donation.availableFrom)} –{" "}
                      {formatDate(donation.availableUntil)}
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3">
                      <span
                        className={cx(badgeBase, statusClass(donation.status))}
                      >
                        {donation.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {formatDate(donation.updatedAt)}
                    </td>
                    <td className="border-b border-[#ded7c9] px-3 py-3 text-sm font-bold">
                      {
                        proposals.filter(
                          (proposal) => proposal.donationId === donation.id,
                        ).length
                      }
                    </td>
                    <td className="relative border-b border-[#ded7c9] px-3 py-3">
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md border border-[#ded7c9] bg-[#fffdf8] font-black"
                        type="button"
                        aria-label={`Donation actions for ${donation.title}`}
                        onClick={() =>
                          setMenuId(menuId === donation.id ? null : donation.id)
                        }
                      >
                        ⋮
                      </button>
                      {menuId === donation.id && (
                        <div className="absolute right-3 top-12 z-20 min-w-[9rem] rounded-lg border border-[#ded7c9] bg-[#fffdf8] py-1 shadow-lg">
                          <button
                            className="block w-full px-4 py-2 text-left text-xs font-bold text-[#1f2a23] hover:bg-[#f4f1eb]"
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(donation.id);
                              setMenuId(null);
                            }}
                          >
                            Copy ID
                          </button>
                          <button
                            className="block w-full px-4 py-2 text-left text-xs font-bold text-[#1f2a23] hover:bg-[#f4f1eb]"
                            type="button"
                            onClick={() => {
                              setDetailDonation(donation);
                              setMenuId(null);
                            }}
                          >
                            View details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="border-b border-[#ded7c9] px-3 py-4 font-bold text-[#34443a]"
                    colSpan={7}
                  >
                    No donations visible yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visible.length > 0 ? (
          <div className="mt-5 text-center text-xs font-bold text-[#5c6860] border-t border-[#ded7c9]/40 pt-4">
            Showing {visible.length} of {donations.length} donations
          </div>
        ) : null}
      </section>

      {detailDonation && (
        <Modal title="Donation details" onClose={() => setDetailDonation(null)}>
          <div className="grid gap-5">
            <div className="flex gap-4">
              <DonationThumbnail donation={detailDonation} size="lg" />
              <div className="min-w-0">
                <strong className="block text-lg font-black text-[#101812]">
                  {detailDonation.title}
                </strong>
                <p className="mt-1 text-sm font-bold text-[#46534a]">
                  {detailDonation.description}
                </p>
                <span
                  className={cx(
                    badgeBase,
                    statusClass(detailDonation.status),
                    "mt-2 inline-block",
                  )}
                >
                  {detailDonation.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#f7f5f0] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Quantity
                </span>
                <strong className="mt-1 block text-base font-black text-[#101812]">
                  {detailDonation.quantity}
                </strong>
              </div>
              <div className="rounded-lg bg-[#f7f5f0] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Proposals
                </span>
                <strong className="mt-1 block text-base font-black text-[#101812]">
                  {
                    proposals.filter((p) => p.donationId === detailDonation.id)
                      .length
                  }
                </strong>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Available window
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {formatDate(detailDonation.availableFrom)} –{" "}
                  {formatDate(detailDonation.availableUntil)}
                </span>
              </div>
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Pickup location
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {detailDonation.pickupLocation.addressLine1},{" "}
                  {detailDonation.pickupLocation.city}
                </span>
              </div>
              {detailDonation.specialInstructions && (
                <div className="rounded-lg bg-[#f0f7eb] p-3">
                  <span className="block text-xs font-black text-[#2f7a46]">
                    Special instructions
                  </span>
                  <p className="mt-1 font-bold leading-5 text-[#1f2a23]">
                    {detailDonation.specialInstructions}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-[#e4ddcf] p-3">
                <span className="block text-xs font-bold text-[#46534a]">
                  Last updated
                </span>
                <span className="mt-1 block font-black text-[#101812]">
                  {formatDate(detailDonation.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function NotificationsPanel({
  notifications,
  viewerRole,
  token,
  runAction,
  onClose,
  onSettingsClick,
}: {
  notifications: Notification[];
  viewerRole: User["role"];
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
  onClose?: () => void;
  onSettingsClick?: () => void;
}) {
  const unread = notifications.filter((item) => !item.read).length;
  const receiverVariant = viewerRole === "receiver";
  const [notificationFilter, setNotificationFilter] = useState<
    "all" | "unread"
  >("all");
  const [showAllModal, setShowAllModal] = useState(false);
  const visibleNotifications =
    receiverVariant && notificationFilter === "unread"
      ? notifications.filter((item) => !item.read)
      : notifications;

  return (
    <>
      <aside
        className={cx(
          panel,
          "min-w-0 self-start p-5 sm:p-6 2xl:sticky 2xl:top-5 2xl:max-h-[calc(100vh-2.5rem)] 2xl:overflow-y-auto",
        )}
        id="notifications"
        aria-label="Notifications"
      >
        <header className="mb-3 flex items-center gap-3">
          <h2 className={heading}>Notifications</h2>
          {unread > 0 ? (
            <span className="rounded-md bg-[#e5f1df] px-2 py-1 text-xs font-black text-[#064c25]">
              {unread} unread
            </span>
          ) : null}
          <button
            className="ml-auto text-[#101812]"
            type="button"
            aria-label="Notification settings"
            onClick={onSettingsClick}
          >
            <AppIcon name="settings" className="h-5 w-5" />
          </button>
          {onClose && (
            <button
              className="text-[#101812]"
              type="button"
              aria-label="Close"
              onClick={onClose}
            >
              <AppIcon name="close" className="h-5 w-5" />
            </button>
          )}
        </header>
        {receiverVariant ? (
          <div className="mb-4 grid grid-cols-2 border-b border-[#ded7c9] text-center text-sm font-bold">
            <button
              className={cx(
                "py-3",
                notificationFilter === "all"
                  ? "border-b-2 border-[#0b5b2b] text-[#064c25]"
                  : "text-[#46534a]",
              )}
              type="button"
              onClick={() => setNotificationFilter("all")}
            >
              All
            </button>
            <button
              className={cx(
                "py-3",
                notificationFilter === "unread"
                  ? "border-b-2 border-[#0b5b2b] text-[#064c25]"
                  : "text-[#46534a]",
              )}
              type="button"
              onClick={() => setNotificationFilter("unread")}
            >
              Unread ({unread})
            </button>
          </div>
        ) : null}
        <div className="grid">
          {visibleNotifications.length > 0
            ? visibleNotifications.map((notification) => (
                <article
                  className={cx(
                    "grid grid-cols-[3rem_1fr] gap-3 border-t border-[#ded7c9] py-5 first:border-t-0",
                    receiverVariant && "grid-cols-[3.5rem_1fr]",
                    notification.read && "opacity-60",
                  )}
                  key={notification.id}
                >
                  <span
                    className={cx(
                      "grid h-11 w-11 place-items-center rounded-full",
                      notification.type === "proposal_accepted"
                        ? "bg-[#ffe9c1] text-[#dd6700]"
                        : notification.type === "pickup_assigned"
                          ? "bg-[#deedf8] text-[#1c6796]"
                          : notification.type === "pickup_completed"
                            ? "bg-[#dfeedd] text-[#116b35]"
                            : "bg-[#e5f1df] text-[#064c25]",
                    )}
                    aria-hidden="true"
                  >
                    <AppIcon
                      name={
                        notification.type === "pickup_assigned"
                          ? "pickup"
                          : notification.type === "pickup_completed"
                            ? "check"
                            : notification.type === "proposal_created"
                              ? "package"
                              : "team"
                      }
                      className="h-5 w-5"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="grid gap-1 sm:flex sm:items-start sm:justify-between sm:gap-3">
                      <strong className="block text-sm font-black text-[#101812] min-w-0">
                        {receiverNotificationTitle(notification)}
                      </strong>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="whitespace-nowrap text-xs font-bold text-[#46534a]">
                          {formatDate(notification.createdAt)}
                        </span>
                        {!notification.read ? (
                          <span className="h-2 w-2 rounded-full bg-[#ffbd1a]" />
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#1f2a23]">
                      {notification.body}
                    </p>
                  </div>
                  {!notification.read ? (
                    <button
                      className="col-start-2 justify-self-start border-0 bg-transparent p-0 text-sm font-black text-[#064c25] transition hover:text-[#116b35]"
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
            : emptyCopy(
                notificationFilter === "unread"
                  ? "No unread notifications."
                  : "No notifications yet.",
              )}
        </div>
        <button
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[#9eb69f] bg-[#fffdf8] text-sm font-black text-[#064c25] transition hover:bg-[#f0f7eb]"
          type="button"
          onClick={() => setShowAllModal(true)}
        >
          View all notifications <span className="text-lg">→</span>
        </button>
      </aside>

      {showAllModal && (
        <SlidePanel
          title="All notifications"
          icon="bell"
          onClose={() => setShowAllModal(false)}
        >
          <div className="grid">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <article
                  className={cx(
                    "grid grid-cols-[3rem_1fr] gap-3 border-t border-[#e4ddcf] py-4 first:border-t-0",
                    notification.read && "opacity-60",
                  )}
                  key={notification.id}
                >
                  <span
                    className={cx(
                      "grid h-11 w-11 place-items-center rounded-full",
                      notification.type === "proposal_accepted"
                        ? "bg-[#ffe9c1] text-[#dd6700]"
                        : notification.type === "pickup_assigned"
                          ? "bg-[#deedf8] text-[#1c6796]"
                          : notification.type === "pickup_completed"
                            ? "bg-[#dfeedd] text-[#116b35]"
                            : "bg-[#e5f1df] text-[#064c25]",
                    )}
                  >
                    <AppIcon
                      name={
                        notification.type === "pickup_assigned"
                          ? "pickup"
                          : notification.type === "pickup_completed"
                            ? "check"
                            : notification.type === "proposal_created"
                              ? "package"
                              : "team"
                      }
                      className="h-5 w-5"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="block text-sm font-black text-[#101812]">
                        {receiverNotificationTitle(notification)}
                      </strong>
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ffbd1a]" />
                      )}
                    </div>
                    <span className="mt-0.5 block text-xs font-bold text-[#46534a]">
                      {formatDate(notification.createdAt)}
                    </span>
                    {!notification.read && (
                      <button
                        className="mt-2 text-xs font-black text-[#064c25] hover:text-[#116b35]"
                        type="button"
                        onClick={() =>
                          runAction(async () => {
                            await markNotificationRead(token, notification.id);
                          }, "Notification marked read.")
                        }
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="py-8 text-center text-sm font-bold text-[#46534a]">
                No notifications yet.
              </p>
            )}
          </div>
        </SlidePanel>
      )}
    </>
  );
}

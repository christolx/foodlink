"use client";

import {
  CldUploadWidget,
  type CloudinaryUploadWidgetInfo,
  type CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createDonation } from "@/lib/api";
import { LocationPickerMapDynamic } from "./dashboard-maps";
import {
  DonationsTable,
  NotificationsPanel,
  ProposalQueue,
} from "./dashboard-shared";
import type { DashboardData } from "./dashboard-types";
import {
  AppIcon,
  cx,
  defaultDonationImage,
  demoLocation,
  heading,
  type IconName,
  input,
  panel,
  primaryButton,
} from "./dashboard-ui";

const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const cloudinaryUploadEnabled =
  Boolean(cloudinaryCloudName) && Boolean(cloudinaryUploadPreset);

function uploadResultInfo(
  result: CloudinaryUploadWidgetResults,
): CloudinaryUploadWidgetInfo | null {
  return typeof result.info === "object" ? result.info : null;
}

function uploadErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "statusText" in error &&
    typeof error.statusText === "string"
  ) {
    return error.statusText;
  }
  return "Image upload failed.";
}

export function DonorDashboard({
  data,
  token,
  runAction,
}: {
  data: DashboardData;
  token: string;
  runAction: (callback: () => Promise<void>, success: string) => Promise<void>;
}) {
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [donorCoords, setDonorCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationMode, setLocationMode] = useState<"gps" | "map">("gps");
  const [pickedCoords, setPickedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -6.2088, 106.8456,
  ]);
  const [geocoding, setGeocoding] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);

  const [defaultFrom, setDefaultFrom] = useState("");
  const [defaultUntil, setDefaultUntil] = useState("");
  const availableCount = data.donations.filter(
    (donation) => donation.status === "available",
  ).length;
  const pendingCount = data.proposals.filter(
    (proposal) => proposal.status === "pending",
  ).length;
  const deliveredCount = data.donations.filter(
    (donation) => donation.status === "delivered",
  ).length;

  useEffect(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    const localNow = new Date(Date.now() - tzoffset);
    const localLater = new Date(Date.now() - tzoffset + 4 * 60 * 60 * 1000);
    setDefaultFrom(localNow.toISOString().slice(0, 16));
    setDefaultUntil(localLater.toISOString().slice(0, 16));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setDonorCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => {},
        { enableHighAccuracy: true },
      );
    }
  }, []);

  async function handleCreateDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const now = new Date();
    const later = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const fromVal = form.get("availableFrom");
    const untilVal = form.get("availableUntil");
    const fromDate = fromVal ? new Date(String(fromVal)) : now;
    const untilDate = untilVal ? new Date(String(untilVal)) : later;

    await runAction(async () => {
      await createDonation(token, {
        title: String(form.get("title") || "Fresh prepared meals"),
        description: String(
          form.get("description") || "Safe surplus food ready for pickup.",
        ),
        quantity: String(form.get("quantity") || "10 packs"),
        imageUrl: uploadedImageUrl || defaultDonationImage,
        pickupLocation: {
          ...demoLocation,
          addressLine1:
            locationInputRef.current?.value || demoLocation.addressLine1,
          ...(locationMode === "map" && pickedCoords
            ? { latitude: pickedCoords.lat, longitude: pickedCoords.lng }
            : locationMode === "gps" && donorCoords
              ? { latitude: donorCoords.lat, longitude: donorCoords.lng }
              : {}),
        },
        availableFrom: fromDate.toISOString(),
        availableUntil: untilDate.toISOString(),
        specialInstructions: String(form.get("instructions") || ""),
      });
      formElement.reset();
      setUploadedImageUrl("");
      setUploadError("");
      setPickedCoords(null);
    }, "Donation posted.");
  }

  return (
    <>
      <div className="grid min-w-0 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid min-w-0 gap-5" id="work">
          <DonorMobileHero
            availableCount={availableCount}
            deliveredCount={deliveredCount}
            pendingCount={pendingCount}
          />
          <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <form
              className={cx(
                panel,
                "grid min-w-0 content-start gap-4 p-5 sm:p-6",
              )}
              onSubmit={handleCreateDonation}
            >
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f4ead6] text-[#064c25]">
                  <AppIcon name="leaf" className="h-6 w-6" />
                </span>
                <h2 className={heading}>Create donation</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Title
                  <input
                    className={input}
                    name="title"
                    placeholder="e.g. Fresh vegetables from today"
                    required
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Quantity
                  <input
                    className={input}
                    name="quantity"
                    placeholder="e.g. 15 kg, 10 packs"
                    required
                  />
                </label>
              </div>

              <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                Description
                <textarea
                  className={cx(input, "min-h-20 resize-y")}
                  name="description"
                  placeholder="Describe the food, condition, and anything important."
                  required
                />
              </label>

              <div className="grid gap-2">
                <span className="flex items-center justify-between text-xs font-bold text-[#46534a]">
                  Pickup location
                  <span className="flex gap-1 rounded-lg border border-[#cfc8ba] bg-[#f4f0e8] p-0.5">
                    <button
                      type="button"
                      className={cx(
                        "rounded-md px-3 py-1 text-[0.65rem] font-black transition-colors",
                        locationMode === "gps"
                          ? "bg-white text-[#064c25] shadow-sm"
                          : "text-[#46534a] hover:text-[#101812]",
                      )}
                      onClick={() => setLocationMode("gps")}
                    >
                      Use GPS
                    </button>
                    <button
                      type="button"
                      className={cx(
                        "rounded-md px-3 py-1 text-[0.65rem] font-black transition-colors",
                        locationMode === "map"
                          ? "bg-white text-[#064c25] shadow-sm"
                          : "text-[#46534a] hover:text-[#101812]",
                      )}
                      onClick={() => setLocationMode("map")}
                    >
                      Pick on map
                    </button>
                  </span>
                </span>

                <span className="grid grid-cols-[2.5rem_1fr_2.5rem] overflow-hidden rounded-[0.65rem] border border-[#cfc8ba] bg-[#fffdf8]">
                  <span className="grid place-items-center text-[#064c25]">
                    <AppIcon name="map" className="h-5 w-5" />
                  </span>
                  <input
                    ref={locationInputRef}
                    className="min-h-10 bg-transparent px-2 text-sm font-bold outline-none"
                    name="location"
                    placeholder="Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan"
                  />
                  {locationMode === "gps" ? (
                    <span className="grid place-items-center border-l border-[#cfc8ba] px-2">
                      {donorCoords ? (
                        <span
                          className="h-2 w-2 rounded-full bg-[#14733a]"
                          title="GPS detected"
                        />
                      ) : (
                        <span
                          className="h-2 w-2 animate-pulse rounded-full bg-[#cfc8ba]"
                          title="Detecting…"
                        />
                      )}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={geocoding}
                      className="grid place-items-center border-l border-[#cfc8ba] px-2 text-[#064c25] hover:bg-[#e5f1df] disabled:opacity-50"
                      title="Open map picker"
                      onClick={async () => {
                        const addr = locationInputRef.current?.value ?? "";
                        let center: [number, number] = donorCoords
                          ? [donorCoords.lat, donorCoords.lng]
                          : [-6.2088, 106.8456];
                        if (addr) {
                          setGeocoding(true);
                          try {
                            const res = await fetch(
                              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`,
                            );
                            const data = await res.json();
                            if (Array.isArray(data) && data[0]) {
                              center = [
                                parseFloat(data[0].lat),
                                parseFloat(data[0].lon),
                              ];
                            }
                          } catch {
                            // fall back to GPS/Jakarta
                          } finally {
                            setGeocoding(false);
                          }
                        }
                        setMapCenter(center);
                        setShowMapPicker(true);
                      }}
                    >
                      {geocoding ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0b5b2b] border-t-transparent" />
                      ) : (
                        <AppIcon name="map" className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </span>

                {locationMode === "gps" && (
                  <span className="text-[0.65rem] font-bold text-[#9aab9c]">
                    {donorCoords
                      ? `GPS: ${donorCoords.lat.toFixed(5)}, ${donorCoords.lng.toFixed(5)}`
                      : "Detecting GPS location…"}
                  </span>
                )}
                {locationMode === "map" && (
                  <span
                    className={cx(
                      "text-[0.65rem] font-bold",
                      pickedCoords ? "text-[#14733a]" : "text-[#9aab9c]",
                    )}
                  >
                    {pickedCoords
                      ? `Pinned: ${pickedCoords.lat.toFixed(5)}, ${pickedCoords.lng.toFixed(5)}`
                      : "Click the map icon to pin a location"}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Available from
                  <span className="relative block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#064c25] pointer-events-none">
                      <AppIcon name="calendar" className="h-4.5 w-4.5" />
                    </span>
                    <input
                      className={cx(input, "pl-10 pr-8")}
                      name="availableFrom"
                      type="datetime-local"
                      defaultValue={defaultFrom}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#46534a] pointer-events-none">
                      <AppIcon name="chevron" className="h-4 w-4" />
                    </span>
                  </span>
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                  Available until
                  <span className="relative block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#064c25] pointer-events-none">
                      <AppIcon name="calendar" className="h-4.5 w-4.5" />
                    </span>
                    <input
                      className={cx(input, "pl-10 pr-8")}
                      name="availableUntil"
                      type="datetime-local"
                      defaultValue={defaultUntil}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#46534a] pointer-events-none">
                      <AppIcon name="chevron" className="h-4 w-4" />
                    </span>
                  </span>
                </label>
              </div>

              <label className="grid gap-2 text-xs font-bold text-[#46534a]">
                Special instructions (optional)
                <textarea
                  className={cx(input, "min-h-16 resize-y")}
                  name="instructions"
                  placeholder="Parking info, access notes, packaging, etc."
                />
              </label>

              {cloudinaryUploadEnabled ? (
                <CldUploadWidget
                  uploadPreset={cloudinaryUploadPreset}
                  options={{
                    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                    maxFiles: 1,
                    multiple: false,
                    resourceType: "image",
                    sources: ["local", "camera"],
                  }}
                  onError={(error) => {
                    setUploadError(uploadErrorMessage(error));
                  }}
                  onSuccess={(result) => {
                    const info = uploadResultInfo(result);
                    if (!info?.secure_url) {
                      setUploadError("Cloudinary did not return image URL.");
                      return;
                    }
                    setUploadedImageUrl(info.secure_url);
                    setUploadError("");
                  }}
                >
                  {({ open }) => (
                    <button
                      className="justify-self-start border-0 bg-transparent p-0 text-xs font-black text-[#064c25]"
                      type="button"
                      onClick={() => open()}
                    >
                      {uploadedImageUrl
                        ? "Replace donation photo"
                        : "Add donation photo"}
                    </button>
                  )}
                </CldUploadWidget>
              ) : null}
              {uploadError ? (
                <p className="text-xs font-black text-[#80251d]">
                  {uploadError}
                </p>
              ) : null}

              <button className={primaryButton} type="submit">
                <AppIcon name="leaf" className="h-5 w-5" />
                Post donation
              </button>
              {uploadedImageUrl ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-[#cfc8ba] shadow-sm transition-all duration-300">
                  {/* biome-ignore lint/performance/noImgElement: Uploaded image preview */}
                  <img
                    alt="Uploaded donation preview"
                    className="h-48 w-full object-cover"
                    src={uploadedImageUrl}
                  />
                </div>
              ) : null}
            </form>

            <ProposalQueue
              donations={data.donations}
              proposals={data.proposals}
              viewerRole="donor"
              token={token}
              myUserId={data.user.id}
              runAction={runAction}
            />
          </section>

          <DonationsTable
            donations={data.donations}
            proposals={data.proposals}
            title="My donations"
          />
        </div>

        <NotificationsPanel
          notifications={data.notifications}
          viewerRole={data.user.role}
          token={token}
          runAction={runAction}
        />
      </div>

      {showMapPicker &&
        createPortal(
          <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/60 sm:items-center sm:p-6">
            <div className="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[80vh] sm:max-w-2xl sm:rounded-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[#ded7c9] px-5 py-4">
                <div>
                  <h3 className="text-sm font-black text-[#101812]">
                    Pick pickup location
                  </h3>
                  <p className="text-xs text-[#46534a]">
                    Click or drag the pin to set the exact spot
                  </p>
                </div>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f4f0e8]"
                  onClick={() => setShowMapPicker(false)}
                >
                  ✕
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <LocationPickerMapDynamic
                  initialCenter={mapCenter}
                  onConfirm={(coords) => {
                    setPickedCoords(coords);
                    setShowMapPicker(false);
                  }}
                  onClose={() => setShowMapPicker(false)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function DonorMobileHero({
  availableCount,
  deliveredCount,
  pendingCount,
}: {
  availableCount: number;
  deliveredCount: number;
  pendingCount: number;
}) {
  const stats = [
    { label: "Available", value: availableCount, icon: "bag" as IconName },
    { label: "Pending", value: pendingCount, icon: "box" as IconName },
    { label: "Delivered", value: deliveredCount, icon: "check" as IconName },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_78%_78%,rgba(255,189,26,0.14),transparent_7rem),linear-gradient(135deg,#073515_0%,#0a401d_100%)] p-5 text-[#fffdf7] shadow-[0_1.5rem_3rem_rgba(6,30,14,0.22)] lg:hidden">
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
        <AppIcon name="leaf" className="h-9 w-9" />
      </div>
      <div className="relative grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffdf8b]">
              Today
            </p>
            <h2 className="mt-2 font-serif text-[1.78rem] leading-none tracking-[-0.045em]">
              Today&apos;s surplus flow
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

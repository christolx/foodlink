"use client";

import dynamic from "next/dynamic";

export const LocationPickerMapDynamic = dynamic(
  () => import("./LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[#46534a]">
        Loading map…
      </div>
    ),
  },
);

export const VolunteerMapDynamic = dynamic(() => import("./VolunteerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[#46534a]">
      Loading map…
    </div>
  ),
});

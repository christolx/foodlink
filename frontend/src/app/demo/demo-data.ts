import type { UserRole } from "@/lib/api";

export type DemoRole = {
  role: UserRole;
  title: string;
  account: string;
  description: string;
  icon: "heart" | "hand" | "people";
  image: string;
  accent: "leaf" | "sun" | "mint";
};

export const roles: DemoRole[] = [
  {
    role: "donor",
    title: "Donor",
    account: "donor@foodlink.local",
    description: "I have surplus food to share with my community.",
    icon: "heart",
    image: "/demo/roles/donor-role.webp",
    accent: "leaf",
  },
  {
    role: "receiver",
    title: "Receiver",
    account: "receiver@foodlink.local",
    description: "I represent an organization that receives food.",
    icon: "people",
    image: "/demo/roles/receiver-role.webp",
    accent: "sun",
  },
  {
    role: "volunteer",
    title: "Volunteer",
    account: "volunteer@foodlink.local",
    description: "I help collect and deliver food to those in need.",
    icon: "hand",
    image: "/demo/roles/volunteer-role.webp",
    accent: "mint",
  },
];

export const accentClasses = {
  leaf: "bg-[#0f4f24] text-[#fffdf5]",
  mint: "bg-[#dcebd5] text-[#0f4f24]",
  sun: "bg-[#f7dfaa] text-[#0f1b14]",
};

export function parseDemoRole(role: string | null): UserRole | null {
  if (role === "donor" || role === "receiver" || role === "volunteer") {
    return role;
  }

  return null;
}

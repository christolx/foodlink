import type {
  DeliveryProposal,
  Donation,
  Notification,
  Pickup,
  Profile,
  User,
} from "@/lib/api";

export type DashboardData = {
  user: User;
  profile: Profile;
  donations: Donation[];
  proposals: DeliveryProposal[];
  pickups: Pickup[];
  receivers: Profile[];
  notifications: Notification[];
};

export type ActionState = {
  message: string;
  tone: "success" | "error";
} | null;

export type RunAction = (
  callback: () => Promise<void>,
  success: string,
) => Promise<void>;

export type SidePanelType = "profile" | "settings" | "reports" | "help" | "messages" | "notifications";

export interface Metro {
  id: string;
  name: string;
  state: string;
  label: string;
}

export const METROS: Metro[] = [
  { id: "chicago", name: "Chicago", state: "IL", label: "Chicago, IL" },
  { id: "austin", name: "Austin", state: "TX", label: "Austin, TX" },
  { id: "san-francisco", name: "San Francisco", state: "CA", label: "San Francisco, CA" },
  { id: "seattle", name: "Seattle", state: "WA", label: "Seattle, WA" },
  { id: "new-york", name: "New York", state: "NY", label: "New York, NY" },
];

export type Trade =
  | "HVAC"
  | "Electrical"
  | "Plumbing"
  | "Roofing"
  | "Fire Suppression"
  | "Glass & Glazing"
  | "Concrete"
  | "Structural Steel"
  | "Demolition"
  | "General Construction";

export type PermitStatus =
  | "Issued"
  | "Under Review"
  | "Approved"
  | "Completed";

export type ContactConfidence = "High" | "Medium" | "Low";

export type LeadStatus =
  | "New"
  | "Saved"
  | "Contacted"
  | "Not Relevant"
  | "Won";

export interface GCContact {
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  confidence: ContactConfidence;
}

export interface Permit {
  id: string;
  permitNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  filingDate: string;
  description: string;
  estimatedValue: number;
  status: PermitStatus;
  trades: Trade[];
  gcContact: GCContact;
  source: string;
  sourceUpdatedAt: string;
}

export interface SavedLead {
  id: string;
  permitId: string;
  userId: string;
  status: LeadStatus;
  notes: string;
  savedAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  metro: string;
  primaryTrade: Trade | null;
  plan: "free" | "starter" | "pro" | "growth";
  trialEndsAt: string | null;
  savedLeadsCount: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  metros: number;
  trades: number;
  highlighted?: boolean;
}

export const TRADES: Trade[] = [
  "HVAC",
  "Electrical",
  "Plumbing",
  "Roofing",
  "Fire Suppression",
  "Glass & Glazing",
  "Concrete",
  "Structural Steel",
  "Demolition",
  "General Construction",
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 199,
    description: "For solo contractors getting started with lead generation",
    metros: 1,
    trades: 1,
    features: [
      "1 metro area",
      "1 trade filter",
      "Full GC name, phone & email",
      "Full permit history",
      "Weekly email digest",
      "CSV export",
      "Unlimited saved leads",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 349,
    description: "For growing teams tracking multiple trades",
    metros: 1,
    trades: 3,
    highlighted: true,
    features: [
      "1 metro area",
      "Up to 3 trade filters",
      "Full GC name, phone & email",
      "Enhanced contact enrichment",
      "Full permit history",
      "Weekly email digest",
      "CSV export",
      "Unlimited saved leads",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 499,
    description: "For companies expanding across markets",
    metros: 2,
    trades: 4,
    features: [
      "2 metro areas",
      "Up to 4 trade filters",
      "Full GC name, phone & email",
      "Enhanced contact enrichment",
      "Full permit history",
      "Priority support",
      "Weekly email digest",
      "CSV export",
      "Unlimited saved leads",
    ],
  },
];

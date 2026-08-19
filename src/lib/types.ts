export interface Metro {
  id: string;
  name: string;
  state: string;
  label: string;
}

export const METROS: Metro[] = [
  { id: "chicago", name: "Chicago", state: "IL", label: "Chicago, IL" },
  { id: "austin", name: "Austin", state: "TX", label: "Austin, TX" },
  { id: "sf-bay-area", name: "SF Bay Area", state: "CA", label: "SF Bay Area, CA" },
  { id: "seattle", name: "Seattle", state: "WA", label: "Seattle, WA" },
  { id: "new-york", name: "New York", state: "NY", label: "New York, NY" },
  { id: "philadelphia", name: "Philadelphia", state: "PA", label: "Philadelphia, PA" },
  { id: "boston", name: "Boston", state: "MA", label: "Boston, MA" },
  { id: "los-angeles", name: "Los Angeles", state: "CA", label: "Los Angeles, CA" },
  { id: "nashville", name: "Nashville", state: "TN", label: "Nashville, TN" },
  { id: "san-diego", name: "San Diego", state: "CA", label: "San Diego, CA" },
  { id: "denver", name: "Denver", state: "CO", label: "Denver, CO" },
  { id: "minneapolis", name: "Minneapolis", state: "MN", label: "Minneapolis, MN" },
  { id: "washington-dc", name: "Washington DC", state: "DC", label: "Washington, DC" },
  { id: "portland", name: "Portland", state: "OR", label: "Portland, OR" },
  { id: "orlando", name: "Orlando", state: "FL", label: "Orlando, FL" },
  { id: "columbus", name: "Columbus", state: "OH", label: "Columbus, OH" },
  { id: "fort-worth", name: "Fort Worth", state: "TX", label: "Fort Worth, TX" },
  { id: "las-vegas", name: "Las Vegas", state: "NV", label: "Las Vegas, NV" },
  { id: "phoenix", name: "Phoenix", state: "AZ", label: "Phoenix, AZ" },
  { id: "raleigh", name: "Raleigh", state: "NC", label: "Raleigh, NC" },
  { id: "tampa", name: "Tampa", state: "FL", label: "Tampa, FL" },
  { id: "cincinnati", name: "Cincinnati", state: "OH", label: "Cincinnati, OH" },
  { id: "baton-rouge", name: "Baton Rouge", state: "LA", label: "Baton Rouge, LA" },
  { id: "montgomery-county", name: "Montgomery County", state: "MD", label: "Montgomery County, MD" },
  { id: "mesa", name: "Mesa", state: "AZ", label: "Mesa, AZ" },
  { id: "new-orleans", name: "New Orleans", state: "LA", label: "New Orleans, LA" },
  { id: "kansas-city", name: "Kansas City", state: "MO", label: "Kansas City, MO" },
  { id: "honolulu", name: "Honolulu", state: "HI", label: "Honolulu, HI" },
  { id: "prince-georges", name: "Prince George's County", state: "MD", label: "Prince George's County, MD" },
  { id: "louisville", name: "Louisville", state: "KY", label: "Louisville, KY" },
  { id: "sacramento", name: "Sacramento", state: "CA", label: "Sacramento, CA" },
  { id: "san-antonio", name: "San Antonio", state: "TX", label: "San Antonio, TX" },
  { id: "baltimore", name: "Baltimore", state: "MD", label: "Baltimore, MD" },
  { id: "miami", name: "Miami", state: "FL", label: "Miami, FL" },
  { id: "charlotte", name: "Charlotte", state: "NC", label: "Charlotte, NC" },
  { id: "detroit", name: "Detroit", state: "MI", label: "Detroit, MI" },
  { id: "tucson", name: "Tucson", state: "AZ", label: "Tucson, AZ" },
  { id: "atlanta", name: "Atlanta", state: "GA", label: "Atlanta, GA" },
  { id: "milwaukee", name: "Milwaukee", state: "WI", label: "Milwaukee, WI" },
  { id: "albuquerque", name: "Albuquerque", state: "NM", label: "Albuquerque, NM" },
  { id: "virginia-beach", name: "Virginia Beach", state: "VA", label: "Virginia Beach, VA" },
  { id: "el-paso", name: "El Paso", state: "TX", label: "El Paso, TX" },
  { id: "memphis", name: "Memphis", state: "TN", label: "Memphis, TN" },
  { id: "pittsburgh", name: "Pittsburgh", state: "PA", label: "Pittsburgh, PA" },
  { id: "durham", name: "Durham", state: "NC", label: "Durham, NC" },
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

export const PERMIT_STATUSES: PermitStatus[] = [
  "Issued",
  "Under Review",
  "Approved",
  "Completed",
];

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

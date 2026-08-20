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
  { id: "buffalo", name: "Buffalo", state: "NY", label: "Buffalo, NY" },
  { id: "wichita", name: "Wichita", state: "KS", label: "Wichita, KS" },
  { id: "spokane", name: "Spokane", state: "WA", label: "Spokane, WA" },
  { id: "charleston", name: "Charleston", state: "SC", label: "Charleston, SC" },
  { id: "hartford", name: "Hartford", state: "CT", label: "Hartford, CT" },
  { id: "cleveland", name: "Cleveland", state: "OH", label: "Cleveland, OH" },
  { id: "colorado-springs", name: "Colorado Springs", state: "CO", label: "Colorado Springs, CO" },
  { id: "boise", name: "Boise", state: "ID", label: "Boise, ID" },
  { id: "greensboro", name: "Greensboro", state: "NC", label: "Greensboro, NC" },
  { id: "jacksonville", name: "Jacksonville", state: "FL", label: "Jacksonville, FL" },
  { id: "anaheim", name: "Anaheim", state: "CA", label: "Anaheim, CA" },
  { id: "st-petersburg", name: "St. Petersburg", state: "FL", label: "St. Petersburg, FL" },
  { id: "aurora", name: "Aurora", state: "CO", label: "Aurora, CO" },
  { id: "chattanooga", name: "Chattanooga", state: "TN", label: "Chattanooga, TN" },
  { id: "knoxville", name: "Knoxville", state: "TN", label: "Knoxville, TN" },
  { id: "lincoln", name: "Lincoln", state: "NE", label: "Lincoln, NE" },
  { id: "henderson", name: "Henderson", state: "NV", label: "Henderson, NV" },
  { id: "scottsdale", name: "Scottsdale", state: "AZ", label: "Scottsdale, AZ" },
  { id: "gilbert", name: "Gilbert", state: "AZ", label: "Gilbert, AZ" },
  { id: "chandler", name: "Chandler", state: "AZ", label: "Chandler, AZ" },
  { id: "tempe", name: "Tempe", state: "AZ", label: "Tempe, AZ" },
  { id: "tallahassee", name: "Tallahassee", state: "FL", label: "Tallahassee, FL" },
  { id: "fort-lauderdale", name: "Fort Lauderdale", state: "FL", label: "Fort Lauderdale, FL" },
  { id: "overland-park", name: "Overland Park", state: "KS", label: "Overland Park, KS" },
  { id: "frisco", name: "Frisco", state: "TX", label: "Frisco, TX" },
  { id: "tacoma", name: "Tacoma", state: "WA", label: "Tacoma, WA" },
  { id: "norfolk", name: "Norfolk", state: "VA", label: "Norfolk, VA" },
  { id: "savannah", name: "Savannah", state: "GA", label: "Savannah, GA" },
  { id: "cary", name: "Cary", state: "NC", label: "Cary, NC" },
  { id: "peoria", name: "Peoria", state: "AZ", label: "Peoria, AZ" },
  { id: "salt-lake-city", name: "Salt Lake City", state: "UT", label: "Salt Lake City, UT" },
  { id: "sioux-falls", name: "Sioux Falls", state: "SD", label: "Sioux Falls, SD" },
  { id: "wilmington", name: "Wilmington", state: "NC", label: "Wilmington, NC" },
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
  plan: "free" | "paid";
  trialEndsAt: string | null;
  savedLeadsCount: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
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
    id: "paid",
    name: "Paid",
    price: 79,
    description: "Full access to win more work",
    highlighted: true,
    features: [
      "Full GC name, phone & email",
      "Unlimited saved leads",
      "All metros & trades",
      "Weekly email digest",
      "CSV export",
    ],
  },
];

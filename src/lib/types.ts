export interface Metro {
  id: string;
  name: string;
  state: string;
  label: string;
}

export const METROS: Metro[] = [
  { id: "albuquerque", name: "Albuquerque", state: "NM", label: "Albuquerque, NM" },
  { id: "alexandria", name: "Alexandria", state: "VA", label: "Alexandria, VA" },
  { id: "alpharetta", name: "Alpharetta", state: "GA", label: "Alpharetta, GA" },
  { id: "altamonte-springs", name: "Altamonte Springs", state: "FL", label: "Altamonte Springs, FL" },
  { id: "anaheim", name: "Anaheim", state: "CA", label: "Anaheim, CA" },
  { id: "apopka", name: "Apopka", state: "FL", label: "Apopka, FL" },
  { id: "arlington-heights", name: "Arlington Heights", state: "IL", label: "Arlington Heights, IL" },
  { id: "arlington-tx", name: "Arlington", state: "TX", label: "Arlington, TX" },
  { id: "arlington-va", name: "Arlington", state: "VA", label: "Arlington, VA" },
  { id: "arvada", name: "Arvada", state: "CO", label: "Arvada, CO" },
  { id: "atlanta", name: "Atlanta", state: "GA", label: "Atlanta, GA" },
  { id: "auburn", name: "Auburn", state: "WA", label: "Auburn, WA" },
  { id: "aurora", name: "Aurora", state: "CO", label: "Aurora, CO" },
  { id: "austin", name: "Austin", state: "TX", label: "Austin, TX" },
  { id: "baltimore", name: "Baltimore", state: "MD", label: "Baltimore, MD" },
  { id: "baton-rouge", name: "Baton Rouge", state: "LA", label: "Baton Rouge, LA" },
  { id: "baytown", name: "Baytown", state: "TX", label: "Baytown, TX" },
  { id: "beaverton", name: "Beaverton", state: "OR", label: "Beaverton, OR" },
  { id: "bellevue", name: "Bellevue", state: "WA", label: "Bellevue, WA" },
  { id: "berkeley", name: "Berkeley", state: "CA", label: "Berkeley, CA" },
  { id: "bethesda", name: "Bethesda", state: "MD", label: "Bethesda, MD" },
  { id: "bloomington", name: "Bloomington", state: "MN", label: "Bloomington, MN" },
  { id: "boca-raton", name: "Boca Raton", state: "FL", label: "Boca Raton, FL" },
  { id: "boise", name: "Boise", state: "ID", label: "Boise, ID" },
  { id: "boston", name: "Boston", state: "MA", label: "Boston, MA" },
  { id: "bothell", name: "Bothell", state: "WA", label: "Bothell, WA" },
  { id: "boulder", name: "Boulder", state: "CO", label: "Boulder, CO" },
  { id: "brandon", name: "Brandon", state: "FL", label: "Brandon, FL" },
  { id: "brooklyn-park", name: "Brooklyn Park", state: "MN", label: "Brooklyn Park, MN" },
  { id: "brookline", name: "Brookline", state: "MA", label: "Brookline, MA" },
  { id: "broomfield", name: "Broomfield", state: "CO", label: "Broomfield, CO" },
  { id: "buffalo", name: "Buffalo", state: "NY", label: "Buffalo, NY" },
  { id: "burbank", name: "Burbank", state: "CA", label: "Burbank, CA" },
  { id: "cambridge", name: "Cambridge", state: "MA", label: "Cambridge, MA" },
  { id: "carlsbad", name: "Carlsbad", state: "CA", label: "Carlsbad, CA" },
  { id: "cary", name: "Cary", state: "NC", label: "Cary, NC" },
  { id: "centennial", name: "Centennial", state: "CO", label: "Centennial, CO" },
  { id: "chandler", name: "Chandler", state: "AZ", label: "Chandler, AZ" },
  { id: "charleston", name: "Charleston", state: "SC", label: "Charleston, SC" },
  { id: "charlotte", name: "Charlotte", state: "NC", label: "Charlotte, NC" },
  { id: "chattanooga", name: "Chattanooga", state: "TN", label: "Chattanooga, TN" },
  { id: "chicago", name: "Chicago", state: "IL", label: "Chicago, IL" },
  { id: "chula-vista", name: "Chula Vista", state: "CA", label: "Chula Vista, CA" },
  { id: "cicero", name: "Cicero", state: "IL", label: "Cicero, IL" },
  { id: "cincinnati", name: "Cincinnati", state: "OH", label: "Cincinnati, OH" },
  { id: "clearwater", name: "Clearwater", state: "FL", label: "Clearwater, FL" },
  { id: "cleveland", name: "Cleveland", state: "OH", label: "Cleveland, OH" },
  { id: "colorado-springs", name: "Colorado Springs", state: "CO", label: "Colorado Springs, CO" },
  { id: "columbus", name: "Columbus", state: "OH", label: "Columbus, OH" },
  { id: "concord", name: "Concord", state: "CA", label: "Concord, CA" },
  { id: "conroe", name: "Conroe", state: "TX", label: "Conroe, TX" },
  { id: "coral-springs", name: "Coral Springs", state: "FL", label: "Coral Springs, FL" },
  { id: "daly-city", name: "Daly City", state: "CA", label: "Daly City, CA" },
  { id: "dallas", name: "Dallas", state: "TX", label: "Dallas, TX" },
  { id: "decatur", name: "Decatur", state: "GA", label: "Decatur, GA" },
  { id: "deerfield-beach", name: "Deerfield Beach", state: "FL", label: "Deerfield Beach, FL" },
  { id: "denton", name: "Denton", state: "TX", label: "Denton, TX" },
  { id: "denver", name: "Denver", state: "CO", label: "Denver, CO" },
  { id: "detroit", name: "Detroit", state: "MI", label: "Detroit, MI" },
  { id: "downey", name: "Downey", state: "CA", label: "Downey, CA" },
  { id: "dunwoody", name: "Dunwoody", state: "GA", label: "Dunwoody, GA" },
  { id: "durham", name: "Durham", state: "NC", label: "Durham, NC" },
  { id: "eagan", name: "Eagan", state: "MN", label: "Eagan, MN" },
  { id: "el-cajon", name: "El Cajon", state: "CA", label: "El Cajon, CA" },
  { id: "el-monte", name: "El Monte", state: "CA", label: "El Monte, CA" },
  { id: "el-paso", name: "El Paso", state: "TX", label: "El Paso, TX" },
  { id: "elgin", name: "Elgin", state: "IL", label: "Elgin, IL" },
  { id: "elizabeth", name: "Elizabeth", state: "NJ", label: "Elizabeth, NJ" },
  { id: "enterprise", name: "Enterprise", state: "NV", label: "Enterprise, NV" },
  { id: "escondido", name: "Escondido", state: "CA", label: "Escondido, CA" },
  { id: "evanston", name: "Evanston", state: "IL", label: "Evanston, IL" },
  { id: "everett", name: "Everett", state: "WA", label: "Everett, WA" },
  { id: "fairfax", name: "Fairfax", state: "VA", label: "Fairfax, VA" },
  { id: "federal-way", name: "Federal Way", state: "WA", label: "Federal Way, WA" },
  { id: "fort-lauderdale", name: "Fort Lauderdale", state: "FL", label: "Fort Lauderdale, FL" },
  { id: "fort-worth", name: "Fort Worth", state: "TX", label: "Fort Worth, TX" },
  { id: "franklin", name: "Franklin", state: "TN", label: "Franklin, TN" },
  { id: "fremont", name: "Fremont", state: "CA", label: "Fremont, CA" },
  { id: "frisco", name: "Frisco", state: "TX", label: "Frisco, TX" },
  { id: "gallatin", name: "Gallatin", state: "TN", label: "Gallatin, TN" },
  { id: "garland", name: "Garland", state: "TX", label: "Garland, TX" },
  { id: "gilbert", name: "Gilbert", state: "AZ", label: "Gilbert, AZ" },
  { id: "glendale", name: "Glendale", state: "CA", label: "Glendale, CA" },
  { id: "glendale-az", name: "Glendale", state: "AZ", label: "Glendale, AZ" },
  { id: "goodyear", name: "Goodyear", state: "AZ", label: "Goodyear, AZ" },
  { id: "greensboro", name: "Greensboro", state: "NC", label: "Greensboro, NC" },
  { id: "gresham", name: "Gresham", state: "OR", label: "Gresham, OR" },
  { id: "hartford", name: "Hartford", state: "CT", label: "Hartford, CT" },
  { id: "hayward", name: "Hayward", state: "CA", label: "Hayward, CA" },
  { id: "henderson", name: "Henderson", state: "NV", label: "Henderson, NV" },
  { id: "hendersonville", name: "Hendersonville", state: "TN", label: "Hendersonville, TN" },
  { id: "hialeah", name: "Hialeah", state: "FL", label: "Hialeah, FL" },
  { id: "hillsboro", name: "Hillsboro", state: "OR", label: "Hillsboro, OR" },
  { id: "hoboken", name: "Hoboken", state: "NJ", label: "Hoboken, NJ" },
  { id: "hollywood-fl", name: "Hollywood", state: "FL", label: "Hollywood, FL" },
  { id: "honolulu", name: "Honolulu", state: "HI", label: "Honolulu, HI" },
  { id: "houston", name: "Houston", state: "TX", label: "Houston, TX" },
  { id: "inglewood", name: "Inglewood", state: "CA", label: "Inglewood, CA" },
  { id: "irving", name: "Irving", state: "TX", label: "Irving, TX" },
  { id: "jacksonville", name: "Jacksonville", state: "FL", label: "Jacksonville, FL" },
  { id: "jersey-city", name: "Jersey City", state: "NJ", label: "Jersey City, NJ" },
  { id: "johns-creek", name: "Johns Creek", state: "GA", label: "Johns Creek, GA" },
  { id: "joliet", name: "Joliet", state: "IL", label: "Joliet, IL" },
  { id: "kansas-city", name: "Kansas City", state: "MO", label: "Kansas City, MO" },
  { id: "kennesaw", name: "Kennesaw", state: "GA", label: "Kennesaw, GA" },
  { id: "kent", name: "Kent", state: "WA", label: "Kent, WA" },
  { id: "kirkland", name: "Kirkland", state: "WA", label: "Kirkland, WA" },
  { id: "kissimmee", name: "Kissimmee", state: "FL", label: "Kissimmee, FL" },
  { id: "knoxville", name: "Knoxville", state: "TN", label: "Knoxville, TN" },
  { id: "lake-oswego", name: "Lake Oswego", state: "OR", label: "Lake Oswego, OR" },
  { id: "lakewood", name: "Lakewood", state: "CO", label: "Lakewood, CO" },
  { id: "largo", name: "Largo", state: "FL", label: "Largo, FL" },
  { id: "las-vegas", name: "Las Vegas", state: "NV", label: "Las Vegas, NV" },
  { id: "league-city", name: "League City", state: "TX", label: "League City, TX" },
  { id: "lebanon", name: "Lebanon", state: "TN", label: "Lebanon, TN" },
  { id: "lincoln", name: "Lincoln", state: "NE", label: "Lincoln, NE" },
  { id: "long-beach", name: "Long Beach", state: "CA", label: "Long Beach, CA" },
  { id: "longmont", name: "Longmont", state: "CO", label: "Longmont, CO" },
  { id: "los-angeles", name: "Los Angeles", state: "CA", label: "Los Angeles, CA" },
  { id: "louisville", name: "Louisville", state: "KY", label: "Louisville, KY" },
  { id: "malden", name: "Malden", state: "MA", label: "Malden, MA" },
  { id: "maple-grove", name: "Maple Grove", state: "MN", label: "Maple Grove, MN" },
  { id: "marietta", name: "Marietta", state: "GA", label: "Marietta, GA" },
  { id: "mckinney", name: "McKinney", state: "TX", label: "McKinney, TX" },
  { id: "medford", name: "Medford", state: "MA", label: "Medford, MA" },
  { id: "memphis", name: "Memphis", state: "TN", label: "Memphis, TN" },
  { id: "mesa", name: "Mesa", state: "AZ", label: "Mesa, AZ" },
  { id: "miami", name: "Miami", state: "FL", label: "Miami, FL" },
  { id: "milwaukee", name: "Milwaukee", state: "WI", label: "Milwaukee, WI" },
  { id: "minneapolis", name: "Minneapolis", state: "MN", label: "Minneapolis, MN" },
  { id: "missouri-city", name: "Missouri City", state: "TX", label: "Missouri City, TX" },
  { id: "mountain-view", name: "Mountain View", state: "CA", label: "Mountain View, CA" },
  { id: "mt-juliet", name: "Mt. Juliet", state: "TN", label: "Mt. Juliet, TN" },
  { id: "murfreesboro", name: "Murfreesboro", state: "TN", label: "Murfreesboro, TN" },
  { id: "naperville", name: "Naperville", state: "IL", label: "Naperville, IL" },
  { id: "nashville", name: "Nashville", state: "TN", label: "Nashville, TN" },
  { id: "new-orleans", name: "New Orleans", state: "LA", label: "New Orleans, LA" },
  { id: "new-rochelle", name: "New Rochelle", state: "NY", label: "New Rochelle, NY" },
  { id: "new-york", name: "New York", state: "NY", label: "New York, NY" },
  { id: "newark", name: "Newark", state: "NJ", label: "Newark, NJ" },
  { id: "newton", name: "Newton", state: "MA", label: "Newton, MA" },
  { id: "norfolk", name: "Norfolk", state: "VA", label: "Norfolk, VA" },
  { id: "north-las-vegas", name: "North Las Vegas", state: "NV", label: "North Las Vegas, NV" },
  { id: "norwalk", name: "Norwalk", state: "CA", label: "Norwalk, CA" },
  { id: "oak-park", name: "Oak Park", state: "IL", label: "Oak Park, IL" },
  { id: "oakland", name: "Oakland", state: "CA", label: "Oakland, CA" },
  { id: "oceanside", name: "Oceanside", state: "CA", label: "Oceanside, CA" },
  { id: "ocoee", name: "Ocoee", state: "FL", label: "Ocoee, FL" },
  { id: "oregon-city", name: "Oregon City", state: "OR", label: "Oregon City, OR" },
  { id: "orlando", name: "Orlando", state: "FL", label: "Orlando, FL" },
  { id: "overland-park", name: "Overland Park", state: "KS", label: "Overland Park, KS" },
  { id: "palm-harbor", name: "Palm Harbor", state: "FL", label: "Palm Harbor, FL" },
  { id: "palo-alto", name: "Palo Alto", state: "CA", label: "Palo Alto, CA" },
  { id: "paradise", name: "Paradise", state: "NV", label: "Paradise, NV" },
  { id: "pasadena", name: "Pasadena", state: "CA", label: "Pasadena, CA" },
  { id: "pasadena-tx", name: "Pasadena", state: "TX", label: "Pasadena, TX" },
  { id: "paterson", name: "Paterson", state: "NJ", label: "Paterson, NJ" },
  { id: "pearland", name: "Pearland", state: "TX", label: "Pearland, TX" },
  { id: "pembroke-pines", name: "Pembroke Pines", state: "FL", label: "Pembroke Pines, FL" },
  { id: "peoria", name: "Peoria", state: "AZ", label: "Peoria, AZ" },
  { id: "philadelphia", name: "Philadelphia", state: "PA", label: "Philadelphia, PA" },
  { id: "phoenix", name: "Phoenix", state: "AZ", label: "Phoenix, AZ" },
  { id: "pittsburgh", name: "Pittsburgh", state: "PA", label: "Pittsburgh, PA" },
  { id: "plano", name: "Plano", state: "TX", label: "Plano, TX" },
  { id: "pleasanton", name: "Pleasanton", state: "CA", label: "Pleasanton, CA" },
  { id: "plymouth", name: "Plymouth", state: "MN", label: "Plymouth, MN" },
  { id: "pomona", name: "Pomona", state: "CA", label: "Pomona, CA" },
  { id: "portland", name: "Portland", state: "OR", label: "Portland, OR" },
  { id: "quincy", name: "Quincy", state: "MA", label: "Quincy, MA" },
  { id: "raleigh", name: "Raleigh", state: "NC", label: "Raleigh, NC" },
  { id: "redmond", name: "Redmond", state: "WA", label: "Redmond, WA" },
  { id: "redwood-city", name: "Redwood City", state: "CA", label: "Redwood City, CA" },
  { id: "renton", name: "Renton", state: "WA", label: "Renton, WA" },
  { id: "reston", name: "Reston", state: "VA", label: "Reston, VA" },
  { id: "richardson", name: "Richardson", state: "TX", label: "Richardson, TX" },
  { id: "richmond", name: "Richmond", state: "CA", label: "Richmond, CA" },
  { id: "riverview", name: "Riverview", state: "FL", label: "Riverview, FL" },
  { id: "rockville", name: "Rockville", state: "MD", label: "Rockville, MD" },
  { id: "roswell", name: "Roswell", state: "GA", label: "Roswell, GA" },
  { id: "sacramento", name: "Sacramento", state: "CA", label: "Sacramento, CA" },
  { id: "salt-lake-city", name: "Salt Lake City", state: "UT", label: "Salt Lake City, UT" },
  { id: "san-antonio", name: "San Antonio", state: "TX", label: "San Antonio, TX" },
  { id: "san-diego", name: "San Diego", state: "CA", label: "San Diego, CA" },
  { id: "san-francisco", name: "San Francisco", state: "CA", label: "San Francisco, CA" },
  { id: "san-jose", name: "San Jose", state: "CA", label: "San Jose, CA" },
  { id: "san-marcos", name: "San Marcos", state: "CA", label: "San Marcos, CA" },
  { id: "san-mateo", name: "San Mateo", state: "CA", label: "San Mateo, CA" },
  { id: "san-ramon", name: "San Ramon", state: "CA", label: "San Ramon, CA" },
  { id: "sandy-springs", name: "Sandy Springs", state: "GA", label: "Sandy Springs, GA" },
  { id: "sanford", name: "Sanford", state: "FL", label: "Sanford, FL" },
  { id: "santa-clara", name: "Santa Clara", state: "CA", label: "Santa Clara, CA" },
  { id: "santa-monica", name: "Santa Monica", state: "CA", label: "Santa Monica, CA" },
  { id: "savannah", name: "Savannah", state: "GA", label: "Savannah, GA" },
  { id: "schaumburg", name: "Schaumburg", state: "IL", label: "Schaumburg, IL" },
  { id: "scottsdale", name: "Scottsdale", state: "AZ", label: "Scottsdale, AZ" },
  { id: "seattle", name: "Seattle", state: "WA", label: "Seattle, WA" },
  { id: "silver-spring", name: "Silver Spring", state: "MD", label: "Silver Spring, MD" },
  { id: "sioux-falls", name: "Sioux Falls", state: "SD", label: "Sioux Falls, SD" },
  { id: "somerville", name: "Somerville", state: "MA", label: "Somerville, MA" },
  { id: "spokane", name: "Spokane", state: "WA", label: "Spokane, WA" },
  { id: "spring-valley", name: "Spring Valley", state: "NV", label: "Spring Valley, NV" },
  { id: "st-paul", name: "St. Paul", state: "MN", label: "St. Paul, MN" },
  { id: "st-petersburg", name: "St. Petersburg", state: "FL", label: "St. Petersburg, FL" },
  { id: "sugar-land", name: "Sugar Land", state: "TX", label: "Sugar Land, TX" },
  { id: "sunnyvale", name: "Sunnyvale", state: "CA", label: "Sunnyvale, CA" },
  { id: "surprise", name: "Surprise", state: "AZ", label: "Surprise, AZ" },
  { id: "tacoma", name: "Tacoma", state: "WA", label: "Tacoma, WA" },
  { id: "tallahassee", name: "Tallahassee", state: "FL", label: "Tallahassee, FL" },
  { id: "tampa", name: "Tampa", state: "FL", label: "Tampa, FL" },
  { id: "tempe", name: "Tempe", state: "AZ", label: "Tempe, AZ" },
  { id: "the-woodlands", name: "The Woodlands", state: "TX", label: "The Woodlands, TX" },
  { id: "thornton", name: "Thornton", state: "CO", label: "Thornton, CO" },
  { id: "tigard", name: "Tigard", state: "OR", label: "Tigard, OR" },
  { id: "torrance", name: "Torrance", state: "CA", label: "Torrance, CA" },
  { id: "tualatin", name: "Tualatin", state: "OR", label: "Tualatin, OR" },
  { id: "tucson", name: "Tucson", state: "AZ", label: "Tucson, AZ" },
  { id: "tysons", name: "Tysons", state: "VA", label: "Tysons, VA" },
  { id: "union-city", name: "Union City", state: "CA", label: "Union City, CA" },
  { id: "virginia-beach", name: "Virginia Beach", state: "VA", label: "Virginia Beach, VA" },
  { id: "vista", name: "Vista", state: "CA", label: "Vista, CA" },
  { id: "walnut-creek", name: "Walnut Creek", state: "CA", label: "Walnut Creek, CA" },
  { id: "waltham", name: "Waltham", state: "MA", label: "Waltham, MA" },
  { id: "washington-dc", name: "Washington", state: "DC", label: "Washington, DC" },
  { id: "west-covina", name: "West Covina", state: "CA", label: "West Covina, CA" },
  { id: "westminster", name: "Westminster", state: "CO", label: "Westminster, CO" },
  { id: "white-plains", name: "White Plains", state: "NY", label: "White Plains, NY" },
  { id: "wichita", name: "Wichita", state: "KS", label: "Wichita, KS" },
  { id: "wilmington", name: "Wilmington", state: "NC", label: "Wilmington, NC" },
  { id: "winter-park", name: "Winter Park", state: "FL", label: "Winter Park, FL" },
  { id: "woodbury", name: "Woodbury", state: "MN", label: "Woodbury, MN" },
  { id: "yonkers", name: "Yonkers", state: "NY", label: "Yonkers, NY" },
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

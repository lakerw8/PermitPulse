/* Hallmark · genre: modern-minimal · module: regions · design-system: design.md · designed-as-app */

/**
 * Regional model for city selection.
 *
 * Contractors work a market, not a municipality. A Dallas mechanical sub cares
 * about Plano, Irving and Frisco as one job radius. This module groups the
 * 241 covered cities into 68 regions so the picker stays scannable
 * as coverage grows, and carries centroids so "near me" can resolve a location
 * to a region without a geocoding round-trip.
 *
 * City coordinates are the same set used by the permit fixtures; region
 * centroids are the mean of their member cities.
 */

import { METROS, type Metro } from "./types";

export interface Region {
  id: string;
  /** Market name a contractor would recognise ("Dallas-Fort Worth", not "dfw"). */
  name: string;
  /** Every state the region touches, e.g. Kansas City spans KS and MO. */
  states: string[];
  lat: number;
  lon: number;
  cityIds: string[];
}

export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "san-francisco": { lat: 37.7749, lon: -122.4194 },
  "oakland": { lat: 37.8044, lon: -122.2712 },
  "berkeley": { lat: 37.8716, lon: -122.2727 },
  "san-jose": { lat: 37.3382, lon: -121.8863 },
  "fremont": { lat: 37.5485, lon: -121.9886 },
  "hayward": { lat: 37.6688, lon: -122.0808 },
  "palo-alto": { lat: 37.4419, lon: -122.143 },
  "redwood-city": { lat: 37.4852, lon: -122.2364 },
  "mountain-view": { lat: 37.3861, lon: -122.0839 },
  "sunnyvale": { lat: 37.3688, lon: -122.0363 },
  "santa-clara": { lat: 37.3541, lon: -121.9552 },
  "walnut-creek": { lat: 37.9101, lon: -122.0652 },
  "concord": { lat: 37.978, lon: -122.0311 },
  "san-mateo": { lat: 37.563, lon: -122.3255 },
  "richmond": { lat: 37.9358, lon: -122.3478 },
  "san-ramon": { lat: 37.7799, lon: -121.978 },
  "union-city": { lat: 37.5934, lon: -122.0439 },
  "pleasanton": { lat: 37.6624, lon: -121.8747 },
  "daly-city": { lat: 37.6879, lon: -122.4702 },
  "los-angeles": { lat: 34.0522, lon: -118.2437 },
  "long-beach": { lat: 33.7701, lon: -118.1937 },
  "glendale": { lat: 34.1425, lon: -118.2551 },
  "pasadena": { lat: 34.1478, lon: -118.1445 },
  "santa-monica": { lat: 34.0195, lon: -118.4912 },
  "burbank": { lat: 34.1808, lon: -118.309 },
  "torrance": { lat: 33.8358, lon: -118.3406 },
  "inglewood": { lat: 33.9617, lon: -118.3531 },
  "pomona": { lat: 34.0551, lon: -117.75 },
  "el-monte": { lat: 34.0686, lon: -118.0276 },
  "downey": { lat: 33.9401, lon: -118.1332 },
  "west-covina": { lat: 34.0686, lon: -117.939 },
  "norwalk": { lat: 33.9022, lon: -118.0818 },
  "anaheim": { lat: 33.8366, lon: -117.9143 },
  "new-york": { lat: 40.7128, lon: -74.006 },
  "yonkers": { lat: 40.9312, lon: -73.8988 },
  "white-plains": { lat: 41.034, lon: -73.7629 },
  "new-rochelle": { lat: 40.9115, lon: -73.7824 },
  "newark": { lat: 40.7357, lon: -74.1724 },
  "jersey-city": { lat: 40.7178, lon: -74.0431 },
  "paterson": { lat: 40.9168, lon: -74.1718 },
  "elizabeth": { lat: 40.664, lon: -74.2107 },
  "hoboken": { lat: 40.744, lon: -74.0324 },
  "chicago": { lat: 41.8781, lon: -87.6298 },
  "evanston": { lat: 42.0451, lon: -87.6878 },
  "naperville": { lat: 41.7508, lon: -88.1535 },
  "joliet": { lat: 41.525, lon: -88.0817 },
  "schaumburg": { lat: 42.0334, lon: -88.0834 },
  "arlington-heights": { lat: 42.0884, lon: -87.9806 },
  "oak-park": { lat: 41.885, lon: -87.7845 },
  "cicero": { lat: 41.8456, lon: -87.7539 },
  "elgin": { lat: 42.0354, lon: -88.2826 },
  "dallas": { lat: 32.7767, lon: -96.797 },
  "fort-worth": { lat: 32.7555, lon: -97.3308 },
  "arlington-tx": { lat: 32.7357, lon: -97.1081 },
  "plano": { lat: 33.0198, lon: -96.6989 },
  "irving": { lat: 32.814, lon: -96.9489 },
  "garland": { lat: 32.9126, lon: -96.6389 },
  "mckinney": { lat: 33.1972, lon: -96.6397 },
  "denton": { lat: 33.2148, lon: -97.1331 },
  "richardson": { lat: 32.9483, lon: -96.7299 },
  "frisco": { lat: 33.1507, lon: -96.8236 },
  "houston": { lat: 29.7604, lon: -95.3698 },
  "sugar-land": { lat: 29.6197, lon: -95.6349 },
  "pasadena-tx": { lat: 29.6911, lon: -95.2091 },
  "pearland": { lat: 29.5636, lon: -95.286 },
  "the-woodlands": { lat: 30.1658, lon: -95.4613 },
  "league-city": { lat: 29.5075, lon: -95.095 },
  "missouri-city": { lat: 29.6186, lon: -95.5377 },
  "baytown": { lat: 29.7355, lon: -94.9774 },
  "conroe": { lat: 30.3119, lon: -95.456 },
  "washington-dc": { lat: 38.9072, lon: -77.0369 },
  "arlington-va": { lat: 38.8799, lon: -77.1068 },
  "alexandria": { lat: 38.8048, lon: -77.0469 },
  "silver-spring": { lat: 38.9907, lon: -77.0261 },
  "bethesda": { lat: 38.9847, lon: -77.0947 },
  "fairfax": { lat: 38.8462, lon: -77.3064 },
  "reston": { lat: 38.9687, lon: -77.3411 },
  "rockville": { lat: 39.084, lon: -77.1528 },
  "tysons": { lat: 38.9187, lon: -77.2311 },
  "seattle": { lat: 47.6062, lon: -122.3321 },
  "bellevue": { lat: 47.6101, lon: -122.2015 },
  "tacoma": { lat: 47.2529, lon: -122.4443 },
  "redmond": { lat: 47.674, lon: -122.1215 },
  "kent": { lat: 47.3809, lon: -122.2348 },
  "renton": { lat: 47.4829, lon: -122.2171 },
  "federal-way": { lat: 47.3223, lon: -122.3126 },
  "kirkland": { lat: 47.6815, lon: -122.2087 },
  "auburn": { lat: 47.3073, lon: -122.2285 },
  "bothell": { lat: 47.7601, lon: -122.2054 },
  "everett": { lat: 47.979, lon: -122.2021 },
  "miami": { lat: 25.7617, lon: -80.1918 },
  "fort-lauderdale": { lat: 26.1224, lon: -80.1373 },
  "hialeah": { lat: 25.8576, lon: -80.2781 },
  "hollywood-fl": { lat: 26.0112, lon: -80.1495 },
  "coral-springs": { lat: 26.2712, lon: -80.2706 },
  "pembroke-pines": { lat: 26.0031, lon: -80.2241 },
  "boca-raton": { lat: 26.3587, lon: -80.0831 },
  "deerfield-beach": { lat: 26.3185, lon: -80.0998 },
  "phoenix": { lat: 33.4484, lon: -112.074 },
  "mesa": { lat: 33.4152, lon: -111.8315 },
  "scottsdale": { lat: 33.4942, lon: -111.9261 },
  "chandler": { lat: 33.3062, lon: -111.8413 },
  "gilbert": { lat: 33.3528, lon: -111.789 },
  "tempe": { lat: 33.4255, lon: -111.94 },
  "peoria": { lat: 33.5806, lon: -112.2374 },
  "glendale-az": { lat: 33.5387, lon: -112.186 },
  "surprise": { lat: 33.6292, lon: -112.368 },
  "goodyear": { lat: 33.4353, lon: -112.3585 },
  "denver": { lat: 39.7392, lon: -104.9903 },
  "aurora": { lat: 39.7294, lon: -104.8319 },
  "lakewood": { lat: 39.7047, lon: -105.0814 },
  "westminster": { lat: 39.8367, lon: -105.0372 },
  "arvada": { lat: 39.8028, lon: -105.0875 },
  "thornton": { lat: 39.868, lon: -104.9719 },
  "centennial": { lat: 39.5791, lon: -104.8769 },
  "boulder": { lat: 40.015, lon: -105.2705 },
  "longmont": { lat: 40.1672, lon: -105.1019 },
  "broomfield": { lat: 39.9205, lon: -105.0867 },
  "atlanta": { lat: 33.749, lon: -84.388 },
  "marietta": { lat: 33.9526, lon: -84.5499 },
  "roswell": { lat: 34.0232, lon: -84.3616 },
  "sandy-springs": { lat: 33.9304, lon: -84.3733 },
  "alpharetta": { lat: 34.0754, lon: -84.2941 },
  "johns-creek": { lat: 34.0289, lon: -84.1988 },
  "kennesaw": { lat: 34.0234, lon: -84.6155 },
  "decatur": { lat: 33.7748, lon: -84.2963 },
  "dunwoody": { lat: 33.9462, lon: -84.3346 },
  "boston": { lat: 42.3601, lon: -71.0589 },
  "cambridge": { lat: 42.3736, lon: -71.1097 },
  "somerville": { lat: 42.3876, lon: -71.0995 },
  "quincy": { lat: 42.2529, lon: -71.0023 },
  "brookline": { lat: 42.3318, lon: -71.1212 },
  "newton": { lat: 42.337, lon: -71.2092 },
  "waltham": { lat: 42.3765, lon: -71.2356 },
  "malden": { lat: 42.4251, lon: -71.0662 },
  "medford": { lat: 42.4184, lon: -71.1062 },
  "minneapolis": { lat: 44.9778, lon: -93.265 },
  "st-paul": { lat: 44.9537, lon: -93.09 },
  "bloomington": { lat: 44.8408, lon: -93.2983 },
  "plymouth": { lat: 45.0105, lon: -93.4555 },
  "brooklyn-park": { lat: 45.0941, lon: -93.3563 },
  "eagan": { lat: 44.8041, lon: -93.1669 },
  "woodbury": { lat: 44.9239, lon: -92.9594 },
  "maple-grove": { lat: 45.0725, lon: -93.4558 },
  "portland": { lat: 45.5152, lon: -122.6784 },
  "beaverton": { lat: 45.4871, lon: -122.8037 },
  "hillsboro": { lat: 45.5229, lon: -122.9898 },
  "gresham": { lat: 45.5023, lon: -122.431 },
  "lake-oswego": { lat: 45.4207, lon: -122.6706 },
  "tigard": { lat: 45.4312, lon: -122.7715 },
  "tualatin": { lat: 45.3838, lon: -122.7637 },
  "oregon-city": { lat: 45.3573, lon: -122.6068 },
  "las-vegas": { lat: 36.1699, lon: -115.1398 },
  "henderson": { lat: 36.0395, lon: -114.9817 },
  "north-las-vegas": { lat: 36.1989, lon: -115.1175 },
  "spring-valley": { lat: 36.1028, lon: -115.245 },
  "paradise": { lat: 36.097, lon: -115.1467 },
  "enterprise": { lat: 36.0268, lon: -115.2176 },
  "san-diego": { lat: 32.7157, lon: -117.1611 },
  "chula-vista": { lat: 32.6401, lon: -117.0842 },
  "oceanside": { lat: 33.1959, lon: -117.3795 },
  "escondido": { lat: 33.1192, lon: -117.0864 },
  "carlsbad": { lat: 33.1581, lon: -117.3506 },
  "el-cajon": { lat: 32.7948, lon: -116.9625 },
  "vista": { lat: 33.2, lon: -117.2426 },
  "san-marcos": { lat: 33.1434, lon: -117.1661 },
  "tampa": { lat: 27.9506, lon: -82.4572 },
  "st-petersburg": { lat: 27.7676, lon: -82.6403 },
  "clearwater": { lat: 27.9659, lon: -82.8001 },
  "brandon": { lat: 27.9378, lon: -82.2859 },
  "largo": { lat: 27.9095, lon: -82.7873 },
  "palm-harbor": { lat: 28.0781, lon: -82.7637 },
  "riverview": { lat: 27.8764, lon: -82.3265 },
  "orlando": { lat: 28.5383, lon: -81.3792 },
  "kissimmee": { lat: 28.292, lon: -81.4076 },
  "sanford": { lat: 28.8003, lon: -81.2698 },
  "altamonte-springs": { lat: 28.6611, lon: -81.3656 },
  "winter-park": { lat: 28.5993, lon: -81.3393 },
  "ocoee": { lat: 28.5692, lon: -81.544 },
  "apopka": { lat: 28.6934, lon: -81.5322 },
  "nashville": { lat: 36.1627, lon: -86.7816 },
  "franklin": { lat: 35.9251, lon: -86.8689 },
  "murfreesboro": { lat: 35.8456, lon: -86.3903 },
  "hendersonville": { lat: 36.3048, lon: -86.62 },
  "gallatin": { lat: 36.3887, lon: -86.4467 },
  "lebanon": { lat: 36.2081, lon: -86.2911 },
  "mt-juliet": { lat: 36.2001, lon: -86.5186 },
  "austin": { lat: 30.2672, lon: -97.7431 },
  "philadelphia": { lat: 39.9526, lon: -75.1652 },
  "columbus": { lat: 39.9612, lon: -82.9988 },
  "raleigh": { lat: 35.7796, lon: -78.6382 },
  "cincinnati": { lat: 39.1031, lon: -84.512 },
  "baton-rouge": { lat: 30.4515, lon: -91.1871 },
  "new-orleans": { lat: 29.9511, lon: -90.0715 },
  "kansas-city": { lat: 39.0997, lon: -94.5786 },
  "honolulu": { lat: 21.3069, lon: -157.8583 },
  "louisville": { lat: 38.2527, lon: -85.7585 },
  "sacramento": { lat: 38.5816, lon: -121.4944 },
  "san-antonio": { lat: 29.4241, lon: -98.4936 },
  "baltimore": { lat: 39.2904, lon: -76.6122 },
  "charlotte": { lat: 35.2271, lon: -80.8431 },
  "detroit": { lat: 42.3314, lon: -83.0458 },
  "tucson": { lat: 32.2226, lon: -110.9747 },
  "milwaukee": { lat: 43.0389, lon: -87.9065 },
  "albuquerque": { lat: 35.0844, lon: -106.6504 },
  "virginia-beach": { lat: 36.8529, lon: -75.978 },
  "el-paso": { lat: 31.7619, lon: -106.485 },
  "memphis": { lat: 35.1495, lon: -90.049 },
  "pittsburgh": { lat: 40.4406, lon: -79.9959 },
  "durham": { lat: 35.994, lon: -78.8986 },
  "buffalo": { lat: 42.8864, lon: -78.8784 },
  "wichita": { lat: 37.6872, lon: -97.3301 },
  "spokane": { lat: 47.6588, lon: -117.426 },
  "charleston": { lat: 32.7765, lon: -79.9311 },
  "hartford": { lat: 41.7658, lon: -72.6734 },
  "cleveland": { lat: 41.4993, lon: -81.6944 },
  "colorado-springs": { lat: 38.8339, lon: -104.8214 },
  "boise": { lat: 43.615, lon: -116.2023 },
  "greensboro": { lat: 36.0726, lon: -79.792 },
  "jacksonville": { lat: 30.3322, lon: -81.6557 },
  "chattanooga": { lat: 35.0456, lon: -85.3097 },
  "knoxville": { lat: 35.9606, lon: -83.9207 },
  "lincoln": { lat: 40.8136, lon: -96.7026 },
  "tallahassee": { lat: 30.4383, lon: -84.2807 },
  "overland-park": { lat: 38.9822, lon: -94.6708 },
  "norfolk": { lat: 36.8508, lon: -76.2859 },
  "savannah": { lat: 32.0809, lon: -81.0912 },
  "cary": { lat: 35.7915, lon: -78.7811 },
  "salt-lake-city": { lat: 40.7608, lon: -111.891 },
  "sioux-falls": { lat: 43.546, lon: -96.7313 },
  "wilmington": { lat: 34.2257, lon: -77.9447 },
  "cape-coral": { lat: 26.5629, lon: -81.9495 },
  "corona-ca": { lat: 33.8753, lon: -117.5664 },
  "gainesville-fl": { lat: 29.6516, lon: -82.3248 },
  "laredo": { lat: 27.5306, lon: -99.4803 },
  "midland": { lat: 31.9973, lon: -102.0779 },
  "omaha": { lat: 41.2565, lon: -95.9345 },
  "palm-bay": { lat: 28.0345, lon: -80.5887 },
  "rockford": { lat: 42.2711, lon: -89.094 },
  "salem-or": { lat: 44.9429, lon: -123.0351 },
  "san-marcos-tx": { lat: 29.8833, lon: -97.9414 },
};

export const REGIONS: Region[] = [
  {
    id: "bay-area",
    name: "Bay Area",
    states: ["CA"],
    lat: 37.6396,
    lon: -122.1321,
    cityIds: ["berkeley", "concord", "daly-city", "fremont", "hayward", "mountain-view", "oakland", "palo-alto", "pleasanton", "redwood-city", "richmond", "san-francisco", "san-jose", "san-mateo", "san-ramon", "santa-clara", "sunnyvale", "union-city", "walnut-creek"],
  },
  {
    id: "chicago",
    name: "Chicagoland",
    states: ["IL"],
    lat: 41.8985,
    lon: -87.9375,
    cityIds: ["arlington-heights", "chicago", "cicero", "elgin", "evanston", "joliet", "naperville", "oak-park", "schaumburg"],
  },
  {
    id: "dfw",
    name: "Dallas-Fort Worth",
    states: ["TX"],
    lat: 32.9525,
    lon: -96.8849,
    cityIds: ["arlington-tx", "dallas", "denton", "fort-worth", "frisco", "garland", "irving", "mckinney", "plano", "richardson"],
  },
  {
    id: "denver",
    name: "Denver Front Range",
    states: ["CO"],
    lat: 39.8363,
    lon: -105.0336,
    cityIds: ["arvada", "aurora", "boulder", "broomfield", "centennial", "denver", "lakewood", "longmont", "thornton", "westminster"],
  },
  {
    id: "austin",
    name: "Greater Austin",
    states: ["TX"],
    lat: 30.0752,
    lon: -97.8423,
    cityIds: ["austin", "san-marcos-tx"],
  },
  {
    id: "boston",
    name: "Greater Boston",
    states: ["MA"],
    lat: 42.3626,
    lon: -71.1121,
    cityIds: ["boston", "brookline", "cambridge", "malden", "medford", "newton", "quincy", "somerville", "waltham"],
  },
  {
    id: "houston",
    name: "Greater Houston",
    states: ["TX"],
    lat: 29.7749,
    lon: -95.3364,
    cityIds: ["baytown", "conroe", "houston", "league-city", "missouri-city", "pasadena-tx", "pearland", "sugar-land", "the-woodlands"],
  },
  {
    id: "los-angeles",
    name: "Greater Los Angeles",
    states: ["CA"],
    lat: 33.9905,
    lon: -118.1162,
    cityIds: ["anaheim", "burbank", "corona-ca", "downey", "el-monte", "glendale", "inglewood", "long-beach", "los-angeles", "norwalk", "pasadena", "pomona", "santa-monica", "torrance", "west-covina"],
  },
  {
    id: "orlando",
    name: "Greater Orlando",
    states: ["FL"],
    lat: 28.5934,
    lon: -81.4054,
    cityIds: ["altamonte-springs", "apopka", "kissimmee", "ocoee", "orlando", "sanford", "winter-park"],
  },
  {
    id: "hampton-roads",
    name: "Hampton Roads",
    states: ["VA"],
    lat: 36.8518,
    lon: -76.1319,
    cityIds: ["norfolk", "virginia-beach"],
  },
  {
    id: "kansas-city",
    name: "Kansas City Metro",
    states: ["KS", "MO"],
    lat: 39.0409,
    lon: -94.6247,
    cityIds: ["kansas-city", "overland-park"],
  },
  {
    id: "las-vegas",
    name: "Las Vegas Valley",
    states: ["NV"],
    lat: 36.1058,
    lon: -115.1414,
    cityIds: ["enterprise", "henderson", "las-vegas", "north-las-vegas", "paradise", "spring-valley"],
  },
  {
    id: "atlanta",
    name: "Metro Atlanta",
    states: ["GA"],
    lat: 33.9449,
    lon: -84.3791,
    cityIds: ["alpharetta", "atlanta", "decatur", "dunwoody", "johns-creek", "kennesaw", "marietta", "roswell", "sandy-springs"],
  },
  {
    id: "nashville",
    name: "Middle Tennessee",
    states: ["TN"],
    lat: 36.1479,
    lon: -86.5596,
    cityIds: ["franklin", "gallatin", "hendersonville", "lebanon", "mt-juliet", "murfreesboro", "nashville"],
  },
  {
    id: "new-york",
    name: "New York Metro",
    states: ["NJ", "NY"],
    lat: 40.8186,
    lon: -74.0089,
    cityIds: ["elizabeth", "hoboken", "jersey-city", "new-rochelle", "new-york", "newark", "paterson", "white-plains", "yonkers"],
  },
  {
    id: "phoenix",
    name: "Phoenix Valley",
    states: ["AZ"],
    lat: 33.4626,
    lon: -112.0552,
    cityIds: ["chandler", "gilbert", "glendale-az", "goodyear", "mesa", "peoria", "phoenix", "scottsdale", "surprise", "tempe"],
  },
  {
    id: "portland",
    name: "Portland Metro",
    states: ["OR"],
    lat: 45.4526,
    lon: -122.7144,
    cityIds: ["beaverton", "gresham", "hillsboro", "lake-oswego", "oregon-city", "portland", "tigard", "tualatin"],
  },
  {
    id: "seattle",
    name: "Puget Sound",
    states: ["WA"],
    lat: 47.5507,
    lon: -122.2462,
    cityIds: ["auburn", "bellevue", "bothell", "everett", "federal-way", "kent", "kirkland", "redmond", "renton", "seattle", "tacoma"],
  },
  {
    id: "triangle",
    name: "Research Triangle",
    states: ["NC"],
    lat: 35.855,
    lon: -78.7726,
    cityIds: ["cary", "durham", "raleigh"],
  },
  {
    id: "san-diego",
    name: "San Diego County",
    states: ["CA"],
    lat: 32.9959,
    lon: -117.1791,
    cityIds: ["carlsbad", "chula-vista", "el-cajon", "escondido", "oceanside", "san-diego", "san-marcos", "vista"],
  },
  {
    id: "south-florida",
    name: "South Florida",
    states: ["FL"],
    lat: 26.088,
    lon: -80.1793,
    cityIds: ["boca-raton", "coral-springs", "deerfield-beach", "fort-lauderdale", "hialeah", "hollywood-fl", "miami", "pembroke-pines"],
  },
  {
    id: "tampa-bay",
    name: "Tampa Bay",
    states: ["FL"],
    lat: 27.9266,
    lon: -82.5801,
    cityIds: ["brandon", "clearwater", "largo", "palm-harbor", "riverview", "st-petersburg", "tampa"],
  },
  {
    id: "twin-cities",
    name: "Twin Cities",
    states: ["MN"],
    lat: 44.9597,
    lon: -93.2559,
    cityIds: ["bloomington", "brooklyn-park", "eagan", "maple-grove", "minneapolis", "plymouth", "st-paul", "woodbury"],
  },
  {
    id: "dc",
    name: "Washington DC Metro",
    states: ["DC", "MD", "VA"],
    lat: 38.9317,
    lon: -77.1492,
    cityIds: ["alexandria", "arlington-va", "bethesda", "fairfax", "reston", "rockville", "silver-spring", "tysons", "washington-dc"],
  },
  {
    id: "albuquerque",
    name: "Albuquerque, NM",
    states: ["NM"],
    lat: 35.0844,
    lon: -106.6504,
    cityIds: ["albuquerque"],
  },
  {
    id: "baltimore",
    name: "Baltimore, MD",
    states: ["MD"],
    lat: 39.2904,
    lon: -76.6122,
    cityIds: ["baltimore"],
  },
  {
    id: "baton-rouge",
    name: "Baton Rouge, LA",
    states: ["LA"],
    lat: 30.4515,
    lon: -91.1871,
    cityIds: ["baton-rouge"],
  },
  {
    id: "boise",
    name: "Boise, ID",
    states: ["ID"],
    lat: 43.615,
    lon: -116.2023,
    cityIds: ["boise"],
  },
  {
    id: "buffalo",
    name: "Buffalo, NY",
    states: ["NY"],
    lat: 42.8864,
    lon: -78.8784,
    cityIds: ["buffalo"],
  },
  {
    id: "cape-coral",
    name: "Cape Coral, FL",
    states: ["FL"],
    lat: 26.5629,
    lon: -81.9495,
    cityIds: ["cape-coral"],
  },
  {
    id: "charleston",
    name: "Charleston, SC",
    states: ["SC"],
    lat: 32.7765,
    lon: -79.9311,
    cityIds: ["charleston"],
  },
  {
    id: "charlotte",
    name: "Charlotte, NC",
    states: ["NC"],
    lat: 35.2271,
    lon: -80.8431,
    cityIds: ["charlotte"],
  },
  {
    id: "chattanooga",
    name: "Chattanooga, TN",
    states: ["TN"],
    lat: 35.0456,
    lon: -85.3097,
    cityIds: ["chattanooga"],
  },
  {
    id: "cincinnati",
    name: "Cincinnati, OH",
    states: ["OH"],
    lat: 39.1031,
    lon: -84.512,
    cityIds: ["cincinnati"],
  },
  {
    id: "cleveland",
    name: "Cleveland, OH",
    states: ["OH"],
    lat: 41.4993,
    lon: -81.6944,
    cityIds: ["cleveland"],
  },
  {
    id: "colorado-springs",
    name: "Colorado Springs, CO",
    states: ["CO"],
    lat: 38.8339,
    lon: -104.8214,
    cityIds: ["colorado-springs"],
  },
  {
    id: "columbus",
    name: "Columbus, OH",
    states: ["OH"],
    lat: 39.9612,
    lon: -82.9988,
    cityIds: ["columbus"],
  },
  {
    id: "detroit",
    name: "Detroit, MI",
    states: ["MI"],
    lat: 42.3314,
    lon: -83.0458,
    cityIds: ["detroit"],
  },
  {
    id: "el-paso",
    name: "El Paso, TX",
    states: ["TX"],
    lat: 31.7619,
    lon: -106.485,
    cityIds: ["el-paso"],
  },
  {
    id: "gainesville-fl",
    name: "Gainesville, FL",
    states: ["FL"],
    lat: 29.6516,
    lon: -82.3248,
    cityIds: ["gainesville-fl"],
  },
  {
    id: "greensboro",
    name: "Greensboro, NC",
    states: ["NC"],
    lat: 36.0726,
    lon: -79.792,
    cityIds: ["greensboro"],
  },
  {
    id: "hartford",
    name: "Hartford, CT",
    states: ["CT"],
    lat: 41.7658,
    lon: -72.6734,
    cityIds: ["hartford"],
  },
  {
    id: "honolulu",
    name: "Honolulu, HI",
    states: ["HI"],
    lat: 21.3069,
    lon: -157.8583,
    cityIds: ["honolulu"],
  },
  {
    id: "jacksonville",
    name: "Jacksonville, FL",
    states: ["FL"],
    lat: 30.3322,
    lon: -81.6557,
    cityIds: ["jacksonville"],
  },
  {
    id: "knoxville",
    name: "Knoxville, TN",
    states: ["TN"],
    lat: 35.9606,
    lon: -83.9207,
    cityIds: ["knoxville"],
  },
  {
    id: "laredo",
    name: "Laredo, TX",
    states: ["TX"],
    lat: 27.5306,
    lon: -99.4803,
    cityIds: ["laredo"],
  },
  {
    id: "lincoln",
    name: "Lincoln, NE",
    states: ["NE"],
    lat: 40.8136,
    lon: -96.7026,
    cityIds: ["lincoln"],
  },
  {
    id: "louisville",
    name: "Louisville, KY",
    states: ["KY"],
    lat: 38.2527,
    lon: -85.7585,
    cityIds: ["louisville"],
  },
  {
    id: "memphis",
    name: "Memphis, TN",
    states: ["TN"],
    lat: 35.1495,
    lon: -90.049,
    cityIds: ["memphis"],
  },
  {
    id: "midland",
    name: "Midland, TX",
    states: ["TX"],
    lat: 31.9973,
    lon: -102.0779,
    cityIds: ["midland"],
  },
  {
    id: "milwaukee",
    name: "Milwaukee, WI",
    states: ["WI"],
    lat: 43.0389,
    lon: -87.9065,
    cityIds: ["milwaukee"],
  },
  {
    id: "new-orleans",
    name: "New Orleans, LA",
    states: ["LA"],
    lat: 29.9511,
    lon: -90.0715,
    cityIds: ["new-orleans"],
  },
  {
    id: "omaha",
    name: "Omaha, NE",
    states: ["NE"],
    lat: 41.2565,
    lon: -95.9345,
    cityIds: ["omaha"],
  },
  {
    id: "palm-bay",
    name: "Palm Bay, FL",
    states: ["FL"],
    lat: 28.0345,
    lon: -80.5887,
    cityIds: ["palm-bay"],
  },
  {
    id: "philadelphia",
    name: "Philadelphia, PA",
    states: ["PA"],
    lat: 39.9526,
    lon: -75.1652,
    cityIds: ["philadelphia"],
  },
  {
    id: "pittsburgh",
    name: "Pittsburgh, PA",
    states: ["PA"],
    lat: 40.4406,
    lon: -79.9959,
    cityIds: ["pittsburgh"],
  },
  {
    id: "rockford",
    name: "Rockford, IL",
    states: ["IL"],
    lat: 42.2711,
    lon: -89.094,
    cityIds: ["rockford"],
  },
  {
    id: "sacramento",
    name: "Sacramento, CA",
    states: ["CA"],
    lat: 38.5816,
    lon: -121.4944,
    cityIds: ["sacramento"],
  },
  {
    id: "salem-or",
    name: "Salem, OR",
    states: ["OR"],
    lat: 44.9429,
    lon: -123.0351,
    cityIds: ["salem-or"],
  },
  {
    id: "salt-lake-city",
    name: "Salt Lake City, UT",
    states: ["UT"],
    lat: 40.7608,
    lon: -111.891,
    cityIds: ["salt-lake-city"],
  },
  {
    id: "san-antonio",
    name: "San Antonio, TX",
    states: ["TX"],
    lat: 29.4241,
    lon: -98.4936,
    cityIds: ["san-antonio"],
  },
  {
    id: "savannah",
    name: "Savannah, GA",
    states: ["GA"],
    lat: 32.0809,
    lon: -81.0912,
    cityIds: ["savannah"],
  },
  {
    id: "sioux-falls",
    name: "Sioux Falls, SD",
    states: ["SD"],
    lat: 43.546,
    lon: -96.7313,
    cityIds: ["sioux-falls"],
  },
  {
    id: "spokane",
    name: "Spokane, WA",
    states: ["WA"],
    lat: 47.6588,
    lon: -117.426,
    cityIds: ["spokane"],
  },
  {
    id: "tallahassee",
    name: "Tallahassee, FL",
    states: ["FL"],
    lat: 30.4383,
    lon: -84.2807,
    cityIds: ["tallahassee"],
  },
  {
    id: "tucson",
    name: "Tucson, AZ",
    states: ["AZ"],
    lat: 32.2226,
    lon: -110.9747,
    cityIds: ["tucson"],
  },
  {
    id: "wichita",
    name: "Wichita, KS",
    states: ["KS"],
    lat: 37.6872,
    lon: -97.3301,
    cityIds: ["wichita"],
  },
  {
    id: "wilmington",
    name: "Wilmington, NC",
    states: ["NC"],
    lat: 34.2257,
    lon: -77.9447,
    cityIds: ["wilmington"],
  },
];

// ── lookups ───────────────────────────────────────────────────────────────────

const CITY_BY_ID: Record<string, Metro> = Object.fromEntries(
  METROS.map((m) => [m.id, m])
);

const REGION_BY_ID: Record<string, Region> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r])
);

const REGION_ID_BY_CITY: Record<string, string> = Object.fromEntries(
  REGIONS.flatMap((r) => r.cityIds.map((c) => [c, r.id]))
);

/** Regions covering more than one city, ordered as authored (market name A-Z). */
export const MULTI_CITY_REGIONS = REGIONS.filter((r) => r.cityIds.length > 1);

/** Regions that are a single city, ordered as authored (city name A-Z). */
export const SINGLE_CITY_REGIONS = REGIONS.filter((r) => r.cityIds.length === 1);

export function getCity(cityId: string): Metro | undefined {
  return CITY_BY_ID[cityId];
}

export function getRegion(regionId: string): Region | undefined {
  return REGION_BY_ID[regionId];
}

export function regionForCity(cityId: string): Region | undefined {
  const id = REGION_ID_BY_CITY[cityId];
  return id ? REGION_BY_ID[id] : undefined;
}

/** Short state summary for a region: "TX", or "DC/MD/VA" when it spans several. */
export function regionStates(region: Region): string {
  return region.states.join("/");
}

// ── geography ─────────────────────────────────────────────────────────────────

const EARTH_RADIUS_MI = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in miles. */
export function distanceMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export interface NearestRegion {
  region: Region;
  /** Distance from the given point to the region's nearest covered city. */
  miles: number;
}

/**
 * Nearest region to a coordinate, measured to the closest member city rather
 * than the centroid so a contractor on the edge of a sprawling market (Denton
 * for DFW, Everett for Puget Sound) still resolves to that market.
 */
export function nearestRegions(
  point: { lat: number; lon: number },
  limit = 3
): NearestRegion[] {
  return REGIONS.map((region) => {
    let miles = Infinity;
    for (const cityId of region.cityIds) {
      const coords = CITY_COORDS[cityId];
      if (!coords) continue;
      const d = distanceMiles(point, coords);
      if (d < miles) miles = d;
    }
    return { region, miles };
  })
    .filter((r) => Number.isFinite(r.miles))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}

// ── search ────────────────────────────────────────────────────────────────────

export interface RegionSearchResult {
  region: Region;
  /** Cities within the region that matched the query directly. */
  matchedCities: Metro[];
  /** True when the region's own name or state matched, not just a city. */
  regionMatched: boolean;
}

/**
 * Search across region names, states and city names in one pass. A query of
 * "plano" surfaces Dallas-Fort Worth with Plano highlighted, so the contractor
 * can take the whole market in one click instead of hunting city by city.
 */
export function searchRegions(query: string): RegionSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: RegionSearchResult[] = [];

  for (const region of REGIONS) {
    const regionMatched =
      region.name.toLowerCase().includes(q) ||
      region.states.some((s) => s.toLowerCase() === q);

    const matchedCities = region.cityIds
      .map((id) => CITY_BY_ID[id])
      .filter(
        (city): city is Metro =>
          !!city &&
          (city.name.toLowerCase().includes(q) ||
            city.label.toLowerCase().includes(q) ||
            city.state.toLowerCase() === q)
      );

    if (regionMatched || matchedCities.length > 0) {
      results.push({ region, matchedCities, regionMatched });
    }
  }

  // Region-name hits first, then the market with the most matching cities.
  return results.sort((a, b) => {
    if (a.regionMatched !== b.regionMatched) return a.regionMatched ? -1 : 1;
    if (a.matchedCities.length !== b.matchedCities.length) {
      return b.matchedCities.length - a.matchedCities.length;
    }
    return a.region.name.localeCompare(b.region.name);
  });
}

// ── selection ─────────────────────────────────────────────────────────────────

export interface SelectionSummary {
  /** Label for the picker trigger, e.g. "Dallas-Fort Worth" or "Bay Area +2". */
  label: string;
  /** Regions with every city selected. */
  fullRegions: Region[];
  /** Regions with some but not all cities selected. */
  partialRegions: Region[];
  cityCount: number;
}

/**
 * Describe a set of selected city ids in market terms. Ten DFW cities read as
 * "Dallas-Fort Worth", not "10 cities": the label a contractor thinks in.
 */
export function summarizeSelection(cityIds: string[]): SelectionSummary {
  const selected = new Set(cityIds);
  const fullRegions: Region[] = [];
  const partialRegions: Region[] = [];

  for (const region of REGIONS) {
    const hits = region.cityIds.filter((c) => selected.has(c)).length;
    if (hits === 0) continue;
    if (hits === region.cityIds.length) fullRegions.push(region);
    else partialRegions.push(region);
  }

  const touched = [...fullRegions, ...partialRegions];
  let label: string;

  if (selected.size === 0) {
    label = "Select a region";
  } else if (touched.length === 1) {
    const region = touched[0];
    // A partially-selected single-city market is just that city.
    label =
      fullRegions.length === 1
        ? region.name
        : partialRegions[0].cityIds.filter((c) => selected.has(c)).length === 1
        ? getCity(cityIds.find((c) => region.cityIds.includes(c))!)?.label ??
          region.name
        : `${region.name} (${selected.size})`;
  } else {
    label = `${touched[0].name} +${touched.length - 1}`;
  }

  return {
    label,
    fullRegions,
    partialRegions,
    cityCount: selected.size,
  };
}

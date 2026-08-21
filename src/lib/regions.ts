/* Hallmark · genre: modern-minimal · module: regions · design-system: design.md · designed-as-app */

/**
 * Regional model for city selection.
 *
 * Contractors work a market, not a municipality. A Dallas mechanical sub cares
 * about Plano, Irving and Frisco as one job radius. This module groups the
 * 328 covered cities into 76 markets so the picker stays scannable as coverage
 * grows, and carries coordinates so "near me" can resolve a location to a
 * market without a geocoding round-trip.
 *
 * Region centroids are the mean of their member cities. Every id in `METROS`
 * must appear in exactly one region, or that city becomes unreachable in the
 * picker; `coverage.ts` derives the public city count from `METROS` so the two
 * cannot drift apart in customer-facing copy.
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
  "albuquerque": { lat: 35.0844, lon: -106.6504 },
  "alexandria": { lat: 38.8048, lon: -77.0469 },
  "allen": { lat: 33.1032, lon: -96.6706 },
  "alpharetta": { lat: 34.0754, lon: -84.2941 },
  "altamonte-springs": { lat: 28.6611, lon: -81.3656 },
  "anaheim": { lat: 33.8366, lon: -117.9143 },
  "anna-tx": { lat: 33.3495, lon: -96.5486 },
  "apopka": { lat: 28.6934, lon: -81.5322 },
  "arlington-heights": { lat: 42.0884, lon: -87.9806 },
  "arlington-tx": { lat: 32.7357, lon: -97.1081 },
  "arlington-va": { lat: 38.8799, lon: -77.1068 },
  "arvada": { lat: 39.8028, lon: -105.0875 },
  "atlanta": { lat: 33.749, lon: -84.388 },
  "auburn": { lat: 47.3073, lon: -122.2285 },
  "aurora": { lat: 39.7294, lon: -104.8319 },
  "austin": { lat: 30.2672, lon: -97.7431 },
  "baltimore": { lat: 39.2904, lon: -76.6122 },
  "baltimore-county": { lat: 39.4029, lon: -76.6019 },
  "baton-rouge": { lat: 30.4515, lon: -91.1871 },
  "bayonne": { lat: 40.6687, lon: -74.1143 },
  "baytown": { lat: 29.7355, lon: -94.9774 },
  "beaverton": { lat: 45.4871, lon: -122.8037 },
  "bellevue": { lat: 47.6101, lon: -122.2015 },
  "bend": { lat: 44.0582, lon: -121.3153 },
  "berkeley": { lat: 37.8716, lon: -122.2727 },
  "bethesda": { lat: 38.9847, lon: -77.0947 },
  "bloomfield": { lat: 40.8068, lon: -74.1854 },
  "bloomington": { lat: 44.8408, lon: -93.2983 },
  "boca-raton": { lat: 26.3587, lon: -80.0831 },
  "boise": { lat: 43.615, lon: -116.2023 },
  "boston": { lat: 42.3601, lon: -71.0589 },
  "bothell": { lat: 47.7601, lon: -122.2054 },
  "boulder": { lat: 40.015, lon: -105.2705 },
  "branchburg": { lat: 40.5615, lon: -74.7146 },
  "brandon": { lat: 27.9378, lon: -82.2859 },
  "brick": { lat: 40.0578, lon: -74.1099 },
  "bridgewater": { lat: 40.594, lon: -74.6193 },
  "brookline": { lat: 42.3318, lon: -71.1212 },
  "brooklyn-park": { lat: 45.0941, lon: -93.3563 },
  "broomfield": { lat: 39.9205, lon: -105.0867 },
  "buffalo": { lat: 42.8864, lon: -78.8784 },
  "burbank": { lat: 34.1808, lon: -118.309 },
  "cambridge": { lat: 42.3736, lon: -71.1097 },
  "camden": { lat: 39.9259, lon: -75.1196 },
  "cape-coral": { lat: 26.5629, lon: -81.9495 },
  "carlsbad": { lat: 33.1581, lon: -117.3506 },
  "cary": { lat: 35.7915, lon: -78.7811 },
  "celina": { lat: 33.3245, lon: -96.7847 },
  "centennial": { lat: 39.5791, lon: -104.8769 },
  "chandler": { lat: 33.3062, lon: -111.8413 },
  "charleston": { lat: 32.7765, lon: -79.9311 },
  "charlotte": { lat: 35.2271, lon: -80.8431 },
  "charlottesville": { lat: 38.0293, lon: -78.4767 },
  "chattanooga": { lat: 35.0456, lon: -85.3097 },
  "cherry-hill": { lat: 39.9348, lon: -74.9921 },
  "chicago": { lat: 41.8781, lon: -87.6298 },
  "chula-vista": { lat: 32.6401, lon: -117.0842 },
  "cicero": { lat: 41.8456, lon: -87.7539 },
  "cincinnati": { lat: 39.1031, lon: -84.512 },
  "clearwater": { lat: 27.9659, lon: -82.8001 },
  "cleveland": { lat: 41.4993, lon: -81.6944 },
  "clifton": { lat: 40.8584, lon: -74.1638 },
  "college-station": { lat: 30.628, lon: -96.3344 },
  "colorado-springs": { lat: 38.8339, lon: -104.8214 },
  "columbus": { lat: 39.9612, lon: -82.9988 },
  "concord": { lat: 37.978, lon: -122.0311 },
  "conroe": { lat: 30.3119, lon: -95.456 },
  "coral-springs": { lat: 26.2712, lon: -80.2706 },
  "corona-ca": { lat: 33.8753, lon: -117.5664 },
  "dallas": { lat: 32.7767, lon: -96.797 },
  "daly-city": { lat: 37.6879, lon: -122.4702 },
  "decatur": { lat: 33.7748, lon: -84.2963 },
  "deerfield-beach": { lat: 26.3185, lon: -80.0998 },
  "denton": { lat: 33.2148, lon: -97.1331 },
  "denver": { lat: 39.7392, lon: -104.9903 },
  "denville": { lat: 40.8843, lon: -74.4815 },
  "detroit": { lat: 42.3314, lon: -83.0458 },
  "downey": { lat: 33.9401, lon: -118.1332 },
  "dunwoody": { lat: 33.9462, lon: -84.3346 },
  "durham": { lat: 35.994, lon: -78.8986 },
  "eagan": { lat: 44.8041, lon: -93.1669 },
  "east-brunswick": { lat: 40.4279, lon: -74.416 },
  "east-windsor": { lat: 40.2676, lon: -74.5399 },
  "eatontown": { lat: 40.2962, lon: -74.0521 },
  "edison": { lat: 40.5187, lon: -74.4121 },
  "el-cajon": { lat: 32.7948, lon: -116.9625 },
  "el-monte": { lat: 34.0686, lon: -118.0276 },
  "el-paso": { lat: 31.7619, lon: -106.485 },
  "elgin": { lat: 42.0354, lon: -88.2826 },
  "elizabeth": { lat: 40.664, lon: -74.2107 },
  "englewood": { lat: 40.8929, lon: -73.9726 },
  "enterprise": { lat: 36.0268, lon: -115.2176 },
  "escondido": { lat: 33.1192, lon: -117.0864 },
  "evanston": { lat: 42.0451, lon: -87.6878 },
  "everett": { lat: 47.979, lon: -122.2021 },
  "evesham": { lat: 39.8651, lon: -74.8974 },
  "ewing": { lat: 40.269, lon: -74.8 },
  "fairfax": { lat: 38.8462, lon: -77.3064 },
  "fairfax-county": { lat: 38.8318, lon: -77.2717 },
  "fairfield-nj": { lat: 40.8834, lon: -74.3068 },
  "federal-way": { lat: 47.3223, lon: -122.3126 },
  "florham-park": { lat: 40.7773, lon: -74.3882 },
  "forsyth-county": { lat: 34.2237, lon: -84.1402 },
  "fort-collins": { lat: 40.5853, lon: -105.0844 },
  "fort-lauderdale": { lat: 26.1224, lon: -80.1373 },
  "fort-lee": { lat: 40.8509, lon: -73.9701 },
  "fort-worth": { lat: 32.7555, lon: -97.3308 },
  "franklin": { lat: 35.9251, lon: -86.8689 },
  "franklin-twp": { lat: 40.5037, lon: -74.5321 },
  "freehold": { lat: 40.2601, lon: -74.2735 },
  "fremont": { lat: 37.5485, lon: -121.9886 },
  "frisco": { lat: 33.1507, lon: -96.8236 },
  "gainesville-fl": { lat: 29.6516, lon: -82.3248 },
  "gaithersburg": { lat: 39.1434, lon: -77.2014 },
  "gallatin": { lat: 36.3887, lon: -86.4467 },
  "garland": { lat: 32.9126, lon: -96.6389 },
  "gilbert": { lat: 33.3528, lon: -111.789 },
  "glendale": { lat: 34.1425, lon: -118.2551 },
  "glendale-az": { lat: 33.5387, lon: -112.186 },
  "goodyear": { lat: 33.4353, lon: -112.3585 },
  "greensboro": { lat: 36.0726, lon: -79.792 },
  "gresham": { lat: 45.5023, lon: -122.431 },
  "hackensack": { lat: 40.8859, lon: -74.0435 },
  "hamilton-nj": { lat: 40.2098, lon: -74.6799 },
  "hanover": { lat: 40.8176, lon: -74.3654 },
  "hartford": { lat: 41.7658, lon: -72.6734 },
  "hayward": { lat: 37.6688, lon: -122.0808 },
  "henderson": { lat: 36.0395, lon: -114.9817 },
  "hendersonville": { lat: 36.3048, lon: -86.62 },
  "hialeah": { lat: 25.8576, lon: -80.2781 },
  "hillsboro": { lat: 45.5229, lon: -122.9898 },
  "hillsborough": { lat: 40.4665, lon: -74.6335 },
  "hoboken": { lat: 40.744, lon: -74.0324 },
  "hollywood-fl": { lat: 26.0112, lon: -80.1495 },
  "honolulu": { lat: 21.3069, lon: -157.8583 },
  "houston": { lat: 29.7604, lon: -95.3698 },
  "howard-county": { lat: 39.2673, lon: -76.834 },
  "howell": { lat: 40.1723, lon: -74.2143 },
  "inglewood": { lat: 33.9617, lon: -118.3531 },
  "irving": { lat: 32.814, lon: -96.9489 },
  "jackson-nj": { lat: 40.1073, lon: -74.3646 },
  "jacksonville": { lat: 30.3322, lon: -81.6557 },
  "jersey-city": { lat: 40.7178, lon: -74.0431 },
  "johns-creek": { lat: 34.0289, lon: -84.1988 },
  "joliet": { lat: 41.525, lon: -88.0817 },
  "kansas-city": { lat: 39.0997, lon: -94.5786 },
  "kennesaw": { lat: 34.0234, lon: -84.6155 },
  "kent": { lat: 47.3809, lon: -122.2348 },
  "kirkland": { lat: 47.6815, lon: -122.2087 },
  "kissimmee": { lat: 28.292, lon: -81.4076 },
  "knoxville": { lat: 35.9606, lon: -83.9207 },
  "lake-oswego": { lat: 45.4207, lon: -122.6706 },
  "lakewood": { lat: 39.7047, lon: -105.0814 },
  "lakewood-nj": { lat: 40.0979, lon: -74.2179 },
  "laredo": { lat: 27.5306, lon: -99.4803 },
  "largo": { lat: 27.9095, lon: -82.7873 },
  "las-vegas": { lat: 36.1699, lon: -115.1398 },
  "lawrence-nj": { lat: 40.2973, lon: -74.729 },
  "league-city": { lat: 29.5075, lon: -95.095 },
  "lebanon": { lat: 36.2081, lon: -86.2911 },
  "lincoln": { lat: 40.8136, lon: -96.7026 },
  "linden": { lat: 40.622, lon: -74.2446 },
  "livingston": { lat: 40.7959, lon: -74.3149 },
  "long-beach": { lat: 33.7701, lon: -118.1937 },
  "longmont": { lat: 40.1672, lon: -105.1019 },
  "los-angeles": { lat: 34.0522, lon: -118.2437 },
  "louisville": { lat: 38.2527, lon: -85.7585 },
  "mahwah": { lat: 41.0887, lon: -74.1435 },
  "malden": { lat: 42.4251, lon: -71.0662 },
  "manalapan": { lat: 40.2865, lon: -74.356 },
  "maple-grove": { lat: 45.0725, lon: -93.4558 },
  "marietta": { lat: 33.9526, lon: -84.5499 },
  "mckinney": { lat: 33.1972, lon: -96.6397 },
  "md-annapolis": { lat: 38.9784, lon: -76.4922 },
  "md-anne-arundel": { lat: 38.9953, lon: -76.561 },
  "md-carroll": { lat: 39.5637, lon: -77 },
  "md-harford": { lat: 39.5387, lon: -76.3483 },
  "medford": { lat: 42.4184, lon: -71.1062 },
  "melissa": { lat: 33.2857, lon: -96.5728 },
  "memphis": { lat: 35.1495, lon: -90.049 },
  "mesa": { lat: 33.4152, lon: -111.8315 },
  "miami": { lat: 25.7617, lon: -80.1918 },
  "middletown": { lat: 40.3968, lon: -74.1146 },
  "midland": { lat: 31.9973, lon: -102.0779 },
  "millburn": { lat: 40.7248, lon: -74.3021 },
  "milwaukee": { lat: 43.0389, lon: -87.9065 },
  "minneapolis": { lat: 44.9778, lon: -93.265 },
  "missouri-city": { lat: 29.6186, lon: -95.5377 },
  "monroe-twp": { lat: 40.314, lon: -74.4293 },
  "moorestown": { lat: 39.9687, lon: -74.949 },
  "morristown": { lat: 40.7968, lon: -74.4815 },
  "mount-laurel": { lat: 39.934, lon: -74.8912 },
  "mountain-view": { lat: 37.3861, lon: -122.0839 },
  "mt-juliet": { lat: 36.2001, lon: -86.5186 },
  "murfreesboro": { lat: 35.8456, lon: -86.3903 },
  "naperville": { lat: 41.7508, lon: -88.1535 },
  "nashville": { lat: 36.1627, lon: -86.7816 },
  "new-orleans": { lat: 29.9511, lon: -90.0715 },
  "new-rochelle": { lat: 40.9115, lon: -73.7824 },
  "new-york": { lat: 40.7128, lon: -74.006 },
  "newark": { lat: 40.7357, lon: -74.1724 },
  "newton": { lat: 42.337, lon: -71.2092 },
  "norfolk": { lat: 36.8508, lon: -76.2859 },
  "north-las-vegas": { lat: 36.1989, lon: -115.1175 },
  "norwalk": { lat: 33.9022, lon: -118.0818 },
  "oak-park": { lat: 41.885, lon: -87.7845 },
  "oakland": { lat: 37.8044, lon: -122.2712 },
  "oceanside": { lat: 33.1959, lon: -117.3795 },
  "ocoee": { lat: 28.5692, lon: -81.544 },
  "old-bridge": { lat: 40.3959, lon: -74.3132 },
  "omaha": { lat: 41.2565, lon: -95.9345 },
  "oregon-city": { lat: 45.3573, lon: -122.6068 },
  "orlando": { lat: 28.5383, lon: -81.3792 },
  "overland-park": { lat: 38.9822, lon: -94.6708 },
  "palm-bay": { lat: 28.0345, lon: -80.5887 },
  "palm-harbor": { lat: 28.0781, lon: -82.7637 },
  "palo-alto": { lat: 37.4419, lon: -122.143 },
  "paradise": { lat: 36.097, lon: -115.1467 },
  "paramus": { lat: 40.9445, lon: -74.0754 },
  "parsippany": { lat: 40.8578, lon: -74.426 },
  "pasadena": { lat: 34.1478, lon: -118.1445 },
  "pasadena-tx": { lat: 29.6911, lon: -95.2091 },
  "paterson": { lat: 40.9168, lon: -74.1718 },
  "pearland": { lat: 29.5636, lon: -95.286 },
  "pembroke-pines": { lat: 26.0031, lon: -80.2241 },
  "pennsauken": { lat: 39.9562, lon: -75.0577 },
  "peoria": { lat: 33.5806, lon: -112.2374 },
  "perth-amboy": { lat: 40.5068, lon: -74.2654 },
  "philadelphia": { lat: 39.9526, lon: -75.1652 },
  "phoenix": { lat: 33.4484, lon: -112.074 },
  "pierce-county": { lat: 47.0379, lon: -122.9007 },
  "piscataway": { lat: 40.4993, lon: -74.3999 },
  "pittsburgh": { lat: 40.4406, lon: -79.9959 },
  "plainsboro": { lat: 40.3315, lon: -74.5921 },
  "plano": { lat: 33.0198, lon: -96.6989 },
  "pleasanton": { lat: 37.6624, lon: -121.8747 },
  "plymouth": { lat: 45.0105, lon: -93.4555 },
  "pomona": { lat: 34.0551, lon: -117.75 },
  "portland": { lat: 45.5152, lon: -122.6784 },
  "princeton": { lat: 40.3573, lon: -74.6672 },
  "prosper": { lat: 33.2362, lon: -96.8011 },
  "quincy": { lat: 42.2529, lon: -71.0023 },
  "raleigh": { lat: 35.7796, lon: -78.6382 },
  "randolph": { lat: 40.8482, lon: -74.5735 },
  "red-bank": { lat: 40.3471, lon: -74.0643 },
  "redmond": { lat: 47.674, lon: -122.1215 },
  "redwood-city": { lat: 37.4852, lon: -122.2364 },
  "renton": { lat: 47.4829, lon: -122.2171 },
  "reston": { lat: 38.9687, lon: -77.3411 },
  "richardson": { lat: 32.9483, lon: -96.7299 },
  "richmond": { lat: 37.9358, lon: -122.3478 },
  "richmond-va": { lat: 37.5407, lon: -77.436 },
  "riverview": { lat: 27.8764, lon: -82.3265 },
  "rockford": { lat: 42.2711, lon: -89.094 },
  "rockville": { lat: 39.084, lon: -77.1528 },
  "roswell": { lat: 34.0232, lon: -84.3616 },
  "sacramento": { lat: 38.5816, lon: -121.4944 },
  "salem-or": { lat: 44.9429, lon: -123.0351 },
  "salt-lake-city": { lat: 40.7608, lon: -111.891 },
  "san-antonio": { lat: 29.4241, lon: -98.4936 },
  "san-diego": { lat: 32.7157, lon: -117.1611 },
  "san-francisco": { lat: 37.7749, lon: -122.4194 },
  "san-jose": { lat: 37.3382, lon: -121.8863 },
  "san-marcos": { lat: 33.1434, lon: -117.1661 },
  "san-marcos-tx": { lat: 29.8833, lon: -97.9414 },
  "san-mateo": { lat: 37.563, lon: -122.3255 },
  "san-ramon": { lat: 37.7799, lon: -121.978 },
  "sandy-springs": { lat: 33.9304, lon: -84.3733 },
  "sanford": { lat: 28.8003, lon: -81.2698 },
  "santa-clara": { lat: 37.3541, lon: -121.9552 },
  "santa-monica": { lat: 34.0195, lon: -118.4912 },
  "savannah": { lat: 32.0809, lon: -81.0912 },
  "schaumburg": { lat: 42.0334, lon: -88.0834 },
  "scottsdale": { lat: 33.4942, lon: -111.9261 },
  "seattle": { lat: 47.6062, lon: -122.3321 },
  "silver-spring": { lat: 38.9907, lon: -77.0261 },
  "sioux-falls": { lat: 43.546, lon: -96.7313 },
  "somerville": { lat: 42.3876, lon: -71.0995 },
  "sonoma-county": { lat: 38.578, lon: -122.9888 },
  "south-brunswick": { lat: 40.3776, lon: -74.5254 },
  "south-plainfield": { lat: 40.5793, lon: -74.4118 },
  "spokane": { lat: 47.6588, lon: -117.426 },
  "spring-valley": { lat: 36.1028, lon: -115.245 },
  "springfield-nj": { lat: 40.7048, lon: -74.3171 },
  "st-paul": { lat: 44.9537, lon: -93.09 },
  "st-petersburg": { lat: 27.7676, lon: -82.6403 },
  "stockton": { lat: 37.9577, lon: -121.2908 },
  "sugar-land": { lat: 29.6197, lon: -95.6349 },
  "summit-nj": { lat: 40.7156, lon: -74.3599 },
  "sunnyvale": { lat: 37.3688, lon: -122.0363 },
  "surprise": { lat: 33.6292, lon: -112.368 },
  "tacoma": { lat: 47.2529, lon: -122.4443 },
  "tallahassee": { lat: 30.4383, lon: -84.2807 },
  "tampa": { lat: 27.9506, lon: -82.4572 },
  "teaneck": { lat: 40.8976, lon: -74.016 },
  "tempe": { lat: 33.4255, lon: -111.94 },
  "the-woodlands": { lat: 30.1658, lon: -95.4613 },
  "thornton": { lat: 39.868, lon: -104.9719 },
  "tigard": { lat: 45.4312, lon: -122.7715 },
  "tinton-falls": { lat: 40.3001, lon: -74.1004 },
  "toms-river": { lat: 39.9537, lon: -74.1979 },
  "torrance": { lat: 33.8358, lon: -118.3406 },
  "tualatin": { lat: 45.3838, lon: -122.7637 },
  "tucson": { lat: 32.2226, lon: -110.9747 },
  "tulsa": { lat: 36.154, lon: -95.9928 },
  "tysons": { lat: 38.9187, lon: -77.2311 },
  "union-city": { lat: 37.5934, lon: -122.0439 },
  "vineland": { lat: 39.4864, lon: -75.0257 },
  "virginia-beach": { lat: 36.8529, lon: -75.978 },
  "vista": { lat: 33.2, lon: -117.2426 },
  "voorhees": { lat: 39.8451, lon: -74.954 },
  "wall-twp": { lat: 40.1523, lon: -74.0743 },
  "walnut-creek": { lat: 37.9101, lon: -122.0652 },
  "waltham": { lat: 42.3765, lon: -71.2356 },
  "washington-dc": { lat: 38.9072, lon: -77.0369 },
  "washington-twp-nj": { lat: 39.759, lon: -75.0632 },
  "west-covina": { lat: 34.0686, lon: -117.939 },
  "west-windsor": { lat: 40.2965, lon: -74.6221 },
  "westminster": { lat: 39.8367, lon: -105.0372 },
  "white-plains": { lat: 41.034, lon: -73.7629 },
  "wichita": { lat: 37.6872, lon: -97.3301 },
  "wilmington": { lat: 34.2257, lon: -77.9447 },
  "winter-park": { lat: 28.5993, lon: -81.3393 },
  "woodbridge": { lat: 40.5576, lon: -74.2846 },
  "woodbury": { lat: 44.9239, lon: -92.9594 },
  "worcester": { lat: 42.2626, lon: -71.8023 },
  "wylie": { lat: 33.0151, lon: -96.5389 },
  "yonkers": { lat: 40.9312, lon: -73.8988 },
};

export const REGIONS: Region[] = [
  {
    id: "bay-area",
    name: "Bay Area",
    states: ["CA"],
    lat: 37.6865,
    lon: -122.175,
    cityIds: ["berkeley", "concord", "daly-city", "fremont", "hayward", "mountain-view", "oakland", "palo-alto", "pleasanton", "redwood-city", "richmond", "san-francisco", "san-jose", "san-mateo", "san-ramon", "santa-clara", "sonoma-county", "sunnyvale", "union-city", "walnut-creek"],
  },
  {
    id: "central-nj",
    name: "Central New Jersey",
    states: ["NJ"],
    lat: 40.3362,
    lon: -74.3977,
    cityIds: ["branchburg", "brick", "bridgewater", "east-brunswick", "east-windsor", "eatontown", "edison", "ewing", "franklin-twp", "freehold", "hamilton-nj", "hillsborough", "howell", "jackson-nj", "lakewood-nj", "lawrence-nj", "manalapan", "middletown", "monroe-twp", "old-bridge", "perth-amboy", "piscataway", "plainsboro", "princeton", "red-bank", "south-brunswick", "south-plainfield", "tinton-falls", "toms-river", "wall-twp", "west-windsor", "woodbridge"],
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
    lat: 33.0525,
    lon: -96.7978,
    cityIds: ["allen", "anna-tx", "arlington-tx", "celina", "dallas", "denton", "fort-worth", "frisco", "garland", "irving", "mckinney", "melissa", "plano", "prosper", "richardson", "wylie"],
  },
  {
    id: "denver",
    name: "Denver Front Range",
    states: ["CO"],
    lat: 39.9044,
    lon: -105.0382,
    cityIds: ["arvada", "aurora", "boulder", "broomfield", "centennial", "denver", "fort-collins", "lakewood", "longmont", "thornton", "westminster"],
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
    id: "baltimore",
    name: "Greater Baltimore",
    states: ["MD"],
    lat: 39.291,
    lon: -76.6357,
    cityIds: ["md-annapolis", "md-anne-arundel", "baltimore", "baltimore-county", "md-carroll", "md-harford", "howard-county"],
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
    id: "philadelphia",
    name: "Greater Philadelphia",
    states: ["NJ", "PA"],
    lat: 39.8628,
    lon: -75.0115,
    cityIds: ["camden", "cherry-hill", "evesham", "moorestown", "mount-laurel", "pennsauken", "philadelphia", "vineland", "voorhees", "washington-twp-nj"],
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
    lat: 33.9728,
    lon: -84.3552,
    cityIds: ["alpharetta", "atlanta", "decatur", "dunwoody", "forsyth-county", "johns-creek", "kennesaw", "marietta", "roswell", "sandy-springs"],
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
    lat: 40.823,
    lon: -74.1776,
    cityIds: ["bayonne", "bloomfield", "clifton", "denville", "elizabeth", "englewood", "fairfield-nj", "florham-park", "fort-lee", "hackensack", "hanover", "hoboken", "jersey-city", "linden", "livingston", "mahwah", "millburn", "morristown", "new-rochelle", "new-york", "newark", "paramus", "parsippany", "paterson", "randolph", "springfield-nj", "summit-nj", "teaneck", "white-plains", "yonkers"],
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
    lat: 47.5079,
    lon: -122.3008,
    cityIds: ["auburn", "bellevue", "bothell", "everett", "federal-way", "kent", "kirkland", "pierce-county", "redmond", "renton", "seattle", "tacoma"],
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
    lat: 38.9418,
    lon: -77.1651,
    cityIds: ["alexandria", "arlington-va", "bethesda", "fairfax", "fairfax-county", "gaithersburg", "reston", "rockville", "silver-spring", "tysons", "washington-dc"],
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
    id: "baton-rouge",
    name: "Baton Rouge, LA",
    states: ["LA"],
    lat: 30.4515,
    lon: -91.1871,
    cityIds: ["baton-rouge"],
  },
  {
    id: "bend",
    name: "Bend, OR",
    states: ["OR"],
    lat: 44.0582,
    lon: -121.3153,
    cityIds: ["bend"],
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
    id: "charlottesville",
    name: "Charlottesville, VA",
    states: ["VA"],
    lat: 38.0293,
    lon: -78.4767,
    cityIds: ["charlottesville"],
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
    id: "college-station",
    name: "College Station, TX",
    states: ["TX"],
    lat: 30.628,
    lon: -96.3344,
    cityIds: ["college-station"],
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
    id: "pittsburgh",
    name: "Pittsburgh, PA",
    states: ["PA"],
    lat: 40.4406,
    lon: -79.9959,
    cityIds: ["pittsburgh"],
  },
  {
    id: "richmond-va",
    name: "Richmond, VA",
    states: ["VA"],
    lat: 37.5407,
    lon: -77.436,
    cityIds: ["richmond-va"],
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
    id: "stockton",
    name: "Stockton, CA",
    states: ["CA"],
    lat: 37.9577,
    lon: -121.2908,
    cityIds: ["stockton"],
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
    id: "tulsa",
    name: "Tulsa, OK",
    states: ["OK"],
    lat: 36.154,
    lon: -95.9928,
    cityIds: ["tulsa"],
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
  {
    id: "worcester",
    name: "Worcester, MA",
    states: ["MA"],
    lat: 42.2626,
    lon: -71.8023,
    cityIds: ["worcester"],
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

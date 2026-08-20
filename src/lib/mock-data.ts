import type { Permit, Trade, PermitStatus, ContactConfidence } from "./types";

// ── helpers ────────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── deterministic seeded PRNG ─────────────────────────────────────────────────

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  }
  return h || 1;
}

class Rng {
  private s: number;
  constructor(seed: string) {
    this.s = hash(seed);
  }
  next(): number {
    this.s = (this.s * 1664525 + 1013904223) & 0x7fffffff;
    return this.s / 0x7fffffff;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

// ── city metadata ─────────────────────────────────────────────────────────────

interface CityMeta {
  id: string;
  name: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  areaCode: string;
}

const CITIES: CityMeta[] = [
  // SF Bay Area
  { id: "san-francisco", name: "San Francisco", state: "CA", zip: "94102", lat: 37.7749, lon: -122.4194, areaCode: "415" },
  { id: "oakland", name: "Oakland", state: "CA", zip: "94612", lat: 37.8044, lon: -122.2712, areaCode: "510" },
  { id: "berkeley", name: "Berkeley", state: "CA", zip: "94704", lat: 37.8716, lon: -122.2727, areaCode: "510" },
  { id: "san-jose", name: "San Jose", state: "CA", zip: "95113", lat: 37.3382, lon: -121.8863, areaCode: "408" },
  { id: "fremont", name: "Fremont", state: "CA", zip: "94538", lat: 37.5485, lon: -121.9886, areaCode: "510" },
  { id: "hayward", name: "Hayward", state: "CA", zip: "94541", lat: 37.6688, lon: -122.0808, areaCode: "510" },
  { id: "palo-alto", name: "Palo Alto", state: "CA", zip: "94301", lat: 37.4419, lon: -122.1430, areaCode: "650" },
  { id: "redwood-city", name: "Redwood City", state: "CA", zip: "94063", lat: 37.4852, lon: -122.2364, areaCode: "650" },
  { id: "mountain-view", name: "Mountain View", state: "CA", zip: "94041", lat: 37.3861, lon: -122.0839, areaCode: "650" },
  { id: "sunnyvale", name: "Sunnyvale", state: "CA", zip: "94086", lat: 37.3688, lon: -122.0363, areaCode: "408" },
  { id: "santa-clara", name: "Santa Clara", state: "CA", zip: "95050", lat: 37.3541, lon: -121.9552, areaCode: "408" },
  { id: "walnut-creek", name: "Walnut Creek", state: "CA", zip: "94596", lat: 37.9101, lon: -122.0652, areaCode: "925" },
  { id: "concord", name: "Concord", state: "CA", zip: "94520", lat: 37.9780, lon: -122.0311, areaCode: "925" },
  { id: "san-mateo", name: "San Mateo", state: "CA", zip: "94401", lat: 37.5630, lon: -122.3255, areaCode: "650" },
  { id: "richmond", name: "Richmond", state: "CA", zip: "94804", lat: 37.9358, lon: -122.3478, areaCode: "510" },
  { id: "san-ramon", name: "San Ramon", state: "CA", zip: "94583", lat: 37.7799, lon: -121.9780, areaCode: "925" },
  { id: "union-city", name: "Union City", state: "CA", zip: "94587", lat: 37.5934, lon: -122.0439, areaCode: "510" },
  { id: "pleasanton", name: "Pleasanton", state: "CA", zip: "94566", lat: 37.6624, lon: -121.8747, areaCode: "925" },
  { id: "daly-city", name: "Daly City", state: "CA", zip: "94015", lat: 37.6879, lon: -122.4702, areaCode: "650" },
  // LA Metro
  { id: "los-angeles", name: "Los Angeles", state: "CA", zip: "90012", lat: 34.0522, lon: -118.2437, areaCode: "213" },
  { id: "long-beach", name: "Long Beach", state: "CA", zip: "90802", lat: 33.7701, lon: -118.1937, areaCode: "562" },
  { id: "glendale", name: "Glendale", state: "CA", zip: "91205", lat: 34.1425, lon: -118.2551, areaCode: "818" },
  { id: "pasadena", name: "Pasadena", state: "CA", zip: "91101", lat: 34.1478, lon: -118.1445, areaCode: "626" },
  { id: "santa-monica", name: "Santa Monica", state: "CA", zip: "90401", lat: 34.0195, lon: -118.4912, areaCode: "310" },
  { id: "burbank", name: "Burbank", state: "CA", zip: "91502", lat: 34.1808, lon: -118.3090, areaCode: "818" },
  { id: "torrance", name: "Torrance", state: "CA", zip: "90503", lat: 33.8358, lon: -118.3406, areaCode: "310" },
  { id: "inglewood", name: "Inglewood", state: "CA", zip: "90301", lat: 33.9617, lon: -118.3531, areaCode: "310" },
  { id: "pomona", name: "Pomona", state: "CA", zip: "91766", lat: 34.0551, lon: -117.7500, areaCode: "909" },
  { id: "el-monte", name: "El Monte", state: "CA", zip: "91731", lat: 34.0686, lon: -118.0276, areaCode: "626" },
  { id: "downey", name: "Downey", state: "CA", zip: "90241", lat: 33.9401, lon: -118.1332, areaCode: "562" },
  { id: "west-covina", name: "West Covina", state: "CA", zip: "91790", lat: 34.0686, lon: -117.9390, areaCode: "626" },
  { id: "norwalk", name: "Norwalk", state: "CA", zip: "90650", lat: 33.9022, lon: -118.0818, areaCode: "562" },
  { id: "anaheim", name: "Anaheim", state: "CA", zip: "92805", lat: 33.8366, lon: -117.9143, areaCode: "714" },
  // NYC Metro
  { id: "new-york", name: "New York", state: "NY", zip: "10001", lat: 40.7128, lon: -74.0060, areaCode: "212" },
  { id: "yonkers", name: "Yonkers", state: "NY", zip: "10701", lat: 40.9312, lon: -73.8988, areaCode: "914" },
  { id: "white-plains", name: "White Plains", state: "NY", zip: "10601", lat: 41.0340, lon: -73.7629, areaCode: "914" },
  { id: "new-rochelle", name: "New Rochelle", state: "NY", zip: "10801", lat: 40.9115, lon: -73.7824, areaCode: "914" },
  { id: "newark", name: "Newark", state: "NJ", zip: "07102", lat: 40.7357, lon: -74.1724, areaCode: "973" },
  { id: "jersey-city", name: "Jersey City", state: "NJ", zip: "07302", lat: 40.7178, lon: -74.0431, areaCode: "201" },
  { id: "paterson", name: "Paterson", state: "NJ", zip: "07501", lat: 40.9168, lon: -74.1718, areaCode: "973" },
  { id: "elizabeth", name: "Elizabeth", state: "NJ", zip: "07201", lat: 40.6640, lon: -74.2107, areaCode: "908" },
  { id: "hoboken", name: "Hoboken", state: "NJ", zip: "07030", lat: 40.7440, lon: -74.0324, areaCode: "201" },
  // Chicago Metro
  { id: "chicago", name: "Chicago", state: "IL", zip: "60601", lat: 41.8781, lon: -87.6298, areaCode: "312" },
  { id: "evanston", name: "Evanston", state: "IL", zip: "60201", lat: 42.0451, lon: -87.6878, areaCode: "847" },
  { id: "naperville", name: "Naperville", state: "IL", zip: "60540", lat: 41.7508, lon: -88.1535, areaCode: "630" },
  { id: "joliet", name: "Joliet", state: "IL", zip: "60432", lat: 41.5250, lon: -88.0817, areaCode: "815" },
  { id: "schaumburg", name: "Schaumburg", state: "IL", zip: "60173", lat: 42.0334, lon: -88.0834, areaCode: "847" },
  { id: "arlington-heights", name: "Arlington Heights", state: "IL", zip: "60004", lat: 42.0884, lon: -87.9806, areaCode: "847" },
  { id: "oak-park", name: "Oak Park", state: "IL", zip: "60302", lat: 41.8850, lon: -87.7845, areaCode: "708" },
  { id: "cicero", name: "Cicero", state: "IL", zip: "60804", lat: 41.8456, lon: -87.7539, areaCode: "708" },
  { id: "elgin", name: "Elgin", state: "IL", zip: "60120", lat: 42.0354, lon: -88.2826, areaCode: "847" },
  // Dallas-Fort Worth
  { id: "dallas", name: "Dallas", state: "TX", zip: "75201", lat: 32.7767, lon: -96.7970, areaCode: "214" },
  { id: "fort-worth", name: "Fort Worth", state: "TX", zip: "76102", lat: 32.7555, lon: -97.3308, areaCode: "817" },
  { id: "arlington-tx", name: "Arlington", state: "TX", zip: "76010", lat: 32.7357, lon: -97.1081, areaCode: "817" },
  { id: "plano", name: "Plano", state: "TX", zip: "75074", lat: 33.0198, lon: -96.6989, areaCode: "972" },
  { id: "irving", name: "Irving", state: "TX", zip: "75060", lat: 32.8140, lon: -96.9489, areaCode: "972" },
  { id: "garland", name: "Garland", state: "TX", zip: "75040", lat: 32.9126, lon: -96.6389, areaCode: "972" },
  { id: "mckinney", name: "McKinney", state: "TX", zip: "75069", lat: 33.1972, lon: -96.6397, areaCode: "469" },
  { id: "denton", name: "Denton", state: "TX", zip: "76201", lat: 33.2148, lon: -97.1331, areaCode: "940" },
  { id: "richardson", name: "Richardson", state: "TX", zip: "75080", lat: 32.9483, lon: -96.7299, areaCode: "972" },
  { id: "frisco", name: "Frisco", state: "TX", zip: "75034", lat: 33.1507, lon: -96.8236, areaCode: "469" },
  // Houston
  { id: "houston", name: "Houston", state: "TX", zip: "77002", lat: 29.7604, lon: -95.3698, areaCode: "713" },
  { id: "sugar-land", name: "Sugar Land", state: "TX", zip: "77478", lat: 29.6197, lon: -95.6349, areaCode: "281" },
  { id: "pasadena-tx", name: "Pasadena", state: "TX", zip: "77502", lat: 29.6911, lon: -95.2091, areaCode: "281" },
  { id: "pearland", name: "Pearland", state: "TX", zip: "77581", lat: 29.5636, lon: -95.2860, areaCode: "281" },
  { id: "the-woodlands", name: "The Woodlands", state: "TX", zip: "77380", lat: 30.1658, lon: -95.4613, areaCode: "281" },
  { id: "league-city", name: "League City", state: "TX", zip: "77573", lat: 29.5075, lon: -95.0950, areaCode: "281" },
  { id: "missouri-city", name: "Missouri City", state: "TX", zip: "77459", lat: 29.6186, lon: -95.5377, areaCode: "281" },
  { id: "baytown", name: "Baytown", state: "TX", zip: "77520", lat: 29.7355, lon: -94.9774, areaCode: "281" },
  { id: "conroe", name: "Conroe", state: "TX", zip: "77301", lat: 30.3119, lon: -95.4560, areaCode: "936" },
  // DC Metro
  { id: "washington-dc", name: "Washington", state: "DC", zip: "20001", lat: 38.9072, lon: -77.0369, areaCode: "202" },
  { id: "arlington-va", name: "Arlington", state: "VA", zip: "22201", lat: 38.8799, lon: -77.1068, areaCode: "703" },
  { id: "alexandria", name: "Alexandria", state: "VA", zip: "22314", lat: 38.8048, lon: -77.0469, areaCode: "703" },
  { id: "silver-spring", name: "Silver Spring", state: "MD", zip: "20910", lat: 38.9907, lon: -77.0261, areaCode: "301" },
  { id: "bethesda", name: "Bethesda", state: "MD", zip: "20814", lat: 38.9847, lon: -77.0947, areaCode: "301" },
  { id: "fairfax", name: "Fairfax", state: "VA", zip: "22030", lat: 38.8462, lon: -77.3064, areaCode: "703" },
  { id: "reston", name: "Reston", state: "VA", zip: "20190", lat: 38.9687, lon: -77.3411, areaCode: "703" },
  { id: "rockville", name: "Rockville", state: "MD", zip: "20850", lat: 39.0840, lon: -77.1528, areaCode: "301" },
  { id: "tysons", name: "Tysons", state: "VA", zip: "22182", lat: 38.9187, lon: -77.2311, areaCode: "703" },
  // Seattle Metro
  { id: "seattle", name: "Seattle", state: "WA", zip: "98101", lat: 47.6062, lon: -122.3321, areaCode: "206" },
  { id: "bellevue", name: "Bellevue", state: "WA", zip: "98004", lat: 47.6101, lon: -122.2015, areaCode: "425" },
  { id: "tacoma", name: "Tacoma", state: "WA", zip: "98402", lat: 47.2529, lon: -122.4443, areaCode: "253" },
  { id: "redmond", name: "Redmond", state: "WA", zip: "98052", lat: 47.6740, lon: -122.1215, areaCode: "425" },
  { id: "kent", name: "Kent", state: "WA", zip: "98032", lat: 47.3809, lon: -122.2348, areaCode: "253" },
  { id: "renton", name: "Renton", state: "WA", zip: "98057", lat: 47.4829, lon: -122.2171, areaCode: "425" },
  { id: "federal-way", name: "Federal Way", state: "WA", zip: "98003", lat: 47.3223, lon: -122.3126, areaCode: "253" },
  { id: "kirkland", name: "Kirkland", state: "WA", zip: "98033", lat: 47.6815, lon: -122.2087, areaCode: "425" },
  { id: "auburn", name: "Auburn", state: "WA", zip: "98002", lat: 47.3073, lon: -122.2285, areaCode: "253" },
  { id: "bothell", name: "Bothell", state: "WA", zip: "98011", lat: 47.7601, lon: -122.2054, areaCode: "425" },
  { id: "everett", name: "Everett", state: "WA", zip: "98201", lat: 47.9790, lon: -122.2021, areaCode: "425" },
  // Miami Metro
  { id: "miami", name: "Miami", state: "FL", zip: "33130", lat: 25.7617, lon: -80.1918, areaCode: "305" },
  { id: "fort-lauderdale", name: "Fort Lauderdale", state: "FL", zip: "33301", lat: 26.1224, lon: -80.1373, areaCode: "954" },
  { id: "hialeah", name: "Hialeah", state: "FL", zip: "33010", lat: 25.8576, lon: -80.2781, areaCode: "305" },
  { id: "hollywood-fl", name: "Hollywood", state: "FL", zip: "33020", lat: 26.0112, lon: -80.1495, areaCode: "954" },
  { id: "coral-springs", name: "Coral Springs", state: "FL", zip: "33065", lat: 26.2712, lon: -80.2706, areaCode: "954" },
  { id: "pembroke-pines", name: "Pembroke Pines", state: "FL", zip: "33024", lat: 26.0031, lon: -80.2241, areaCode: "954" },
  { id: "boca-raton", name: "Boca Raton", state: "FL", zip: "33432", lat: 26.3587, lon: -80.0831, areaCode: "561" },
  { id: "deerfield-beach", name: "Deerfield Beach", state: "FL", zip: "33441", lat: 26.3185, lon: -80.0998, areaCode: "954" },
  // Phoenix Metro
  { id: "phoenix", name: "Phoenix", state: "AZ", zip: "85004", lat: 33.4484, lon: -112.0740, areaCode: "602" },
  { id: "mesa", name: "Mesa", state: "AZ", zip: "85201", lat: 33.4152, lon: -111.8315, areaCode: "480" },
  { id: "scottsdale", name: "Scottsdale", state: "AZ", zip: "85251", lat: 33.4942, lon: -111.9261, areaCode: "480" },
  { id: "chandler", name: "Chandler", state: "AZ", zip: "85225", lat: 33.3062, lon: -111.8413, areaCode: "480" },
  { id: "gilbert", name: "Gilbert", state: "AZ", zip: "85234", lat: 33.3528, lon: -111.7890, areaCode: "480" },
  { id: "tempe", name: "Tempe", state: "AZ", zip: "85281", lat: 33.4255, lon: -111.9400, areaCode: "480" },
  { id: "peoria", name: "Peoria", state: "AZ", zip: "85345", lat: 33.5806, lon: -112.2374, areaCode: "623" },
  { id: "glendale-az", name: "Glendale", state: "AZ", zip: "85301", lat: 33.5387, lon: -112.1860, areaCode: "623" },
  { id: "surprise", name: "Surprise", state: "AZ", zip: "85374", lat: 33.6292, lon: -112.3680, areaCode: "623" },
  { id: "goodyear", name: "Goodyear", state: "AZ", zip: "85338", lat: 33.4353, lon: -112.3585, areaCode: "623" },
  // Denver Metro
  { id: "denver", name: "Denver", state: "CO", zip: "80202", lat: 39.7392, lon: -104.9903, areaCode: "303" },
  { id: "aurora", name: "Aurora", state: "CO", zip: "80012", lat: 39.7294, lon: -104.8319, areaCode: "303" },
  { id: "lakewood", name: "Lakewood", state: "CO", zip: "80226", lat: 39.7047, lon: -105.0814, areaCode: "303" },
  { id: "westminster", name: "Westminster", state: "CO", zip: "80031", lat: 39.8367, lon: -105.0372, areaCode: "303" },
  { id: "arvada", name: "Arvada", state: "CO", zip: "80002", lat: 39.8028, lon: -105.0875, areaCode: "303" },
  { id: "thornton", name: "Thornton", state: "CO", zip: "80229", lat: 39.8680, lon: -104.9719, areaCode: "303" },
  { id: "centennial", name: "Centennial", state: "CO", zip: "80112", lat: 39.5791, lon: -104.8769, areaCode: "303" },
  { id: "boulder", name: "Boulder", state: "CO", zip: "80302", lat: 40.0150, lon: -105.2705, areaCode: "303" },
  { id: "longmont", name: "Longmont", state: "CO", zip: "80501", lat: 40.1672, lon: -105.1019, areaCode: "303" },
  { id: "broomfield", name: "Broomfield", state: "CO", zip: "80020", lat: 39.9205, lon: -105.0867, areaCode: "303" },
  // Atlanta Metro
  { id: "atlanta", name: "Atlanta", state: "GA", zip: "30303", lat: 33.7490, lon: -84.3880, areaCode: "404" },
  { id: "marietta", name: "Marietta", state: "GA", zip: "30060", lat: 33.9526, lon: -84.5499, areaCode: "770" },
  { id: "roswell", name: "Roswell", state: "GA", zip: "30075", lat: 34.0232, lon: -84.3616, areaCode: "770" },
  { id: "sandy-springs", name: "Sandy Springs", state: "GA", zip: "30328", lat: 33.9304, lon: -84.3733, areaCode: "404" },
  { id: "alpharetta", name: "Alpharetta", state: "GA", zip: "30009", lat: 34.0754, lon: -84.2941, areaCode: "770" },
  { id: "johns-creek", name: "Johns Creek", state: "GA", zip: "30097", lat: 34.0289, lon: -84.1988, areaCode: "770" },
  { id: "kennesaw", name: "Kennesaw", state: "GA", zip: "30144", lat: 34.0234, lon: -84.6155, areaCode: "770" },
  { id: "decatur", name: "Decatur", state: "GA", zip: "30030", lat: 33.7748, lon: -84.2963, areaCode: "404" },
  { id: "dunwoody", name: "Dunwoody", state: "GA", zip: "30338", lat: 33.9462, lon: -84.3346, areaCode: "770" },
  // Boston Metro
  { id: "boston", name: "Boston", state: "MA", zip: "02108", lat: 42.3601, lon: -71.0589, areaCode: "617" },
  { id: "cambridge", name: "Cambridge", state: "MA", zip: "02139", lat: 42.3736, lon: -71.1097, areaCode: "617" },
  { id: "somerville", name: "Somerville", state: "MA", zip: "02143", lat: 42.3876, lon: -71.0995, areaCode: "617" },
  { id: "quincy", name: "Quincy", state: "MA", zip: "02169", lat: 42.2529, lon: -71.0023, areaCode: "617" },
  { id: "brookline", name: "Brookline", state: "MA", zip: "02445", lat: 42.3318, lon: -71.1212, areaCode: "617" },
  { id: "newton", name: "Newton", state: "MA", zip: "02458", lat: 42.3370, lon: -71.2092, areaCode: "617" },
  { id: "waltham", name: "Waltham", state: "MA", zip: "02451", lat: 42.3765, lon: -71.2356, areaCode: "781" },
  { id: "malden", name: "Malden", state: "MA", zip: "02148", lat: 42.4251, lon: -71.0662, areaCode: "781" },
  { id: "medford", name: "Medford", state: "MA", zip: "02155", lat: 42.4184, lon: -71.1062, areaCode: "781" },
  // Minneapolis Metro
  { id: "minneapolis", name: "Minneapolis", state: "MN", zip: "55401", lat: 44.9778, lon: -93.2650, areaCode: "612" },
  { id: "st-paul", name: "St. Paul", state: "MN", zip: "55101", lat: 44.9537, lon: -93.0900, areaCode: "651" },
  { id: "bloomington", name: "Bloomington", state: "MN", zip: "55431", lat: 44.8408, lon: -93.2983, areaCode: "952" },
  { id: "plymouth", name: "Plymouth", state: "MN", zip: "55441", lat: 45.0105, lon: -93.4555, areaCode: "763" },
  { id: "brooklyn-park", name: "Brooklyn Park", state: "MN", zip: "55443", lat: 45.0941, lon: -93.3563, areaCode: "763" },
  { id: "eagan", name: "Eagan", state: "MN", zip: "55121", lat: 44.8041, lon: -93.1669, areaCode: "651" },
  { id: "woodbury", name: "Woodbury", state: "MN", zip: "55125", lat: 44.9239, lon: -92.9594, areaCode: "651" },
  { id: "maple-grove", name: "Maple Grove", state: "MN", zip: "55369", lat: 45.0725, lon: -93.4558, areaCode: "763" },
  // Portland Metro
  { id: "portland", name: "Portland", state: "OR", zip: "97201", lat: 45.5152, lon: -122.6784, areaCode: "503" },
  { id: "beaverton", name: "Beaverton", state: "OR", zip: "97005", lat: 45.4871, lon: -122.8037, areaCode: "503" },
  { id: "hillsboro", name: "Hillsboro", state: "OR", zip: "97123", lat: 45.5229, lon: -122.9898, areaCode: "503" },
  { id: "gresham", name: "Gresham", state: "OR", zip: "97030", lat: 45.5023, lon: -122.4310, areaCode: "503" },
  { id: "lake-oswego", name: "Lake Oswego", state: "OR", zip: "97034", lat: 45.4207, lon: -122.6706, areaCode: "503" },
  { id: "tigard", name: "Tigard", state: "OR", zip: "97223", lat: 45.4312, lon: -122.7715, areaCode: "503" },
  { id: "tualatin", name: "Tualatin", state: "OR", zip: "97062", lat: 45.3838, lon: -122.7637, areaCode: "503" },
  { id: "oregon-city", name: "Oregon City", state: "OR", zip: "97045", lat: 45.3573, lon: -122.6068, areaCode: "503" },
  // Las Vegas Metro
  { id: "las-vegas", name: "Las Vegas", state: "NV", zip: "89101", lat: 36.1699, lon: -115.1398, areaCode: "702" },
  { id: "henderson", name: "Henderson", state: "NV", zip: "89002", lat: 36.0395, lon: -114.9817, areaCode: "702" },
  { id: "north-las-vegas", name: "North Las Vegas", state: "NV", zip: "89030", lat: 36.1989, lon: -115.1175, areaCode: "702" },
  { id: "spring-valley", name: "Spring Valley", state: "NV", zip: "89147", lat: 36.1028, lon: -115.2450, areaCode: "702" },
  { id: "paradise", name: "Paradise", state: "NV", zip: "89109", lat: 36.0970, lon: -115.1467, areaCode: "702" },
  { id: "enterprise", name: "Enterprise", state: "NV", zip: "89139", lat: 36.0268, lon: -115.2176, areaCode: "702" },
  // San Diego Metro
  { id: "san-diego", name: "San Diego", state: "CA", zip: "92101", lat: 32.7157, lon: -117.1611, areaCode: "619" },
  { id: "chula-vista", name: "Chula Vista", state: "CA", zip: "91910", lat: 32.6401, lon: -117.0842, areaCode: "619" },
  { id: "oceanside", name: "Oceanside", state: "CA", zip: "92054", lat: 33.1959, lon: -117.3795, areaCode: "760" },
  { id: "escondido", name: "Escondido", state: "CA", zip: "92025", lat: 33.1192, lon: -117.0864, areaCode: "760" },
  { id: "carlsbad", name: "Carlsbad", state: "CA", zip: "92008", lat: 33.1581, lon: -117.3506, areaCode: "760" },
  { id: "el-cajon", name: "El Cajon", state: "CA", zip: "92020", lat: 32.7948, lon: -116.9625, areaCode: "619" },
  { id: "vista", name: "Vista", state: "CA", zip: "92083", lat: 33.2000, lon: -117.2426, areaCode: "760" },
  { id: "san-marcos", name: "San Marcos", state: "CA", zip: "92069", lat: 33.1434, lon: -117.1661, areaCode: "760" },
  // Tampa Metro
  { id: "tampa", name: "Tampa", state: "FL", zip: "33602", lat: 27.9506, lon: -82.4572, areaCode: "813" },
  { id: "st-petersburg", name: "St. Petersburg", state: "FL", zip: "33701", lat: 27.7676, lon: -82.6403, areaCode: "727" },
  { id: "clearwater", name: "Clearwater", state: "FL", zip: "33755", lat: 27.9659, lon: -82.8001, areaCode: "727" },
  { id: "brandon", name: "Brandon", state: "FL", zip: "33511", lat: 27.9378, lon: -82.2859, areaCode: "813" },
  { id: "largo", name: "Largo", state: "FL", zip: "33770", lat: 27.9095, lon: -82.7873, areaCode: "727" },
  { id: "palm-harbor", name: "Palm Harbor", state: "FL", zip: "34683", lat: 28.0781, lon: -82.7637, areaCode: "727" },
  { id: "riverview", name: "Riverview", state: "FL", zip: "33578", lat: 27.8764, lon: -82.3265, areaCode: "813" },
  // Orlando Metro
  { id: "orlando", name: "Orlando", state: "FL", zip: "32801", lat: 28.5383, lon: -81.3792, areaCode: "407" },
  { id: "kissimmee", name: "Kissimmee", state: "FL", zip: "34741", lat: 28.2920, lon: -81.4076, areaCode: "407" },
  { id: "sanford", name: "Sanford", state: "FL", zip: "32771", lat: 28.8003, lon: -81.2698, areaCode: "407" },
  { id: "altamonte-springs", name: "Altamonte Springs", state: "FL", zip: "32701", lat: 28.6611, lon: -81.3656, areaCode: "407" },
  { id: "winter-park", name: "Winter Park", state: "FL", zip: "32789", lat: 28.5993, lon: -81.3393, areaCode: "407" },
  { id: "ocoee", name: "Ocoee", state: "FL", zip: "34761", lat: 28.5692, lon: -81.5440, areaCode: "407" },
  { id: "apopka", name: "Apopka", state: "FL", zip: "32703", lat: 28.6934, lon: -81.5322, areaCode: "407" },
  // Nashville Metro
  { id: "nashville", name: "Nashville", state: "TN", zip: "37203", lat: 36.1627, lon: -86.7816, areaCode: "615" },
  { id: "franklin", name: "Franklin", state: "TN", zip: "37064", lat: 35.9251, lon: -86.8689, areaCode: "615" },
  { id: "murfreesboro", name: "Murfreesboro", state: "TN", zip: "37130", lat: 35.8456, lon: -86.3903, areaCode: "615" },
  { id: "hendersonville", name: "Hendersonville", state: "TN", zip: "37075", lat: 36.3048, lon: -86.6200, areaCode: "615" },
  { id: "gallatin", name: "Gallatin", state: "TN", zip: "37066", lat: 36.3887, lon: -86.4467, areaCode: "615" },
  { id: "lebanon", name: "Lebanon", state: "TN", zip: "37087", lat: 36.2081, lon: -86.2911, areaCode: "615" },
  { id: "mt-juliet", name: "Mt. Juliet", state: "TN", zip: "37122", lat: 36.2001, lon: -86.5186, areaCode: "615" },
  // Standalone cities
  { id: "austin", name: "Austin", state: "TX", zip: "78701", lat: 30.2672, lon: -97.7431, areaCode: "512" },
  { id: "philadelphia", name: "Philadelphia", state: "PA", zip: "19102", lat: 39.9526, lon: -75.1652, areaCode: "215" },
  { id: "columbus", name: "Columbus", state: "OH", zip: "43215", lat: 39.9612, lon: -82.9988, areaCode: "614" },
  { id: "raleigh", name: "Raleigh", state: "NC", zip: "27601", lat: 35.7796, lon: -78.6382, areaCode: "919" },
  { id: "cincinnati", name: "Cincinnati", state: "OH", zip: "45202", lat: 39.1031, lon: -84.5120, areaCode: "513" },
  { id: "baton-rouge", name: "Baton Rouge", state: "LA", zip: "70801", lat: 30.4515, lon: -91.1871, areaCode: "225" },
  { id: "new-orleans", name: "New Orleans", state: "LA", zip: "70112", lat: 29.9511, lon: -90.0715, areaCode: "504" },
  { id: "kansas-city", name: "Kansas City", state: "MO", zip: "64106", lat: 39.0997, lon: -94.5786, areaCode: "816" },
  { id: "honolulu", name: "Honolulu", state: "HI", zip: "96813", lat: 21.3069, lon: -157.8583, areaCode: "808" },
  { id: "louisville", name: "Louisville", state: "KY", zip: "40202", lat: 38.2527, lon: -85.7585, areaCode: "502" },
  { id: "sacramento", name: "Sacramento", state: "CA", zip: "95814", lat: 38.5816, lon: -121.4944, areaCode: "916" },
  { id: "san-antonio", name: "San Antonio", state: "TX", zip: "78205", lat: 29.4241, lon: -98.4936, areaCode: "210" },
  { id: "baltimore", name: "Baltimore", state: "MD", zip: "21201", lat: 39.2904, lon: -76.6122, areaCode: "410" },
  { id: "charlotte", name: "Charlotte", state: "NC", zip: "28202", lat: 35.2271, lon: -80.8431, areaCode: "704" },
  { id: "detroit", name: "Detroit", state: "MI", zip: "48226", lat: 42.3314, lon: -83.0458, areaCode: "313" },
  { id: "tucson", name: "Tucson", state: "AZ", zip: "85701", lat: 32.2226, lon: -110.9747, areaCode: "520" },
  { id: "milwaukee", name: "Milwaukee", state: "WI", zip: "53202", lat: 43.0389, lon: -87.9065, areaCode: "414" },
  { id: "albuquerque", name: "Albuquerque", state: "NM", zip: "87101", lat: 35.0844, lon: -106.6504, areaCode: "505" },
  { id: "virginia-beach", name: "Virginia Beach", state: "VA", zip: "23451", lat: 36.8529, lon: -75.9780, areaCode: "757" },
  { id: "el-paso", name: "El Paso", state: "TX", zip: "79901", lat: 31.7619, lon: -106.4850, areaCode: "915" },
  { id: "memphis", name: "Memphis", state: "TN", zip: "38103", lat: 35.1495, lon: -90.0490, areaCode: "901" },
  { id: "pittsburgh", name: "Pittsburgh", state: "PA", zip: "15222", lat: 40.4406, lon: -79.9959, areaCode: "412" },
  { id: "durham", name: "Durham", state: "NC", zip: "27701", lat: 35.9940, lon: -78.8986, areaCode: "919" },
  { id: "buffalo", name: "Buffalo", state: "NY", zip: "14202", lat: 42.8864, lon: -78.8784, areaCode: "716" },
  { id: "wichita", name: "Wichita", state: "KS", zip: "67202", lat: 37.6872, lon: -97.3301, areaCode: "316" },
  { id: "spokane", name: "Spokane", state: "WA", zip: "99201", lat: 47.6588, lon: -117.4260, areaCode: "509" },
  { id: "charleston", name: "Charleston", state: "SC", zip: "29401", lat: 32.7765, lon: -79.9311, areaCode: "843" },
  { id: "hartford", name: "Hartford", state: "CT", zip: "06103", lat: 41.7658, lon: -72.6734, areaCode: "860" },
  { id: "cleveland", name: "Cleveland", state: "OH", zip: "44114", lat: 41.4993, lon: -81.6944, areaCode: "216" },
  { id: "colorado-springs", name: "Colorado Springs", state: "CO", zip: "80903", lat: 38.8339, lon: -104.8214, areaCode: "719" },
  { id: "boise", name: "Boise", state: "ID", zip: "83702", lat: 43.6150, lon: -116.2023, areaCode: "208" },
  { id: "greensboro", name: "Greensboro", state: "NC", zip: "27401", lat: 36.0726, lon: -79.7920, areaCode: "336" },
  { id: "jacksonville", name: "Jacksonville", state: "FL", zip: "32202", lat: 30.3322, lon: -81.6557, areaCode: "904" },
  { id: "chattanooga", name: "Chattanooga", state: "TN", zip: "37402", lat: 35.0456, lon: -85.3097, areaCode: "423" },
  { id: "knoxville", name: "Knoxville", state: "TN", zip: "37902", lat: 35.9606, lon: -83.9207, areaCode: "865" },
  { id: "lincoln", name: "Lincoln", state: "NE", zip: "68508", lat: 40.8136, lon: -96.7026, areaCode: "402" },
  { id: "tallahassee", name: "Tallahassee", state: "FL", zip: "32301", lat: 30.4383, lon: -84.2807, areaCode: "850" },
  { id: "overland-park", name: "Overland Park", state: "KS", zip: "66204", lat: 38.9822, lon: -94.6708, areaCode: "913" },
  { id: "norfolk", name: "Norfolk", state: "VA", zip: "23510", lat: 36.8508, lon: -76.2859, areaCode: "757" },
  { id: "savannah", name: "Savannah", state: "GA", zip: "31401", lat: 32.0809, lon: -81.0912, areaCode: "912" },
  { id: "cary", name: "Cary", state: "NC", zip: "27511", lat: 35.7915, lon: -78.7811, areaCode: "919" },
  { id: "salt-lake-city", name: "Salt Lake City", state: "UT", zip: "84101", lat: 40.7608, lon: -111.8910, areaCode: "801" },
  { id: "sioux-falls", name: "Sioux Falls", state: "SD", zip: "57104", lat: 43.5460, lon: -96.7313, areaCode: "605" },
  { id: "wilmington", name: "Wilmington", state: "NC", zip: "28401", lat: 34.2257, lon: -77.9447, areaCode: "910" },
];

// ── data pools ────────────────────────────────────────────────────────────────

interface PermitTemplate {
  desc: string;
  trades: Trade[];
  min: number;
  max: number;
}

const TEMPLATES: PermitTemplate[] = [
  // HVAC
  { desc: "Complete HVAC system replacement for commercial office building including new rooftop units, ductwork, and building automation controls", trades: ["HVAC"], min: 500000, max: 3500000 },
  { desc: "Installation of new chiller plant and cooling tower for 200,000 SF commercial complex with redundant piping", trades: ["HVAC"], min: 800000, max: 4000000 },
  { desc: "Retrofit existing HVAC system with high-efficiency variable refrigerant flow (VRF) units across all floors", trades: ["HVAC"], min: 350000, max: 2000000 },
  // Electrical
  { desc: "Electrical service upgrade and panel replacement with new 4000A main switchgear and emergency generator", trades: ["Electrical"], min: 400000, max: 2500000 },
  { desc: "Complete electrical rewiring of commercial building including new LED lighting and EV charging stations", trades: ["Electrical"], min: 300000, max: 1800000 },
  { desc: "Installation of 500kW solar panel array with battery storage system and grid interconnection", trades: ["Electrical"], min: 600000, max: 3000000 },
  // Plumbing
  { desc: "Plumbing rough-in for new medical office space including exam rooms, labs, and specialized waste systems", trades: ["Plumbing"], min: 250000, max: 1500000 },
  { desc: "Complete plumbing renovation for restaurant and commercial kitchen with new grease traps and backflow preventers", trades: ["Plumbing"], min: 150000, max: 800000 },
  { desc: "Water service upgrade and fire line installation for 5-story mixed-use development", trades: ["Plumbing", "Fire Suppression"], min: 400000, max: 2000000 },
  // Roofing
  { desc: "Complete roof replacement on commercial building with TPO membrane system, new insulation, and parapet wall repairs", trades: ["Roofing"], min: 200000, max: 1200000 },
  { desc: "Installation of green roof system with integrated stormwater management on commercial structure", trades: ["Roofing"], min: 300000, max: 1500000 },
  { desc: "Roofing and waterproofing for new parking garage structure including expansion joints and drainage systems", trades: ["Roofing", "Concrete"], min: 500000, max: 2500000 },
  // Fire Suppression
  { desc: "Installation of wet sprinkler system throughout commercial office building per NFPA 13 requirements", trades: ["Fire Suppression"], min: 200000, max: 1000000 },
  { desc: "Upgrade fire alarm and suppression systems including new standpipe and smoke detection for high-rise building", trades: ["Fire Suppression", "Electrical"], min: 400000, max: 2000000 },
  { desc: "Fire suppression system installation for commercial kitchen hood and assembly occupancy areas", trades: ["Fire Suppression"], min: 100000, max: 500000 },
  // Glass & Glazing
  { desc: "Installation of glass curtain wall system on 12-story commercial tower with low-E insulated glazing units", trades: ["Glass & Glazing"], min: 800000, max: 5000000 },
  { desc: "Storefront glass and aluminum framing installation for retail complex with energy-efficient glazing", trades: ["Glass & Glazing"], min: 150000, max: 800000 },
  { desc: "Window replacement program for commercial building with new thermally-broken aluminum frames", trades: ["Glass & Glazing"], min: 200000, max: 1200000 },
  // Concrete
  { desc: "Concrete foundation and slab-on-grade for new 50,000 SF warehouse and distribution center", trades: ["Concrete"], min: 400000, max: 2500000 },
  { desc: "Structural concrete work for multi-level parking garage including post-tensioned slabs and ramps", trades: ["Concrete", "Structural Steel"], min: 1000000, max: 8000000 },
  { desc: "Foundation repair and concrete restoration for commercial building including crack injection and waterproofing", trades: ["Concrete"], min: 150000, max: 900000 },
  // Structural Steel
  { desc: "Structural steel erection for new 8-story commercial office building, approximately 2,400 tons", trades: ["Structural Steel"], min: 2000000, max: 12000000 },
  { desc: "Steel frame construction for industrial manufacturing facility including mezzanine and overhead crane rails", trades: ["Structural Steel"], min: 1500000, max: 8000000 },
  { desc: "Structural steel reinforcement and seismic retrofit of existing commercial building per updated code", trades: ["Structural Steel"], min: 500000, max: 3000000 },
  // Demolition
  { desc: "Interior demolition of 45,000 SF commercial space for upcoming tenant improvement project", trades: ["Demolition"], min: 80000, max: 400000 },
  { desc: "Complete building demolition and site preparation for new commercial development project", trades: ["Demolition"], min: 200000, max: 1500000 },
  { desc: "Selective demolition and hazardous material abatement for building renovation and modernization", trades: ["Demolition"], min: 100000, max: 600000 },
  // General Construction
  { desc: "Tenant improvement buildout for new corporate office space, 35,000 SF with conference rooms and open office areas", trades: ["General Construction"], min: 500000, max: 3500000 },
  { desc: "Commercial renovation of retail space including new flooring, ceilings, lighting, and ADA compliance upgrades", trades: ["General Construction"], min: 200000, max: 1200000 },
  { desc: "New construction of 3-story mixed-use commercial building with retail on ground floor and offices above", trades: ["General Construction", "Concrete", "Structural Steel"], min: 3000000, max: 15000000 },
  { desc: "Restaurant buildout including commercial kitchen, dining area, bar, and outdoor patio space", trades: ["General Construction", "Plumbing"], min: 300000, max: 1800000 },
  { desc: "Medical office buildout including exam rooms, imaging suite, and specialized MEP systems", trades: ["General Construction", "HVAC", "Plumbing"], min: 800000, max: 5000000 },
  // Multi-trade
  { desc: "Major hotel renovation including HVAC replacement, electrical upgrade, plumbing modernization, and new fire alarm system", trades: ["HVAC", "Electrical", "Plumbing"], min: 2000000, max: 12000000 },
  { desc: "New data center construction with precision cooling, redundant electrical systems, and clean agent fire suppression", trades: ["HVAC", "Electrical", "Fire Suppression"], min: 3000000, max: 15000000 },
];

const GC_COMPANIES: string[] = [
  "Turner Construction", "Skanska USA", "Hensel Phelps", "Clark Construction",
  "Moss Construction", "Webcor Builders", "DPR Construction", "Holder Construction",
  "Gilbane Building Company", "McCarthy Building Companies", "Brasfield & Gorrie",
  "Barton Malow", "Mortenson Construction", "Swinerton Builders", "Whiting-Turner",
  "Walsh Construction", "AECOM Hunt", "Suffolk Construction", "Balfour Beatty",
  "PCL Construction", "Shawmut Design", "Structure Tone", "Lendlease",
  "JE Dunn Construction", "Ryan Companies", "Pepper Construction", "Power Construction",
  "Bulley & Andrews", "Clayco Inc", "Manhattan Construction", "Austin Industries",
  "Rogers-O'Brien Construction", "Cadence McShane", "Harvey-Cleary Builders",
  "Tellepsen Builders", "SpawGlass Contractors", "Flintco LLC",
  "W.M. Jordan Company", "The Weitz Company", "Alston Construction",
  "JMB Construction", "Pacific Building Group", "Bernards Construction",
  "Charles Pankow Builders", "Rudolph and Sletten", "Performance Contractors",
  "Baker Concrete Construction", "Granite Construction", "Kiewit Corporation",
  "BL Harbert International",
];

const FIRST_NAMES: string[] = [
  "Mike", "Sarah", "James", "Jennifer", "Robert", "Maria", "David", "Lisa",
  "John", "Patricia", "Mark", "Linda", "Steve", "Karen", "Chris", "Angela",
  "Tom", "Jessica", "Brian", "Michelle", "Kevin", "Rachel", "Eric", "Amanda",
  "Dan", "Heather", "Scott", "Nicole", "Jeff", "Stephanie",
];

const LAST_NAMES: string[] = [
  "Reynolds", "Chen", "Kowalski", "Williams", "Johnson", "Martinez",
  "Anderson", "Thompson", "Garcia", "Robinson", "Clark", "Lewis",
  "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Lopez",
  "Hill", "Green", "Adams", "Baker", "Nelson", "Mitchell", "Perez",
  "Roberts", "Turner", "Phillips",
];

const STREET_NAMES: string[] = [
  "Main", "Oak", "Elm", "Maple", "Pine", "Cedar", "First", "Second", "Third",
  "Fourth", "Fifth", "Market", "Broadway", "Washington", "Lincoln", "Jefferson",
  "Madison", "Park", "Highland", "Lake", "Spring", "Valley", "Hill", "Ridge",
  "Commerce", "Industrial", "Tech Center", "Innovation", "Century", "Harbor",
  "Mission", "University", "Central", "State", "Liberty", "Union", "Pioneer",
  "Heritage", "Sunset", "Peachtree", "Congress", "Travis", "Magnolia",
];

const STREET_TYPES: string[] = [
  "St", "Ave", "Blvd", "Dr", "Way", "Pkwy", "Rd", "Pl", "Ln",
];

const STATUSES: PermitStatus[] = ["Issued", "Under Review", "Approved", "Completed"];

// ── permit generator ──────────────────────────────────────────────────────────

function generatePermitsForCity(city: CityMeta): Permit[] {
  const rng = new Rng(`permits-${city.id}-v1`);
  const count = rng.int(3, 7);
  const permits: Permit[] = [];

  for (let i = 0; i < count; i++) {
    const template = rng.pick(TEMPLATES);
    const streetNum = rng.int(100, 9999);
    const streetName = rng.pick(STREET_NAMES);
    const streetType = rng.pick(STREET_TYPES);
    const address = `${streetNum} ${streetName} ${streetType}`;

    const company = rng.pick(GC_COMPANIES);
    const confRoll = rng.next();
    const confidence: ContactConfidence = confRoll < 0.5 ? "High" : confRoll < 0.8 ? "Medium" : "Low";

    const firstName = confidence !== "Low" ? rng.pick(FIRST_NAMES) : null;
    const lastName = confidence !== "Low" ? rng.pick(LAST_NAMES) : null;
    const contactName = firstName && lastName ? `${firstName} ${lastName}` : null;

    const companySlug = company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14);
    const email = contactName
      ? `${firstName!.charAt(0).toLowerCase()}${lastName!.toLowerCase()}@${companySlug}.com`
      : null;
    const phone = confidence !== "Low"
      ? `(${city.areaCode}) 555-${String(rng.int(1000, 9999)).padStart(4, "0")}`
      : null;

    const rawValue = rng.int(template.min, template.max);
    const estimatedValue = Math.round(rawValue / 1000) * 1000;

    const dayOffset = rng.int(1, 30);
    const status = rng.pick(STATUSES);

    const latOffset = (rng.next() - 0.5) * 0.04;
    const lonOffset = (rng.next() - 0.5) * 0.04;

    const permitHash = hash(`${city.id}-${i}`);
    const permitNum = String(permitHash & 0xfffff).padStart(6, "0");

    permits.push({
      id: `${city.id}-${String(i + 1).padStart(3, "0")}`,
      permitNumber: `BLD-2026-${permitNum}`,
      address,
      city: city.name,
      state: city.state,
      zip: city.zip,
      latitude: Number((city.lat + latOffset).toFixed(4)),
      longitude: Number((city.lon + lonOffset).toFixed(4)),
      filingDate: daysAgo(dayOffset),
      description: template.desc,
      estimatedValue,
      status,
      trades: template.trades,
      gcContact: {
        companyName: company,
        contactName,
        phone,
        email,
        confidence,
      },
      source: `data.${city.id}.gov`,
      sourceUpdatedAt: daysAgo(Math.max(1, dayOffset - rng.int(0, 2))),
    });
  }

  return permits;
}

// ── build all permits ─────────────────────────────────────────────────────────

const ALL_PERMITS: Permit[] = CITIES.flatMap(generatePermitsForCity);

// ── city lookup for filtering ─────────────────────────────────────────────────

const CITY_STATE_TO_ID: Record<string, string> = {};
for (const c of CITIES) {
  CITY_STATE_TO_ID[`${c.name}|${c.state}`] = c.id;
}

export function getMockPermitsForMetros(metroIds: string[]): Permit[] {
  if (metroIds.length === 0) return ALL_PERMITS;
  return ALL_PERMITS.filter((p) => {
    const key = `${p.city}|${p.state}`;
    const cityId = CITY_STATE_TO_ID[key];
    return cityId !== undefined && metroIds.includes(cityId);
  });
}

export const MOCK_PERMITS = ALL_PERMITS;

// ── currency formatters ───────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

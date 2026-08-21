export interface Metro {
  id: string;
  name: string;
  state: string;
  label: string;
}

export const METROS: Metro[] = [
  { id: "albuquerque", name: "Albuquerque", state: "NM", label: "Albuquerque, NM" },
  { id: "alexandria", name: "Alexandria", state: "VA", label: "Alexandria, VA" },
  { id: "allen", name: "Allen", state: "TX", label: "Allen, TX" },
  { id: "alpharetta", name: "Alpharetta", state: "GA", label: "Alpharetta, GA" },
  { id: "altamonte-springs", name: "Altamonte Springs", state: "FL", label: "Altamonte Springs, FL" },
  { id: "anaheim", name: "Anaheim", state: "CA", label: "Anaheim, CA" },
  { id: "anna-tx", name: "Anna", state: "TX", label: "Anna, TX" },
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
  { id: "baltimore-county", name: "Baltimore County", state: "MD", label: "Baltimore County, MD" },
  { id: "baton-rouge", name: "Baton Rouge", state: "LA", label: "Baton Rouge, LA" },
  { id: "bayonne", name: "Bayonne", state: "NJ", label: "Bayonne, NJ" },
  { id: "baytown", name: "Baytown", state: "TX", label: "Baytown, TX" },
  { id: "beaverton", name: "Beaverton", state: "OR", label: "Beaverton, OR" },
  { id: "bellevue", name: "Bellevue", state: "WA", label: "Bellevue, WA" },
  { id: "bend", name: "Bend", state: "OR", label: "Bend, OR" },
  { id: "berkeley", name: "Berkeley", state: "CA", label: "Berkeley, CA" },
  { id: "bethesda", name: "Bethesda", state: "MD", label: "Bethesda, MD" },
  { id: "bloomfield", name: "Bloomfield", state: "NJ", label: "Bloomfield, NJ" },
  { id: "bloomington", name: "Bloomington", state: "MN", label: "Bloomington, MN" },
  { id: "boca-raton", name: "Boca Raton", state: "FL", label: "Boca Raton, FL" },
  { id: "boise", name: "Boise", state: "ID", label: "Boise, ID" },
  { id: "boston", name: "Boston", state: "MA", label: "Boston, MA" },
  { id: "bothell", name: "Bothell", state: "WA", label: "Bothell, WA" },
  { id: "boulder", name: "Boulder", state: "CO", label: "Boulder, CO" },
  { id: "branchburg", name: "Branchburg", state: "NJ", label: "Branchburg, NJ" },
  { id: "brandon", name: "Brandon", state: "FL", label: "Brandon, FL" },
  { id: "brick", name: "Brick", state: "NJ", label: "Brick, NJ" },
  { id: "bridgewater", name: "Bridgewater", state: "NJ", label: "Bridgewater, NJ" },
  { id: "brookline", name: "Brookline", state: "MA", label: "Brookline, MA" },
  { id: "brooklyn-park", name: "Brooklyn Park", state: "MN", label: "Brooklyn Park, MN" },
  { id: "broomfield", name: "Broomfield", state: "CO", label: "Broomfield, CO" },
  { id: "buffalo", name: "Buffalo", state: "NY", label: "Buffalo, NY" },
  { id: "burbank", name: "Burbank", state: "CA", label: "Burbank, CA" },
  { id: "cambridge", name: "Cambridge", state: "MA", label: "Cambridge, MA" },
  { id: "camden", name: "Camden", state: "NJ", label: "Camden, NJ" },
  { id: "cape-coral", name: "Cape Coral", state: "FL", label: "Cape Coral, FL" },
  { id: "carlsbad", name: "Carlsbad", state: "CA", label: "Carlsbad, CA" },
  { id: "cary", name: "Cary", state: "NC", label: "Cary, NC" },
  { id: "celina", name: "Celina", state: "TX", label: "Celina, TX" },
  { id: "centennial", name: "Centennial", state: "CO", label: "Centennial, CO" },
  { id: "chandler", name: "Chandler", state: "AZ", label: "Chandler, AZ" },
  { id: "charleston", name: "Charleston", state: "SC", label: "Charleston, SC" },
  { id: "charlotte", name: "Charlotte", state: "NC", label: "Charlotte, NC" },
  { id: "charlottesville", name: "Charlottesville", state: "VA", label: "Charlottesville, VA" },
  { id: "chattanooga", name: "Chattanooga", state: "TN", label: "Chattanooga, TN" },
  { id: "cherry-hill", name: "Cherry Hill", state: "NJ", label: "Cherry Hill, NJ" },
  { id: "chicago", name: "Chicago", state: "IL", label: "Chicago, IL" },
  { id: "chula-vista", name: "Chula Vista", state: "CA", label: "Chula Vista, CA" },
  { id: "cicero", name: "Cicero", state: "IL", label: "Cicero, IL" },
  { id: "cincinnati", name: "Cincinnati", state: "OH", label: "Cincinnati, OH" },
  { id: "clearwater", name: "Clearwater", state: "FL", label: "Clearwater, FL" },
  { id: "cleveland", name: "Cleveland", state: "OH", label: "Cleveland, OH" },
  { id: "clifton", name: "Clifton", state: "NJ", label: "Clifton, NJ" },
  { id: "college-station", name: "College Station", state: "TX", label: "College Station, TX" },
  { id: "colorado-springs", name: "Colorado Springs", state: "CO", label: "Colorado Springs, CO" },
  { id: "columbus", name: "Columbus", state: "OH", label: "Columbus, OH" },
  { id: "concord", name: "Concord", state: "CA", label: "Concord, CA" },
  { id: "conroe", name: "Conroe", state: "TX", label: "Conroe, TX" },
  { id: "coral-springs", name: "Coral Springs", state: "FL", label: "Coral Springs, FL" },
  { id: "corona-ca", name: "Corona", state: "CA", label: "Corona, CA" },
  { id: "dallas", name: "Dallas", state: "TX", label: "Dallas, TX" },
  { id: "daly-city", name: "Daly City", state: "CA", label: "Daly City, CA" },
  { id: "decatur", name: "Decatur", state: "GA", label: "Decatur, GA" },
  { id: "deerfield-beach", name: "Deerfield Beach", state: "FL", label: "Deerfield Beach, FL" },
  { id: "denton", name: "Denton", state: "TX", label: "Denton, TX" },
  { id: "denver", name: "Denver", state: "CO", label: "Denver, CO" },
  { id: "denville", name: "Denville", state: "NJ", label: "Denville, NJ" },
  { id: "detroit", name: "Detroit", state: "MI", label: "Detroit, MI" },
  { id: "downey", name: "Downey", state: "CA", label: "Downey, CA" },
  { id: "dunwoody", name: "Dunwoody", state: "GA", label: "Dunwoody, GA" },
  { id: "durham", name: "Durham", state: "NC", label: "Durham, NC" },
  { id: "eagan", name: "Eagan", state: "MN", label: "Eagan, MN" },
  { id: "east-brunswick", name: "East Brunswick", state: "NJ", label: "East Brunswick, NJ" },
  { id: "east-windsor", name: "East Windsor", state: "NJ", label: "East Windsor, NJ" },
  { id: "eatontown", name: "Eatontown", state: "NJ", label: "Eatontown, NJ" },
  { id: "edison", name: "Edison", state: "NJ", label: "Edison, NJ" },
  { id: "el-cajon", name: "El Cajon", state: "CA", label: "El Cajon, CA" },
  { id: "el-monte", name: "El Monte", state: "CA", label: "El Monte, CA" },
  { id: "el-paso", name: "El Paso", state: "TX", label: "El Paso, TX" },
  { id: "elgin", name: "Elgin", state: "IL", label: "Elgin, IL" },
  { id: "elizabeth", name: "Elizabeth", state: "NJ", label: "Elizabeth, NJ" },
  { id: "englewood", name: "Englewood", state: "NJ", label: "Englewood, NJ" },
  { id: "enterprise", name: "Enterprise", state: "NV", label: "Enterprise, NV" },
  { id: "escondido", name: "Escondido", state: "CA", label: "Escondido, CA" },
  { id: "evanston", name: "Evanston", state: "IL", label: "Evanston, IL" },
  { id: "everett", name: "Everett", state: "WA", label: "Everett, WA" },
  { id: "evesham", name: "Evesham", state: "NJ", label: "Evesham, NJ" },
  { id: "ewing", name: "Ewing", state: "NJ", label: "Ewing, NJ" },
  { id: "fairfax", name: "Fairfax", state: "VA", label: "Fairfax, VA" },
  { id: "fairfax-county", name: "Fairfax County", state: "VA", label: "Fairfax County, VA" },
  { id: "fairfield-nj", name: "Fairfield", state: "NJ", label: "Fairfield, NJ" },
  { id: "federal-way", name: "Federal Way", state: "WA", label: "Federal Way, WA" },
  { id: "florham-park", name: "Florham Park", state: "NJ", label: "Florham Park, NJ" },
  { id: "forsyth-county", name: "Forsyth County", state: "GA", label: "Forsyth County, GA" },
  { id: "fort-collins", name: "Fort Collins", state: "CO", label: "Fort Collins, CO" },
  { id: "fort-lauderdale", name: "Fort Lauderdale", state: "FL", label: "Fort Lauderdale, FL" },
  { id: "fort-lee", name: "Fort Lee", state: "NJ", label: "Fort Lee, NJ" },
  { id: "fort-worth", name: "Fort Worth", state: "TX", label: "Fort Worth, TX" },
  { id: "franklin", name: "Franklin", state: "TN", label: "Franklin, TN" },
  { id: "franklin-twp", name: "Franklin Twp", state: "NJ", label: "Franklin Twp, NJ" },
  { id: "freehold", name: "Freehold", state: "NJ", label: "Freehold, NJ" },
  { id: "fremont", name: "Fremont", state: "CA", label: "Fremont, CA" },
  { id: "frisco", name: "Frisco", state: "TX", label: "Frisco, TX" },
  { id: "gainesville-fl", name: "Gainesville", state: "FL", label: "Gainesville, FL" },
  { id: "gaithersburg", name: "Gaithersburg", state: "MD", label: "Gaithersburg, MD" },
  { id: "gallatin", name: "Gallatin", state: "TN", label: "Gallatin, TN" },
  { id: "garland", name: "Garland", state: "TX", label: "Garland, TX" },
  { id: "gilbert", name: "Gilbert", state: "AZ", label: "Gilbert, AZ" },
  { id: "glendale", name: "Glendale", state: "CA", label: "Glendale, CA" },
  { id: "glendale-az", name: "Glendale", state: "AZ", label: "Glendale, AZ" },
  { id: "goodyear", name: "Goodyear", state: "AZ", label: "Goodyear, AZ" },
  { id: "greensboro", name: "Greensboro", state: "NC", label: "Greensboro, NC" },
  { id: "gresham", name: "Gresham", state: "OR", label: "Gresham, OR" },
  { id: "hackensack", name: "Hackensack", state: "NJ", label: "Hackensack, NJ" },
  { id: "hamilton-nj", name: "Hamilton", state: "NJ", label: "Hamilton, NJ" },
  { id: "hanover", name: "Hanover", state: "NJ", label: "Hanover, NJ" },
  { id: "hartford", name: "Hartford", state: "CT", label: "Hartford, CT" },
  { id: "hayward", name: "Hayward", state: "CA", label: "Hayward, CA" },
  { id: "henderson", name: "Henderson", state: "NV", label: "Henderson, NV" },
  { id: "hendersonville", name: "Hendersonville", state: "TN", label: "Hendersonville, TN" },
  { id: "hialeah", name: "Hialeah", state: "FL", label: "Hialeah, FL" },
  { id: "hillsboro", name: "Hillsboro", state: "OR", label: "Hillsboro, OR" },
  { id: "hillsborough", name: "Hillsborough", state: "NJ", label: "Hillsborough, NJ" },
  { id: "hoboken", name: "Hoboken", state: "NJ", label: "Hoboken, NJ" },
  { id: "hollywood-fl", name: "Hollywood", state: "FL", label: "Hollywood, FL" },
  { id: "honolulu", name: "Honolulu", state: "HI", label: "Honolulu, HI" },
  { id: "houston", name: "Houston", state: "TX", label: "Houston, TX" },
  { id: "howard-county", name: "Howard County", state: "MD", label: "Howard County, MD" },
  { id: "howell", name: "Howell", state: "NJ", label: "Howell, NJ" },
  { id: "inglewood", name: "Inglewood", state: "CA", label: "Inglewood, CA" },
  { id: "irving", name: "Irving", state: "TX", label: "Irving, TX" },
  { id: "jackson-nj", name: "Jackson", state: "NJ", label: "Jackson, NJ" },
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
  { id: "lakewood-nj", name: "Lakewood", state: "NJ", label: "Lakewood, NJ" },
  { id: "laredo", name: "Laredo", state: "TX", label: "Laredo, TX" },
  { id: "largo", name: "Largo", state: "FL", label: "Largo, FL" },
  { id: "las-vegas", name: "Las Vegas", state: "NV", label: "Las Vegas, NV" },
  { id: "lawrence-nj", name: "Lawrence", state: "NJ", label: "Lawrence, NJ" },
  { id: "league-city", name: "League City", state: "TX", label: "League City, TX" },
  { id: "lebanon", name: "Lebanon", state: "TN", label: "Lebanon, TN" },
  { id: "lincoln", name: "Lincoln", state: "NE", label: "Lincoln, NE" },
  { id: "linden", name: "Linden", state: "NJ", label: "Linden, NJ" },
  { id: "livingston", name: "Livingston", state: "NJ", label: "Livingston, NJ" },
  { id: "long-beach", name: "Long Beach", state: "CA", label: "Long Beach, CA" },
  { id: "longmont", name: "Longmont", state: "CO", label: "Longmont, CO" },
  { id: "los-angeles", name: "Los Angeles", state: "CA", label: "Los Angeles, CA" },
  { id: "louisville", name: "Louisville", state: "KY", label: "Louisville, KY" },
  { id: "mahwah", name: "Mahwah", state: "NJ", label: "Mahwah, NJ" },
  { id: "malden", name: "Malden", state: "MA", label: "Malden, MA" },
  { id: "manalapan", name: "Manalapan", state: "NJ", label: "Manalapan, NJ" },
  { id: "maple-grove", name: "Maple Grove", state: "MN", label: "Maple Grove, MN" },
  { id: "marietta", name: "Marietta", state: "GA", label: "Marietta, GA" },
  { id: "mckinney", name: "McKinney", state: "TX", label: "McKinney, TX" },
  { id: "md-annapolis", name: "Annapolis", state: "MD", label: "Annapolis, MD" },
  { id: "md-anne-arundel", name: "Anne Arundel County", state: "MD", label: "Anne Arundel County, MD" },
  { id: "md-carroll", name: "Carroll County", state: "MD", label: "Carroll County, MD" },
  { id: "md-harford", name: "Harford County", state: "MD", label: "Harford County, MD" },
  { id: "medford", name: "Medford", state: "MA", label: "Medford, MA" },
  { id: "melissa", name: "Melissa", state: "TX", label: "Melissa, TX" },
  { id: "memphis", name: "Memphis", state: "TN", label: "Memphis, TN" },
  { id: "mesa", name: "Mesa", state: "AZ", label: "Mesa, AZ" },
  { id: "miami", name: "Miami", state: "FL", label: "Miami, FL" },
  { id: "middletown", name: "Middletown", state: "NJ", label: "Middletown, NJ" },
  { id: "midland", name: "Midland", state: "TX", label: "Midland, TX" },
  { id: "millburn", name: "Millburn", state: "NJ", label: "Millburn, NJ" },
  { id: "milwaukee", name: "Milwaukee", state: "WI", label: "Milwaukee, WI" },
  { id: "minneapolis", name: "Minneapolis", state: "MN", label: "Minneapolis, MN" },
  { id: "missouri-city", name: "Missouri City", state: "TX", label: "Missouri City, TX" },
  { id: "monroe-twp", name: "Monroe Twp", state: "NJ", label: "Monroe Twp, NJ" },
  { id: "moorestown", name: "Moorestown", state: "NJ", label: "Moorestown, NJ" },
  { id: "morristown", name: "Morristown", state: "NJ", label: "Morristown, NJ" },
  { id: "mount-laurel", name: "Mount Laurel", state: "NJ", label: "Mount Laurel, NJ" },
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
  { id: "old-bridge", name: "Old Bridge", state: "NJ", label: "Old Bridge, NJ" },
  { id: "omaha", name: "Omaha", state: "NE", label: "Omaha, NE" },
  { id: "oregon-city", name: "Oregon City", state: "OR", label: "Oregon City, OR" },
  { id: "orlando", name: "Orlando", state: "FL", label: "Orlando, FL" },
  { id: "overland-park", name: "Overland Park", state: "KS", label: "Overland Park, KS" },
  { id: "palm-bay", name: "Palm Bay", state: "FL", label: "Palm Bay, FL" },
  { id: "palm-harbor", name: "Palm Harbor", state: "FL", label: "Palm Harbor, FL" },
  { id: "palo-alto", name: "Palo Alto", state: "CA", label: "Palo Alto, CA" },
  { id: "paradise", name: "Paradise", state: "NV", label: "Paradise, NV" },
  { id: "paramus", name: "Paramus", state: "NJ", label: "Paramus, NJ" },
  { id: "parsippany", name: "Parsippany", state: "NJ", label: "Parsippany, NJ" },
  { id: "pasadena", name: "Pasadena", state: "CA", label: "Pasadena, CA" },
  { id: "pasadena-tx", name: "Pasadena", state: "TX", label: "Pasadena, TX" },
  { id: "paterson", name: "Paterson", state: "NJ", label: "Paterson, NJ" },
  { id: "pearland", name: "Pearland", state: "TX", label: "Pearland, TX" },
  { id: "pembroke-pines", name: "Pembroke Pines", state: "FL", label: "Pembroke Pines, FL" },
  { id: "pennsauken", name: "Pennsauken", state: "NJ", label: "Pennsauken, NJ" },
  { id: "peoria", name: "Peoria", state: "AZ", label: "Peoria, AZ" },
  { id: "perth-amboy", name: "Perth Amboy", state: "NJ", label: "Perth Amboy, NJ" },
  { id: "philadelphia", name: "Philadelphia", state: "PA", label: "Philadelphia, PA" },
  { id: "phoenix", name: "Phoenix", state: "AZ", label: "Phoenix, AZ" },
  { id: "pierce-county", name: "Pierce County", state: "WA", label: "Pierce County, WA" },
  { id: "piscataway", name: "Piscataway", state: "NJ", label: "Piscataway, NJ" },
  { id: "pittsburgh", name: "Pittsburgh", state: "PA", label: "Pittsburgh, PA" },
  { id: "plainsboro", name: "Plainsboro", state: "NJ", label: "Plainsboro, NJ" },
  { id: "plano", name: "Plano", state: "TX", label: "Plano, TX" },
  { id: "pleasanton", name: "Pleasanton", state: "CA", label: "Pleasanton, CA" },
  { id: "plymouth", name: "Plymouth", state: "MN", label: "Plymouth, MN" },
  { id: "pomona", name: "Pomona", state: "CA", label: "Pomona, CA" },
  { id: "portland", name: "Portland", state: "OR", label: "Portland, OR" },
  { id: "princeton", name: "Princeton", state: "NJ", label: "Princeton, NJ" },
  { id: "prosper", name: "Prosper", state: "TX", label: "Prosper, TX" },
  { id: "quincy", name: "Quincy", state: "MA", label: "Quincy, MA" },
  { id: "raleigh", name: "Raleigh", state: "NC", label: "Raleigh, NC" },
  { id: "randolph", name: "Randolph", state: "NJ", label: "Randolph, NJ" },
  { id: "red-bank", name: "Red Bank", state: "NJ", label: "Red Bank, NJ" },
  { id: "redmond", name: "Redmond", state: "WA", label: "Redmond, WA" },
  { id: "redwood-city", name: "Redwood City", state: "CA", label: "Redwood City, CA" },
  { id: "renton", name: "Renton", state: "WA", label: "Renton, WA" },
  { id: "reston", name: "Reston", state: "VA", label: "Reston, VA" },
  { id: "richardson", name: "Richardson", state: "TX", label: "Richardson, TX" },
  { id: "richmond", name: "Richmond", state: "CA", label: "Richmond, CA" },
  { id: "richmond-va", name: "Richmond", state: "VA", label: "Richmond, VA" },
  { id: "riverview", name: "Riverview", state: "FL", label: "Riverview, FL" },
  { id: "rockford", name: "Rockford", state: "IL", label: "Rockford, IL" },
  { id: "rockville", name: "Rockville", state: "MD", label: "Rockville, MD" },
  { id: "roswell", name: "Roswell", state: "GA", label: "Roswell, GA" },
  { id: "sacramento", name: "Sacramento", state: "CA", label: "Sacramento, CA" },
  { id: "salem-or", name: "Salem", state: "OR", label: "Salem, OR" },
  { id: "salt-lake-city", name: "Salt Lake City", state: "UT", label: "Salt Lake City, UT" },
  { id: "san-antonio", name: "San Antonio", state: "TX", label: "San Antonio, TX" },
  { id: "san-diego", name: "San Diego", state: "CA", label: "San Diego, CA" },
  { id: "san-francisco", name: "San Francisco", state: "CA", label: "San Francisco, CA" },
  { id: "san-jose", name: "San Jose", state: "CA", label: "San Jose, CA" },
  { id: "san-marcos", name: "San Marcos", state: "CA", label: "San Marcos, CA" },
  { id: "san-marcos-tx", name: "San Marcos", state: "TX", label: "San Marcos, TX" },
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
  { id: "sonoma-county", name: "Sonoma County", state: "CA", label: "Sonoma County, CA" },
  { id: "south-brunswick", name: "South Brunswick", state: "NJ", label: "South Brunswick, NJ" },
  { id: "south-plainfield", name: "South Plainfield", state: "NJ", label: "South Plainfield, NJ" },
  { id: "spokane", name: "Spokane", state: "WA", label: "Spokane, WA" },
  { id: "spring-valley", name: "Spring Valley", state: "NV", label: "Spring Valley, NV" },
  { id: "springfield-nj", name: "Springfield", state: "NJ", label: "Springfield, NJ" },
  { id: "st-paul", name: "St. Paul", state: "MN", label: "St. Paul, MN" },
  { id: "st-petersburg", name: "St. Petersburg", state: "FL", label: "St. Petersburg, FL" },
  { id: "stockton", name: "Stockton", state: "CA", label: "Stockton, CA" },
  { id: "sugar-land", name: "Sugar Land", state: "TX", label: "Sugar Land, TX" },
  { id: "summit-nj", name: "Summit", state: "NJ", label: "Summit, NJ" },
  { id: "sunnyvale", name: "Sunnyvale", state: "CA", label: "Sunnyvale, CA" },
  { id: "surprise", name: "Surprise", state: "AZ", label: "Surprise, AZ" },
  { id: "tacoma", name: "Tacoma", state: "WA", label: "Tacoma, WA" },
  { id: "tallahassee", name: "Tallahassee", state: "FL", label: "Tallahassee, FL" },
  { id: "tampa", name: "Tampa", state: "FL", label: "Tampa, FL" },
  { id: "teaneck", name: "Teaneck", state: "NJ", label: "Teaneck, NJ" },
  { id: "tempe", name: "Tempe", state: "AZ", label: "Tempe, AZ" },
  { id: "the-woodlands", name: "The Woodlands", state: "TX", label: "The Woodlands, TX" },
  { id: "thornton", name: "Thornton", state: "CO", label: "Thornton, CO" },
  { id: "tigard", name: "Tigard", state: "OR", label: "Tigard, OR" },
  { id: "tinton-falls", name: "Tinton Falls", state: "NJ", label: "Tinton Falls, NJ" },
  { id: "toms-river", name: "Toms River", state: "NJ", label: "Toms River, NJ" },
  { id: "torrance", name: "Torrance", state: "CA", label: "Torrance, CA" },
  { id: "tualatin", name: "Tualatin", state: "OR", label: "Tualatin, OR" },
  { id: "tucson", name: "Tucson", state: "AZ", label: "Tucson, AZ" },
  { id: "tulsa", name: "Tulsa", state: "OK", label: "Tulsa, OK" },
  { id: "tysons", name: "Tysons", state: "VA", label: "Tysons, VA" },
  { id: "union-city", name: "Union City", state: "CA", label: "Union City, CA" },
  { id: "vineland", name: "Vineland", state: "NJ", label: "Vineland, NJ" },
  { id: "virginia-beach", name: "Virginia Beach", state: "VA", label: "Virginia Beach, VA" },
  { id: "vista", name: "Vista", state: "CA", label: "Vista, CA" },
  { id: "voorhees", name: "Voorhees", state: "NJ", label: "Voorhees, NJ" },
  { id: "wall-twp", name: "Wall Twp", state: "NJ", label: "Wall Twp, NJ" },
  { id: "walnut-creek", name: "Walnut Creek", state: "CA", label: "Walnut Creek, CA" },
  { id: "waltham", name: "Waltham", state: "MA", label: "Waltham, MA" },
  { id: "washington-dc", name: "Washington", state: "DC", label: "Washington, DC" },
  { id: "washington-twp-nj", name: "Washington Twp", state: "NJ", label: "Washington Twp, NJ" },
  { id: "west-covina", name: "West Covina", state: "CA", label: "West Covina, CA" },
  { id: "west-windsor", name: "West Windsor", state: "NJ", label: "West Windsor, NJ" },
  { id: "westminster", name: "Westminster", state: "CO", label: "Westminster, CO" },
  { id: "white-plains", name: "White Plains", state: "NY", label: "White Plains, NY" },
  { id: "wichita", name: "Wichita", state: "KS", label: "Wichita, KS" },
  { id: "wilmington", name: "Wilmington", state: "NC", label: "Wilmington, NC" },
  { id: "winter-park", name: "Winter Park", state: "FL", label: "Winter Park, FL" },
  { id: "woodbridge", name: "Woodbridge", state: "NJ", label: "Woodbridge, NJ" },
  { id: "woodbury", name: "Woodbury", state: "MN", label: "Woodbury, MN" },
  { id: "worcester", name: "Worcester", state: "MA", label: "Worcester, MA" },
  { id: "wylie", name: "Wylie", state: "TX", label: "Wylie, TX" },
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

export interface CityCoord {
  lat: number;
  lng: number;
  country: string;
}

export const CITY_COORDS: Record<string, CityCoord> = {
  // Europe
  krakow: { lat: 50.06, lng: 19.94, country: 'Poland' },
  warsaw: { lat: 52.22, lng: 21.01, country: 'Poland' },
  london: { lat: 51.50, lng: -0.12, country: 'United Kingdom' },
  manchester: { lat: 53.48, lng: -2.24, country: 'United Kingdom' },
  edinburgh: { lat: 55.95, lng: -3.18, country: 'United Kingdom' },
  paris: { lat: 48.85, lng: 2.35, country: 'France' },
  lyon: { lat: 45.76, lng: 4.83, country: 'France' },
  marseille: { lat: 43.29, lng: 5.37, country: 'France' },
  berlin: { lat: 52.52, lng: 13.40, country: 'Germany' },
  munich: { lat: 48.13, lng: 11.58, country: 'Germany' },
  hamburg: { lat: 53.55, lng: 9.99, country: 'Germany' },
  frankfurt: { lat: 50.11, lng: 8.68, country: 'Germany' },
  rome: { lat: 41.90, lng: 12.49, country: 'Italy' },
  milan: { lat: 45.46, lng: 9.19, country: 'Italy' },
  naples: { lat: 40.85, lng: 14.26, country: 'Italy' },
  madrid: { lat: 40.41, lng: -3.70, country: 'Spain' },
  barcelona: { lat: 41.38, lng: 2.17, country: 'Spain' },
  lisbon: { lat: 38.72, lng: -9.13, country: 'Portugal' },
  amsterdam: { lat: 52.36, lng: 4.90, country: 'Netherlands' },
  brussels: { lat: 50.85, lng: 4.35, country: 'Belgium' },
  zurich: { lat: 47.37, lng: 8.54, country: 'Switzerland' },
  vienna: { lat: 48.20, lng: 16.37, country: 'Austria' },
  prague: { lat: 50.07, lng: 14.43, country: 'Czech Republic' },
  budapest: { lat: 47.49, lng: 19.04, country: 'Hungary' },
  warsaw2: { lat: 52.22, lng: 21.01, country: 'Poland' },
  copenhagen: { lat: 55.67, lng: 12.56, country: 'Denmark' },
  stockholm: { lat: 59.32, lng: 18.06, country: 'Sweden' },
  oslo: { lat: 59.91, lng: 10.75, country: 'Norway' },
  helsinki: { lat: 60.16, lng: 24.93, country: 'Finland' },
  dublin: { lat: 53.34, lng: -6.26, country: 'Ireland' },
  athens: { lat: 37.98, lng: 23.72, country: 'Greece' },
  istanbul: { lat: 41.00, lng: 28.97, country: 'Turkey' },
  kiev: { lat: 50.45, lng: 30.52, country: 'Ukraine' },
  moscow: { lat: 55.75, lng: 37.61, country: 'Russia' },
  stpetersburg: { lat: 59.93, lng: 30.33, country: 'Russia' },
  bucharest: { lat: 44.42, lng: 26.10, country: 'Romania' },
  belgrade: { lat: 44.78, lng: 20.44, country: 'Serbia' },
  zagreb: { lat: 45.81, lng: 15.98, country: 'Croatia' },

  // Americas
  'new york': { lat: 40.71, lng: -74.00, country: 'United States' },
  'los angeles': { lat: 34.05, lng: -118.24, country: 'United States' },
  chicago: { lat: 41.87, lng: -87.62, country: 'United States' },
  houston: { lat: 29.76, lng: -95.36, country: 'United States' },
  phoenix: { lat: 33.44, lng: -112.07, country: 'United States' },
  philadelphia: { lat: 39.95, lng: -75.16, country: 'United States' },
  'san antonio': { lat: 29.42, lng: -98.49, country: 'United States' },
  'san diego': { lat: 32.71, lng: -117.16, country: 'United States' },
  dallas: { lat: 32.77, lng: -96.79, country: 'United States' },
  austin: { lat: 30.26, lng: -97.74, country: 'United States' },
  seattle: { lat: 47.60, lng: -122.33, country: 'United States' },
  denver: { lat: 39.73, lng: -104.99, country: 'United States' },
  miami: { lat: 25.76, lng: -80.19, country: 'United States' },
  boston: { lat: 42.36, lng: -71.05, country: 'United States' },
  toronto: { lat: 43.65, lng: -79.38, country: 'Canada' },
  vancouver: { lat: 49.28, lng: -123.12, country: 'Canada' },
  montreal: { lat: 45.50, lng: -73.56, country: 'Canada' },
  'mexico city': { lat: 19.43, lng: -99.13, country: 'Mexico' },
  guadalajara: { lat: 20.67, lng: -103.39, country: 'Mexico' },
  'sao paulo': { lat: -23.55, lng: -46.63, country: 'Brazil' },
  rio: { lat: -22.90, lng: -43.17, country: 'Brazil' },
  riodejaneiro: { lat: -22.90, lng: -43.17, country: 'Brazil' },
  brasilia: { lat: -15.79, lng: -47.88, country: 'Brazil' },
  salvador: { lat: -12.97, lng: -38.50, country: 'Brazil' },
  buenosaires: { lat: -34.60, lng: -58.38, country: 'Argentina' },
  lima: { lat: -12.04, lng: -77.04, country: 'Peru' },
  bogota: { lat: 4.71, lng: -74.07, country: 'Colombia' },
  santiago: { lat: -33.44, lng: -70.66, country: 'Chile' },

  // Asia
  tokyo: { lat: 35.67, lng: 139.65, country: 'Japan' },
  osaka: { lat: 34.69, lng: 135.50, country: 'Japan' },
  kyoto: { lat: 35.01, lng: 135.76, country: 'Japan' },
  seoul: { lat: 37.56, lng: 126.97, country: 'South Korea' },
  busan: { lat: 35.17, lng: 129.07, country: 'South Korea' },
  beijing: { lat: 39.90, lng: 116.40, country: 'China' },
  shanghai: { lat: 31.23, lng: 121.47, country: 'China' },
  guangzhou: { lat: 23.12, lng: 113.25, country: 'China' },
  shenzhen: { lat: 22.54, lng: 114.05, country: 'China' },
  hongkong: { lat: 22.31, lng: 114.16, country: 'China' },
  mumbai: { lat: 19.07, lng: 72.87, country: 'India' },
  delhi: { lat: 28.61, lng: 77.20, country: 'India' },
  bangalore: { lat: 12.97, lng: 77.59, country: 'India' },
  kolkata: { lat: 22.57, lng: 88.36, country: 'India' },
  chennai: { lat: 13.08, lng: 80.27, country: 'India' },
  bangkok: { lat: 13.75, lng: 100.50, country: 'Thailand' },
  jakarta: { lat: -6.20, lng: 106.84, country: 'Indonesia' },
  singapore: { lat: 1.35, lng: 103.81, country: 'Singapore' },
  kualalumpur: { lat: 3.13, lng: 101.68, country: 'Malaysia' },
  manila: { lat: 14.59, lng: 120.98, country: 'Philippines' },
  hanoi: { lat: 21.02, lng: 105.83, country: 'Vietnam' },
  hochiminh: { lat: 10.82, lng: 106.62, country: 'Vietnam' },
  telaviv: { lat: 32.08, lng: 34.78, country: 'Israel' },
  jerusalem: { lat: 31.76, lng: 35.21, country: 'Israel' },
  dubai: { lat: 25.20, lng: 55.27, country: 'UAE' },
  abudhabi: { lat: 24.45, lng: 54.37, country: 'UAE' },
  riyadh: { lat: 24.71, lng: 46.67, country: 'Saudi Arabia' },
  jeddah: { lat: 21.48, lng: 39.18, country: 'Saudi Arabia' },
  tehran: { lat: 35.68, lng: 51.38, country: 'Iran' },
  karachi: { lat: 24.86, lng: 67.00, country: 'Pakistan' },
  lahore: { lat: 31.52, lng: 74.35, country: 'Pakistan' },
  dhaka: { lat: 23.81, lng: 90.41, country: 'Bangladesh' },

  // Oceania
  sydney: { lat: -33.86, lng: 151.20, country: 'Australia' },
  melbourne: { lat: -37.81, lng: 144.96, country: 'Australia' },
  brisbane: { lat: -27.46, lng: 153.02, country: 'Australia' },
  perth: { lat: -31.95, lng: 115.85, country: 'Australia' },
  auckland: { lat: -36.84, lng: 174.74, country: 'New Zealand' },
  wellington: { lat: -41.28, lng: 174.77, country: 'New Zealand' },

  // Africa
  cairo: { lat: 30.04, lng: 31.23, country: 'Egypt' },
  alexandria: { lat: 31.20, lng: 29.91, country: 'Egypt' },
  lagos: { lat: 6.52, lng: 3.37, country: 'Nigeria' },
  abuja: { lat: 9.05, lng: 7.39, country: 'Nigeria' },
  casablanca: { lat: 33.57, lng: -7.58, country: 'Morocco' },
  marrakesh: { lat: 31.62, lng: -7.98, country: 'Morocco' },
  nairobi: { lat: -1.29, lng: 36.82, country: 'Kenya' },
  johannesburg: { lat: -26.20, lng: 28.04, country: 'South Africa' },
  capetown: { lat: -33.92, lng: 18.42, country: 'South Africa' },
  pretoria: { lat: -25.74, lng: 28.22, country: 'South Africa' },
  accra: { lat: 5.60, lng: -0.18, country: 'Ghana' },
  addisababa: { lat: 9.14, lng: 38.79, country: 'Ethiopia' },
};

/** Get coords for a city string. Normalizes "Kraków, PL" → "krakow". */
export function getCityCoord(rawCity: string, countryFallback: string): { lat: number; lng: number } | null {
  const key = rawCity
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/stadt$/i, '')
    .replace(/city$/i, '')
    .replace(/newyork/, 'newyork')
    .replace(/losangeles/, 'losangeles')
    .replace(/mexicocity/, 'mexicocity')
    .replace(/saopaulo/, 'saopaulo')
    .replace(/riodejaneiro/, 'riodejaneiro')
    .replace(/buenosaires/, 'buenosaires')
    .replace(/kualalumpur/, 'kualalumpur')
    .replace(/hongkong/, 'hongkong')
    .replace(/telaviv/, 'telaviv')
    .replace(/newdelhi/, 'delhi')
    .trim();

  const found = CITY_COORDS[key];
  if (found) return { lat: found.lat, lng: found.lng };

  // Try common aliases
  const aliases: Record<string, string> = {
    ny: 'new york',
    nyc: 'new york',
    la: 'los angeles',
    sf: 'sanfrancisco',
    chi: 'chicago',
    lon: 'london',
    par: 'paris',
    ber: 'berlin',
    rom: 'rome',
    mad: 'madrid',
    barc: 'barcelona',
    ams: 'amsterdam',
    bru: 'brussels',
    vie: 'vienna',
    pra: 'prague',
    bud: 'budapest',
    war: 'warsaw',
    cop: 'copenhagen',
    sto: 'stockholm',
    dub: 'dublin',
    ath: 'athens',
    ist: 'istanbul',
    tok: 'tokyo',
    sea: 'seoul',
    bei: 'beijing',
    sha: 'shanghai',
    mum: 'mumbai',
    ban: 'bangalore',
    bkk: 'bangkok',
    sin: 'singapore',
    syd: 'sydney',
    mel: 'melbourne',
    jnb: 'johannesburg',
  };
  const aliased = aliases[key];
  if (aliased) {
    const a = CITY_COORDS[aliased.replace(/ /g, '')];
    if (a) return { lat: a.lat, lng: a.lng };
  }

  return null;
}

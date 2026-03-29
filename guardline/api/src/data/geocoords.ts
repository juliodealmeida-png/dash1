export const COUNTRY_COORDS: Record<string, { lat: number; lng: number; city?: string }> = {
  Brazil: { lat: -14.235, lng: -51.925 },
  Brasil: { lat: -14.235, lng: -51.925 },
  BR: { lat: -14.235, lng: -51.925 },
  Argentina: { lat: -38.416, lng: -63.617 },
  AR: { lat: -38.416, lng: -63.617 },
  Chile: { lat: -35.675, lng: -71.543 },
  CL: { lat: -35.675, lng: -71.543 },
  Colombia: { lat: 4.571, lng: -74.297 },
  CO: { lat: 4.571, lng: -74.297 },
  Mexico: { lat: 23.635, lng: -102.553 },
  México: { lat: 23.635, lng: -102.553 },
  MX: { lat: 23.635, lng: -102.553 },
  Peru: { lat: -9.19, lng: -75.015 },
  PE: { lat: -9.19, lng: -75.015 },
  Uruguay: { lat: -32.523, lng: -55.765 },
  UY: { lat: -32.523, lng: -55.765 },
  Paraguay: { lat: -23.443, lng: -58.444 },
  Bolivia: { lat: -16.29, lng: -63.589 },
  Venezuela: { lat: 6.424, lng: -66.589 },
  Ecuador: { lat: -1.831, lng: -78.183 },
  'United States': { lat: 37.09, lng: -95.713 },
  EUA: { lat: 37.09, lng: -95.713 },
  US: { lat: 37.09, lng: -95.713 },
  Canada: { lat: 56.13, lng: -106.347 },
  Canadá: { lat: 56.13, lng: -106.347 },
  'United Kingdom': { lat: 55.378, lng: -3.436 },
  UK: { lat: 55.378, lng: -3.436 },
  Germany: { lat: 51.165, lng: 10.452 },
  Alemanha: { lat: 51.165, lng: 10.452 },
  France: { lat: 46.228, lng: 2.214 },
  França: { lat: 46.228, lng: 2.214 },
  Spain: { lat: 40.464, lng: -3.749 },
  Espanha: { lat: 40.464, lng: -3.749 },
  Portugal: { lat: 39.399, lng: -8.224 },
  Singapore: { lat: 1.352, lng: 103.82 },
  Singapura: { lat: 1.352, lng: 103.82 },
  Japan: { lat: 36.205, lng: 138.252 },
  Japão: { lat: 36.205, lng: 138.252 },
  Australia: { lat: -25.274, lng: 133.775 },
  Austrália: { lat: -25.274, lng: 133.775 },
};

export const CITY_COORDS: Record<string, { lat: number; lng: number; country: string }> = {
  'São Paulo': { lat: -23.5505, lng: -46.6333, country: 'Brasil' },
  'Sao Paulo': { lat: -23.5505, lng: -46.6333, country: 'Brasil' },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729, country: 'Brasil' },
  Brasília: { lat: -15.7801, lng: -47.9292, country: 'Brasil' },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816, country: 'Argentina' },
  Santiago: { lat: -33.4489, lng: -70.6693, country: 'Chile' },
  Bogotá: { lat: 4.711, lng: -74.0721, country: 'Colombia' },
  'Ciudad de México': { lat: 19.4326, lng: -99.1332, country: 'México' },
  Lima: { lat: -12.0464, lng: -77.0428, country: 'Peru' },
  Montevideo: { lat: -34.9011, lng: -56.1645, country: 'Uruguay' },
  Miami: { lat: 25.7617, lng: -80.1918, country: 'EUA' },
  'New York': { lat: 40.7128, lng: -74.006, country: 'EUA' },
  'Los Angeles': { lat: 34.0522, lng: -118.2437, country: 'EUA' },
  Londres: { lat: 51.5074, lng: -0.1278, country: 'UK' },
  London: { lat: 51.5074, lng: -0.1278, country: 'UK' },
  Paris: { lat: 48.8566, lng: 2.3522, country: 'França' },
  Berlim: { lat: 52.52, lng: 13.405, country: 'Alemanha' },
  Berlin: { lat: 52.52, lng: 13.405, country: 'Alemanha' },
  Sydney: { lat: -33.8688, lng: 151.2093, country: 'Austrália' },
  'Porto Alegre': { lat: -30.0346, lng: -51.2177, country: 'Brasil' },
  Curitiba: { lat: -25.429, lng: -49.2671, country: 'Brasil' },
  'Belo Horizonte': { lat: -19.9167, lng: -43.9345, country: 'Brasil' },
  Recife: { lat: -8.0476, lng: -34.877, country: 'Brasil' },
};

export function resolveCoords(
  country?: string | null,
  city?: string | null
): { lat: number; lng: number } | null {
  const c = city?.trim();
  const co = country?.trim();
  if (c && CITY_COORDS[c]) return { lat: CITY_COORDS[c].lat, lng: CITY_COORDS[c].lng };
  if (co && COUNTRY_COORDS[co]) return { lat: COUNTRY_COORDS[co].lat, lng: COUNTRY_COORDS[co].lng };
  return null;
}

export function jitter(coord: { lat: number; lng: number }, radius = 1.5): { lat: number; lng: number } {
  return {
    lat: coord.lat + (Math.random() - 0.5) * radius,
    lng: coord.lng + (Math.random() - 0.5) * radius,
  };
}

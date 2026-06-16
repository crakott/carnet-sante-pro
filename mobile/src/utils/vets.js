// Distance (in km) between two lat/lng points (Haversine formula)
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Recherche les cliniques vétérinaires réelles autour d'une position via OpenStreetMap (Overpass API)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export const fetchNearbyVets = async (lat, lng) => {
  const query = `[out:json][timeout:25];(node["amenity"="veterinary"](around:25000,${lat},${lng});way["amenity"="veterinary"](around:25000,${lat},${lng}););out center 30;`;
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(endpoint, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return (data.elements || [])
        .map((el) => {
          const tags = el.tags || {};
          const vLat = el.lat ?? el.center?.lat;
          const vLng = el.lon ?? el.center?.lon;
          if (vLat == null || vLng == null) return null;
          const adresse = [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
          return {
            id: `osm-${el.type}-${el.id}`,
            nom: tags.name || tags.brand || 'Vétérinaire',
            telephone: tags.phone || tags['contact:phone'] || null,
            horaires: tags.opening_hours || null,
            adresse: adresse || null,
            lat: vLat,
            lng: vLng,
          };
        })
        .filter(Boolean);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Service de recherche indisponible');
};

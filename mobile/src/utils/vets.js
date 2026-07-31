// Distance (in km) between two lat/lng points (Haversine formula)
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const buildQuery = (lat, lng, radiusM) =>
  `[out:json][timeout:30];(node["amenity"="veterinary"](around:${radiusM},${lat},${lng});way["amenity"="veterinary"](around:${radiusM},${lat},${lng});relation["amenity"="veterinary"](around:${radiusM},${lat},${lng}););out center 50;`;

const parseElements = (elements) =>
  elements
    .map((el) => {
      const tags = el.tags || {};
      const vLat = el.lat ?? el.center?.lat;
      const vLng = el.lon ?? el.center?.lon;
      if (vLat == null || vLng == null) return null;
      const adresse = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:postcode'],
        tags['addr:city'],
      ].filter(Boolean).join(' ');
      const phone = tags.phone || tags['contact:phone'] || tags['phone:fr'] || null;
      const website = tags.website || tags['contact:website'] || tags.url || null;
      return {
        id: `osm-${el.type}-${el.id}`,
        nom: tags.name || tags.brand || tags.operator || 'Vétérinaire',
        telephone: phone ? phone.replace(/\s/g, '') : null,
        horaires: tags.opening_hours || null,
        adresse: adresse || null,
        website,
        lat: vLat,
        lng: vLng,
      };
    })
    .filter(Boolean);

// Fetches nearby vets using Overpass/OSM. Auto-expands radius from 25→50 km if no results.
export const fetchNearbyVets = async (lat, lng) => {
  for (const radiusM of [25000, 50000]) {
    const query = buildQuery(lat, lng, radiusM);
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
        const results = parseElements(data.elements || []);
        if (results.length > 0) return { results, radiusKm: radiusM / 1000 };
        // No results at this radius — try wider before switching endpoint
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError && radiusM === 50000) throw lastError;
  }

  return { results: [], radiusKm: 50 };
};

// Distance in km between two lat/lng points (Haversine formula)
export const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// A vet is considered "urgence" if tagged emergency=yes on OSM, has a "Urgences"
// specialty (fallback list), or has 24/7 opening hours
export const isEmergencyVet = (vet) => {
    if (vet.emergency) return true;
    if (vet.specialites && vet.specialites.includes('Urgences')) return true;
    const h = (vet.horaires || '').toLowerCase();
    return h.includes('24/7') || h.includes('24h') || h.includes('24 h');
};

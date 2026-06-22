import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import type { Place, PlaceCategory } from "@/types/database";
import type { TrackPoint } from "@/hooks/useLocationTracker";

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const markerColors: Record<Place["category"], string> = {
  cafe: "#0ea5e9",
  park: "#10b981",
  restaurant: "#f59e0b",
  landmark: "#ef4444",
  museum: "#8b5cf6",
  bar: "#f97316",
  hotel: "#a855f7",
};

const categoryEmoji: Record<Place["category"], string> = {
  cafe: "☕",
  park: "🌳",
  restaurant: "🍜",
  landmark: "⛩️",
  museum: "🎨",
  bar: "🍸",
  hotel: "🏨",
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

interface UseMapOptions {
  places: Place[];
  isDark: boolean;
  onMarkerClick?: (place: Place) => void;
  conquerMode?: boolean;
  conquerTracks?: TrackPoint[];
  mapType?: "standard" | "satellite";
  selectedPlace?: Place | null;
}

export function useMap({
  places,
  isDark,
  onMarkerClick,
  conquerMode = false,
  conquerTracks = [],
  mapType = "standard",
  selectedPlace = null,
}: UseMapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const currentLocMarkerRef = useRef<L.Marker | null>(null);
  const conquerLayerRef = useRef<L.FeatureGroup | null>(null);
  const poiLayerRef = useRef<L.FeatureGroup | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [poiPlaces, setPoiPlaces] = useState<Place[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [locatingStatus, setLocatingStatus] = useState<"idle" | "locating" | "found" | "error">("idle");

  // Ref to track selectedPlace without stale closures in geolocation callback
  const selectedPlaceRef = useRef(selectedPlace);
  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  // Fly to selected place when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (selectedPlace && map) {
      const timer = setTimeout(() => {
        map.flyTo([selectedPlace.lat, selectedPlace.lng], 15, { duration: 0.8 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPlace]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.6139, 77.2090],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    const tileUrl = isDark ? DARK_TILES : LIGHT_TILES;
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Move zoom control to bottom-left
    map.zoomControl.setPosition("bottomleft");

    mapRef.current = map;
    tileLayerRef.current = tileLayer;

    let locTimeout: number | undefined;

    // Try to locate user immediately on load to center the map
    if (navigator.geolocation) {
      locTimeout = setTimeout(() => {
        setLocatingStatus("locating");
      }, 0) as unknown as number;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mapRef.current) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentLocation({ lat, lng });
          setLocatingStatus("found");
          if (!selectedPlaceRef.current) {
            map.setView([lat, lng], 13);
          }
        },
        (error) => {
          console.warn("[useMap] Geolocation on load failed or denied:", error.message);
          if (mapRef.current) {
            setLocatingStatus("idle");
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    return () => {
      if (locTimeout) clearTimeout(locTimeout);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update tile layer on theme or mapType change
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl = mapType === "satellite"
      ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
      : (isDark ? DARK_TILES : LIGHT_TILES);
    tileLayerRef.current.setUrl(tileUrl);
  }, [isDark, mapType]);

  // Add/update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const color = markerColors[place.category];
      const emoji = categoryEmoji[place.category];

      const icon = L.divIcon({
        className: "",
        html: `
          <div class="footprint-marker" style="background: ${color};">
            <span class="footprint-marker-inner">${emoji}</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [4, 36],
      });

      const marker = L.marker([place.lat, place.lng], { icon }).addTo(map);

      marker.on("click", () => {
        onMarkerClick?.(place);
        map.flyTo([place.lat, place.lng], 15, { duration: 0.8 });
      });

      markersRef.current.push(marker);
    });
  }, [places, onMarkerClick]);

  // Show current location marker when location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentLocation) return;

    // Remove old marker
    if (currentLocMarkerRef.current) {
      currentLocMarkerRef.current.remove();
    }

    const icon = L.divIcon({
      className: "",
      html: `<div class="current-location-marker"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const marker = L.marker([currentLocation.lat, currentLocation.lng], { icon, zIndexOffset: 1000 }).addTo(map);
    currentLocMarkerRef.current = marker;
  }, [currentLocation]);

  const flyTo = useCallback((lat: number, lng: number, zoom = 15) => {
    mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.8 });
  }, []);

  // Locate current position using the browser Geolocation API
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocatingStatus("error");
      return;
    }

    setLocatingStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLocation({ lat, lng });
        setLocatingStatus("found");
        mapRef.current?.flyTo([lat, lng], 16, { duration: 1.2 });
      },
      () => {
        // If denied or unavailable, drop pin on the center of the current map view as a demo fallback
        const center = mapRef.current?.getCenter();
        if (center) {
          setCurrentLocation({ lat: center.lat, lng: center.lng });
          setLocatingStatus("found");
        } else {
          setLocatingStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Redraw Visited paths/zones — always shown when tracks exist
  // Uses vibrant style in Conquer Mode, subtle style otherwise
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (conquerLayerRef.current) {
      conquerLayerRef.current.remove();
      conquerLayerRef.current = null;
    }

    if (!conquerTracks || conquerTracks.length === 0) return;

    const group = L.featureGroup().addTo(map);
    conquerLayerRef.current = group;

    // Split tracks into segments if consecutive points are > 5 km apart
    const segments: L.LatLngExpression[][] = [];
    let currentSegment: L.LatLngExpression[] = [];

    for (let i = 0; i < conquerTracks.length; i++) {
      const pt = conquerTracks[i];
      const latlng: L.LatLngExpression = [pt.lat, pt.lng];

      if (currentSegment.length > 0) {
        const lastPt = conquerTracks[i - 1];
        const dist = getDistance(lastPt.lat, lastPt.lng, pt.lat, pt.lng);
        if (dist > 5000) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
      currentSegment.push(latlng);
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    // Style varies: vibrant in conquer mode, subtle otherwise
    const outerColor = conquerMode ? "#0ea5e9" : "#64748b";
    const innerColor = conquerMode ? "#38bdf8" : "#94a3b8";
    const outerWeight = conquerMode ? 8 : 4;
    const innerWeight = conquerMode ? 3 : 2;
    const outerOpacity = conquerMode ? 0.35 : 0.15;
    const innerOpacity = conquerMode ? 0.85 : 0.45;

    // Draw polyline trails for each segment
    segments.forEach((seg) => {
      if (seg.length < 2) return;
      // Outer glow
      L.polyline(seg, {
        color: outerColor,
        weight: outerWeight,
        opacity: outerOpacity,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);

      // Inner line
      L.polyline(seg, {
        color: innerColor,
        weight: innerWeight,
        opacity: innerOpacity,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);
    });

    // Center map on last point to follow simulation/live movements (conquer mode only)
    if (conquerMode && conquerTracks.length > 0) {
      const lastPoint = conquerTracks[conquerTracks.length - 1];
      map.setView([lastPoint.lat, lastPoint.lng], map.getZoom(), { animate: true });
    }

    return () => {
      if (group) group.remove();
    };
  }, [conquerMode, conquerTracks]);

  const searchNearby = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setPoiLoading(true);
    const center = map.getCenter();
    const lat = center.lat;
    const lng = center.lng;

    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["amenity"~"cafe|restaurant|bar|pub"](around:1000, ${lat}, ${lng});
        node["tourism"~"hotel|hostel|motel|guest_house"](around:1000, ${lat}, ${lng});
        node["historic"](around:1000, ${lat}, ${lng});
        node["landmark"](around:1000, ${lat}, ${lng});
      );
      out body;
    `;

    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
      const data = await response.json();

      if (data && data.elements) {
        const mapped: Place[] = data.elements.map((el: { id: number; lat: number; lon: number; tags: Record<string, string> }) => {
          let category: PlaceCategory = "landmark";
          if (el.tags.amenity === "cafe") category = "cafe";
          else if (el.tags.amenity === "restaurant" || el.tags.amenity === "fast_food") category = "restaurant";
          else if (el.tags.amenity === "bar" || el.tags.amenity === "pub") category = "bar";
          else if (el.tags.tourism === "hotel" || el.tags.tourism === "hostel" || el.tags.tourism === "motel" || el.tags.tourism === "guest_house") category = "hotel";

          const name = el.tags.name ?? `${category.charAt(0).toUpperCase() + category.slice(1)} Spot`;
          const address = el.tags["addr:street"]
            ? `${el.tags["addr:housenumber"] ?? ""} ${el.tags["addr:street"]}, ${el.tags["addr:city"] ?? ""}`.trim()
            : `Near Lat: ${el.lat.toFixed(4)}, Lng: ${el.lon.toFixed(4)}`;

          return {
            id: `poi-${el.id}`,
            name,
            address,
            lat: el.lat,
            lng: el.lon,
            visitor: "Discoverable",
            visitorAvatar: "🗺️",
            visitDate: "Available to Conquer",
            description: "Real-time place fetched from open map data. Pin it to share your footprints story!",
            photoColor: category === "hotel" ? "from-purple-500 to-indigo-700" : "from-gray-400 to-slate-600",
            category,
            isPublic: true,
            userId: "poi",
          };
        });

        const filtered = mapped.filter(poi => !places.some(p => p.name.toLowerCase() === poi.name.toLowerCase() || (Math.abs(p.lat - poi.lat) < 0.0001 && Math.abs(p.lng - poi.lng) < 0.0001)));
        setPoiPlaces(filtered);
      }
    } catch (err) {
      console.error("Overpass POI lookup failed:", err);
    } finally {
      setPoiLoading(false);
    }
  }, [places]);

  // Draw POI markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (poiLayerRef.current) {
      poiLayerRef.current.remove();
      poiLayerRef.current = null;
    }

    if (poiPlaces.length === 0) return;

    const group = L.featureGroup().addTo(map);
    poiLayerRef.current = group;

    poiPlaces.forEach((poi) => {
      const color = markerColors[poi.category] ?? "#64748b";
      const emoji = categoryEmoji[poi.category] ?? "📍";

      const icon = L.divIcon({
        className: "",
        html: `
          <div class="poi-marker" style="border-color: ${color};">
            <span class="poi-marker-emoji">${emoji}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([poi.lat, poi.lng], { icon }).addTo(group);

      marker.on("click", () => {
        onMarkerClick?.(poi);
        map.flyTo([poi.lat, poi.lng], 15, { duration: 0.8 });
      });
    });

    return () => {
      if (group) group.remove();
    };
  }, [poiPlaces, onMarkerClick]);

  const clearPOIs = useCallback(() => {
    setPoiPlaces([]);
  }, []);

  return { containerRef, mapRef, flyTo, locateMe, locatingStatus, currentLocation, searchNearby, poiLoading, clearPOIs };
}

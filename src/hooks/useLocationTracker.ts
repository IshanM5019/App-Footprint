import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDrafts } from "@/hooks/useDrafts";
import { useFootprints } from "@/hooks/useFootprints";

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

// ── Visitable Landmarks ──────────────────────────────
const DISCOVERABLE_LANDMARKS = [
  {
    name: "Lodhi Garden",
    address: "Lodhi Road, Lodhi Estate",
    lat: 28.5933,
    lng: 77.2198,
    category: "park" as const,
  },
  {
    name: "India Gate",
    address: "Rajpath, Central Secretariat",
    lat: 28.6129,
    lng: 77.2295,
    category: "landmark" as const,
  },
  {
    name: "National Gallery of Modern Art",
    address: "Jaipur House, Sher Shah Road",
    lat: 28.6096,
    lng: 77.2344,
    category: "museum" as const,
  },
  {
    name: "Humayun's Tomb",
    address: "Nizamuddin East",
    lat: 28.5933,
    lng: 77.2507,
    category: "landmark" as const,
  },
];

// ── Fallback interpolated walking simulation route (used when OSRM is unavailable) ──
const FALLBACK_SIMULATION_ROUTE: [number, number][] = [
  [28.5933, 77.2198], // Lodhi Garden
  [28.5980, 77.2210],
  [28.6020, 77.2230],
  [28.6060, 77.2250],
  [28.6090, 77.2270],
  [28.6129, 77.2295], // India Gate
  [28.6110, 77.2320],
  [28.6096, 77.2344], // National Gallery of Modern Art
  [28.6040, 77.2380],
  [28.5990, 77.2430],
  [28.5950, 77.2470],
  [28.5933, 77.2507], // Humayun's Tomb
];

// ── Simulation waypoints for OSRM (landmark coords) ──
const SIMULATION_WAYPOINTS: [number, number][] = [
  [28.5933, 77.2198], // Lodhi Garden
  [28.6129, 77.2295], // India Gate
  [28.6096, 77.2344], // National Gallery of Modern Art
  [28.5933, 77.2507], // Humayun's Tomb
];

// Minimum distance (metres) between consecutive background track points to avoid GPS jitter
const MIN_TRACK_DISTANCE_M = 15;

// Calculate distance in meters using Haversine formula
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

/**
 * Fetch a road-snapped walking route from OSRM between the given waypoints.
 * Returns a dense array of [lat, lng] points following actual roads.
 * Falls back to the sparse fallback route on failure.
 */
async function fetchRoadSnappedRoute(
  waypoints: [number, number][]
): Promise<[number, number][]> {
  try {
    // OSRM expects lng,lat format separated by semicolons
    const coordsStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/foot/${coordsStr}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM returned ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("OSRM returned no valid route");
    }

    // GeoJSON coordinates are [lng, lat] — convert to [lat, lng]
    const geojsonCoords: [number, number][] = data.routes[0].geometry.coordinates;
    const routePoints: [number, number][] = geojsonCoords.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );

    console.log(`[useLocationTracker] OSRM returned ${routePoints.length} road-snapped points`);
    return routePoints;
  } catch (err) {
    console.warn("[useLocationTracker] OSRM fetch failed, using fallback route:", err);
    return FALLBACK_SIMULATION_ROUTE;
  }
}

export function useLocationTracker() {
  const { user, profile, isDemo, updateProfile } = useAuth();
  const { createDraft, drafts } = useDrafts();
  const { places } = useFootprints();

  const [tracks, setTracks] = useState<TrackPoint[]>(() => {
    const saved = localStorage.getItem("conquer_tracks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse conquer_tracks", e);
      }
    }
    return [];
  });

  // Reset tracks state and local storage when user changes to prevent cross-account leak
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (currentId !== lastUserIdRef.current) {
      lastUserIdRef.current = currentId;
      setTracks([]);
      localStorage.removeItem("conquer_tracks");
    }
  }, [user]);

  // Load tracks from profile metadata on start
  useEffect(() => {
    if (user && profile?.avatar_url && profile.avatar_url.startsWith("{")) {
      try {
        const meta = JSON.parse(profile.avatar_url);
        if (Array.isArray(meta.tracks) && meta.tracks.length > 0) {
          const newTracks = meta.tracks;
          const tracksJson = JSON.stringify(newTracks);
          if (localStorage.getItem("conquer_tracks") !== tracksJson) {
            setTimeout(() => {
              setTracks(newTracks);
              localStorage.setItem("conquer_tracks", tracksJson);
            }, 0);
          }
        }
      } catch {
        console.warn("[useLocationTracker] Failed to parse tracks from profile metadata");
      }
    }
  }, [profile, user]);

  // Sync tracks to Supabase with debounce
  useEffect(() => {
    if (isDemo || !user || !profile || !updateProfile) return;

    // Check if the local tracks are actually different from the profile tracks to avoid infinite loops
    let profileTracks: TrackPoint[] = [];
    try {
      if (profile.avatar_url && profile.avatar_url.startsWith("{")) {
        const meta = JSON.parse(profile.avatar_url);
        if (Array.isArray(meta.tracks)) {
          profileTracks = meta.tracks;
        }
      }
    } catch {
      // ignore
    }

    // If local tracks match profile tracks, no need to update
    if (JSON.stringify(tracks) === JSON.stringify(profileTracks)) {
      return;
    }

    // Debounce database update by 3 seconds
    const timer = setTimeout(async () => {
      let currentBio = "";
      let currentWebsite = "";
      let followingList: string[] = [];
      try {
        if (profile.avatar_url && profile.avatar_url.startsWith("{")) {
          const meta = JSON.parse(profile.avatar_url);
          currentBio = meta.bio || "";
          currentWebsite = meta.website || "";
          followingList = meta.followingList || [];
        }
      } catch {
        // ignore
      }

      await updateProfile(
        profile.full_name ?? "",
        profile.username,
        currentBio,
        currentWebsite,
        followingList,
        tracks
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [tracks, profile, user, isDemo, updateProfile]);

  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simTotalSteps, setSimTotalSteps] = useState(FALLBACK_SIMULATION_ROUTE.length);
  const [simLoading, setSimLoading] = useState(false);
  const [lastDiscovered, setLastDiscovered] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const simRouteRef = useRef<[number, number][]>(FALLBACK_SIMULATION_ROUTE);
  const lastTrackPointRef = useRef<{ lat: number; lng: number } | null>(null);

  // Keep lastTrackPointRef in sync with the latest track point
  useEffect(() => {
    if (tracks.length > 0) {
      const last = tracks[tracks.length - 1];
      lastTrackPointRef.current = { lat: last.lat, lng: last.lng };
    }
  }, [tracks]);

  // Sync tracks to localStorage
  const saveTracks = useCallback((newTracks: TrackPoint[]) => {
    setTracks(newTracks);
    localStorage.setItem("conquer_tracks", JSON.stringify(newTracks));
  }, []);

  // Clear tracking history
  const clearTracks = useCallback(() => {
    saveTracks([]);
    lastTrackPointRef.current = null;
  }, [saveTracks]);

  // Check proximity to landmarks and trigger draft creation
  const checkProximity = useCallback(
    async (lat: number, lng: number) => {
      if (!user) return;

      for (const landmark of DISCOVERABLE_LANDMARKS) {
        const dist = getDistance(lat, lng, landmark.lat, landmark.lng);
        // If within 250 meters
        if (dist <= 250) {
          // Check if already draft exists or is pinned in footprints
          const alreadyDraft = drafts.some(
            (d) => d.status === "pending" && d.venue_name === landmark.name
          );
          const alreadyPinned = places.some((p) => p.name === landmark.name);

          if (!alreadyDraft && !alreadyPinned) {
            // Auto-trigger a new location draft!
            const { error } = await createDraft({
              venue_name: landmark.name,
              address: landmark.address,
              category: landmark.category,
              latitude: landmark.lat,
              longitude: landmark.lng,
              visited_at: new Date().toISOString(),
            });

            if (!error) {
              setLastDiscovered(landmark.name);
              // Clear discovery banner after 6 seconds
              setTimeout(() => setLastDiscovered((prev) => (prev === landmark.name ? null : prev)), 6000);
            }
          }
        }
      }
    },
    [user, drafts, places, createDraft]
  );

  // Add a coordinate to trail list (with distance filtering for background tracking)
  const addTrackPoint = useCallback(
    (lat: number, lng: number, skipDistanceFilter = false) => {
      // Apply distance filter for background GPS tracking to avoid jitter
      if (!skipDistanceFilter && lastTrackPointRef.current) {
        const dist = getDistance(
          lastTrackPointRef.current.lat,
          lastTrackPointRef.current.lng,
          lat,
          lng
        );
        if (dist < MIN_TRACK_DISTANCE_M) {
          return; // Too close to last point, skip
        }
      }

      const newPoint: TrackPoint = {
        lat,
        lng,
        timestamp: new Date().toISOString(),
      };

      lastTrackPointRef.current = { lat, lng };

      setTracks((prev) => {
        const next = [...prev, newPoint];
        localStorage.setItem("conquer_tracks", JSON.stringify(next));
        return next;
      });

      checkProximity(lat, lng);
    },
    [checkProximity]
  );

  // ── Always-on background GPS tracking ──────────────────
  // Auto-start geolocation watching whenever a user is logged in
  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) {
      console.warn("[useLocationTracker] Geolocation not supported");
      return;
    }

    // Start passive background tracking
    let didSetTracking = false;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        if (!didSetTracking) {
          didSetTracking = true;
          setIsTracking(true);
        }
        const { latitude, longitude } = position.coords;
        addTrackPoint(latitude, longitude, false); // distance filter applied
      },
      (error) => {
        console.warn("[useLocationTracker] Background GPS error:", error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    watchIdRef.current = id;

    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
      setIsTracking(false);
    };
  }, [user, addTrackPoint]);

  // ── Road-snapped walking simulation ──────────────────
  const startSimulation = useCallback(async () => {
    if (isSimulating || simLoading) return;

    setSimLoading(true);

    // Fetch the road-snapped route from OSRM
    const route = await fetchRoadSnappedRoute(SIMULATION_WAYPOINTS);
    simRouteRef.current = route;
    setSimTotalSteps(route.length);

    setSimLoading(false);
    setIsSimulating(true);
    setSimStep(0);

    // Initial position
    const [startLat, startLng] = route[0];
    addTrackPoint(startLat, startLng, true); // skip distance filter for simulation

    let step = 1;
    // Use faster interval for dense road-snapped points, slower for sparse fallback
    const intervalMs = route.length > 20 ? 300 : 2500;

    simIntervalRef.current = window.setInterval(() => {
      if (step >= route.length) {
        // Complete
        setIsSimulating(false);
        if (simIntervalRef.current !== null) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        return;
      }

      const [lat, lng] = route[step];
      addTrackPoint(lat, lng, true); // skip distance filter for simulation
      setSimStep(step);
      step++;
    }, intervalMs);
  }, [isSimulating, simLoading, addTrackPoint]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimLoading(false);
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  }, []);

  const unlockedLandmarksCount = DISCOVERABLE_LANDMARKS.filter(landmark =>
    places.some(p => p.name === landmark.name) ||
    drafts.some(d => d.status === "pending" && d.venue_name === landmark.name)
  ).length;

  const conqueredArea = (tracks.length === 0 ? 0 : 0.045 + (tracks.length - 1) * 0.012).toFixed(3);

  return {
    tracks,
    isTracking,
    setIsTracking,
    isSimulating,
    simStep,
    simTotalSteps,
    simLoading,
    lastDiscovered,
    setLastDiscovered,
    startSimulation,
    stopSimulation,
    clearTracks,
    unlockedLandmarksCount,
    totalLandmarksCount: DISCOVERABLE_LANDMARKS.length,
    conqueredArea,
  };
}

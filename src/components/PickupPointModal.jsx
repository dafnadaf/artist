import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import Supercluster from "supercluster";
import { fetchPickupPoints } from "../services/shippingApi";
import "leaflet/dist/leaflet.css";
import useDebouncedValue from "../hooks/useDebouncedValue";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [55.751244, 37.618423];

const CLUSTER_RADIUS = 55;
const MAX_CLUSTER_ZOOM = 17;

const DAILY_TOKENS = ["ежедневно", "daily", "каждый", "без выходных"];
const TIME_RANGE_REGEX = /(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/;
const RANGE_SPLIT_REGEX = /[-–—]/;

const DAY_ALIAS_ENTRIES = [
  [0, ["вс", "воск", "воскресенье", "sun", "sunday", "su"]],
  [1, ["пн", "пон", "понедельник", "mon", "monday", "mo", "1"]],
  [2, ["вт", "втор", "вторник", "tue", "tuesday", "tu", "2"]],
  [3, ["ср", "сред", "среда", "wed", "wednesday", "we", "3"]],
  [4, ["чт", "чет", "четверг", "thu", "thursday", "th", "4"]],
  [5, ["пт", "пят", "пятница", "fri", "friday", "fr", "5"]],
  [6, ["сб", "суб", "суббота", "sat", "saturday", "sa", "6"]],
];

const DAY_ALIAS_MAP = DAY_ALIAS_ENTRIES.reduce((map, [day, tokens]) => {
  tokens.forEach((token) => {
    map.set(token, day);
  });
  return map;
}, new Map());

const sanitizeDayToken = (token) => token?.toLowerCase().replace(/\./g, "").trim();

const getDayIndexFromToken = (token) => {
  const normalized = sanitizeDayToken(token);
  if (!normalized) {
    return null;
  }

  if (DAY_ALIAS_MAP.has(normalized)) {
    return DAY_ALIAS_MAP.get(normalized);
  }

  if (/^\d$/.test(normalized)) {
    const numeric = Number(normalized);
    if (numeric === 7) {
      return 0;
    }
    if (numeric >= 1 && numeric <= 6) {
      return numeric;
    }
  }

  return null;
};

const isDayInRange = (day, start, end) => {
  if (start === null || end === null) {
    return false;
  }

  if (start <= end) {
    return day >= start && day <= end;
  }

  return day >= start || day <= end;
};

const isSegmentCoveringDay = (segment, day) => {
  const normalizedSegment = segment.toLowerCase();

  if (DAILY_TOKENS.some((token) => normalizedSegment.includes(token))) {
    return true;
  }

  const parts = normalizedSegment
    .split(/[^a-zа-яё0-9-]+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (part.includes("круглосуточ")) {
      return true;
    }

    const [startToken, endToken] = part.split(RANGE_SPLIT_REGEX).map((token) => token.trim());
    if (startToken && endToken) {
      const start = getDayIndexFromToken(startToken);
      const end = getDayIndexFromToken(endToken);
      if (isDayInRange(day, start, end)) {
        return true;
      }
      continue;
    }

    const exact = getDayIndexFromToken(part);
    if (exact === day) {
      return true;
    }
  }

  return false;
};

const isTimeWithinSegment = (segment, now) => {
  const match = segment.match(TIME_RANGE_REGEX);
  if (!match) {
    return true;
  }

  const [, startHour, startMinute, endHour, endMinute] = match;
  const startTotal = Number(startHour) * 60 + Number(startMinute);
  const endTotal = Number(endHour) * 60 + Number(endMinute);
  const currentTotal = now.getHours() * 60 + now.getMinutes();

  if (endTotal < startTotal) {
    return currentTotal >= startTotal || currentTotal <= endTotal;
  }

  return currentTotal >= startTotal && currentTotal <= endTotal;
};

const isPointOpenToday = (point, now) => {
  const schedule = point?.schedule;
  if (!schedule) {
    return false;
  }

  const normalized = schedule.toLowerCase();
  if (normalized.includes("закрыт")) {
    return false;
  }

  const day = now.getDay();
  if (normalized.includes("без выходных")) {
    return true;
  }

  const segments = normalized
    .split(/[;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (segment.includes("выход")) {
      continue;
    }

    if (!isSegmentCoveringDay(segment, day)) {
      continue;
    }

    if (isTimeWithinSegment(segment, now)) {
      return true;
    }
  }

  return false;
};

const hasValidCoordinates = (point) =>
  Number.isFinite(point?.location?.lat) && Number.isFinite(point?.location?.lon);

const createClusterIcon = (count) =>
  L.divIcon({
    html: `<div style="background: rgba(20, 184, 166, 0.18); border: 2px solid rgba(45, 212, 191, 0.8); color: #5eead4; border-radius: 9999px; width: ${
      32 + Math.min(count, 40) * 0.6
    }px; height: ${32 + Math.min(count, 40) * 0.6}px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 600;">${count}</div>`,
    className: "pickup-cluster", // allows overriding in Tailwind if needed
    iconSize: [40, 40],
  });

function ClusterLayer({ points, onSelect, onFocus, selectedCode, openTodayMap, translate }) {
  const map = useMap();
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateState = () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    };

    updateState();
    map.on("moveend", updateState);

    return () => {
      map.off("moveend", updateState);
    };
  }, [map]);

  const features = useMemo(() => {
    return points
      .filter((point) => hasValidCoordinates(point))
      .map((point) => ({
        type: "Feature",
        properties: {
          cluster: false,
          point,
        },
        geometry: {
          type: "Point",
          coordinates: [point.location.lon, point.location.lat],
        },
      }));
  }, [points]);

  const index = useMemo(() => {
    const cluster = new Supercluster({ radius: CLUSTER_RADIUS, maxZoom: MAX_CLUSTER_ZOOM });
    cluster.load(features);
    return cluster;
  }, [features]);

  const clusters = useMemo(() => {
    if (!bounds) {
      return index.getClusters([-180, -85, 180, 85], Math.round(zoom));
    }

    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    return index.getClusters(bbox, Math.round(zoom));
  }, [bounds, index, zoom]);

  return (
    <>
      {clusters.map((cluster) => {
        const [longitude, latitude] = cluster.geometry.coordinates;

        if (cluster.properties.cluster) {
          const expansionZoom = Math.min(index.getClusterExpansionZoom(cluster.id), MAX_CLUSTER_ZOOM + 2);
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              position={[latitude, longitude]}
              icon={createClusterIcon(cluster.properties.point_count)}
              eventHandlers={{
                click: () => {
                  map.setView([latitude, longitude], expansionZoom, { animate: true });
                },
              }}
            />
          );
        }

        const point = cluster.properties.point;
        const isSelected = selectedCode === point.code;
        const openToday = openTodayMap.get(point.code);

        return (
          <Marker
            key={`${point.provider}-${point.code}`}
            position={[point.location.lat, point.location.lon]}
            eventHandlers={{
              click: () => {
                onFocus(point.code);
              },
            }}
          >
            <Popup>
              <div className="space-y-2 text-[0.6rem] uppercase tracking-[0.3em] text-slate-700">
                <div className="font-semibold text-slate-900">{point.name}</div>
                <div className="text-[0.55rem] text-slate-600">{point.address}</div>
                {point.schedule ? (
                  <div className="text-[0.5rem] text-slate-500">{point.schedule}</div>
                ) : null}
                {openToday ? (
                  <div className="text-[0.5rem] font-semibold text-teal-600">
                    {translate("cartPage.pickup.openToday")}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelect(point)}
                  className={`mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.35em] transition ${
                    isSelected
                      ? "border-teal-500 bg-teal-500/10 text-teal-500"
                      : "border-teal-500/60 text-teal-500 hover:border-teal-500 hover:text-teal-400"
                  }`}
                >
                  {translate("cartPage.pickup.select")}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

ClusterLayer.propTypes = {
  points: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelect: PropTypes.func.isRequired,
  onFocus: PropTypes.func.isRequired,
  selectedCode: PropTypes.string,
  openTodayMap: PropTypes.instanceOf(Map).isRequired,
  translate: PropTypes.func.isRequired,
};

ClusterLayer.defaultProps = {
  selectedCode: null,
};

function PickupPointModal({ provider, isOpen, onClose, onSelect }) {
  const { t } = useTranslation();
  const [cityInput, setCityInput] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCode, setSelectedCode] = useState(null);
  const [filters, setFilters] = useState({ fitting: false, cashless: false, openToday: false });
  const center = useMemo(() => DEFAULT_CENTER, []);
  const debouncedCity = useDebouncedValue(cityInput, 400);
  const mapRef = useRef(null);
  const modalRef = useRef(null);
  const initialFieldRef = useRef(null);
  const closeButtonRef = useRef(null);
  const now = useMemo(() => new Date(), []);

  const toggleFilter = useCallback((key) => {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ fitting: false, cashless: false, openToday: false });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCityInput("");
      setPostalCode("");
      setPoints([]);
      setError("");
      setSelectedCode(null);
      resetFilters();
      return;
    }

    if (initialFieldRef.current) {
      initialFieldRef.current.focus();
    }
  }, [isOpen, resetFilters]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) {
      return undefined;
    }

    const focusable = modalRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );

    if (focusable.length === 0) {
      return undefined;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);

    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isOpen, onClose]);

  const handleLoad = async () => {
    setLoading(true);
    setError("");
    try {
      const normalizedCity = city ? city.trim() : undefined;
      const normalizedPostal = postalCode ? postalCode.trim() : undefined;
      const data = await fetchPickupPoints({
        provider,
        city: normalizedCity,
        postalCode: normalizedPostal,
      });
      setPoints(data);
      if (data.length === 0) {
        setSelectedCode(null);
      }
    } catch (fetchError) {
      console.error("Failed to load pickup points", fetchError);
      setError(t("cartPage.pickup.error"));
      setPoints([]);
      setSelectedCode(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (point) => {
    setSelectedCode(point.code);
    onSelect(point);
    onClose();
  };

  const city = debouncedCity;

  const openTodayMap = useMemo(() => {
    const map = new Map();
    points.forEach((point) => {
      map.set(point.code, isPointOpenToday(point, now));
    });
    return map;
  }, [points, now]);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => {
      if (filters.fitting && !point.features?.fitting) {
        return false;
      }
      if (filters.cashless && !point.features?.cashless) {
        return false;
      }
      if (filters.openToday && !openTodayMap.get(point.code)) {
        return false;
      }

      return true;
    });
  }, [points, filters, openTodayMap]);

  const hasActiveFilters = filters.fitting || filters.cashless || filters.openToday;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!filteredPoints.find((point) => point.code === selectedCode)) {
      setSelectedCode(null);
    }
  }, [filteredPoints, selectedCode, isOpen]);

  useEffect(() => {
    if (!isOpen || !mapRef.current) {
      return;
    }

    if (points.length === 0) {
      mapRef.current.setView(DEFAULT_CENTER, 10);
      return;
    }

    const valid = points.filter((point) => hasValidCoordinates(point));
    if (!valid.length) {
      return;
    }

    const bounds = L.latLngBounds(valid.map((point) => [point.location.lat, point.location.lon]));
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [points, isOpen]);

  useEffect(() => {
    if (!isOpen || !mapRef.current || !selectedCode) {
      return;
    }

    const target = filteredPoints.find((point) => point.code === selectedCode);
    if (!target || !hasValidCoordinates(target)) {
      return;
    }

    mapRef.current.flyTo([target.location.lat, target.location.lon], Math.max(mapRef.current.getZoom(), 14), {
      animate: true,
    });
  }, [filteredPoints, selectedCode, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-modal-title"
        aria-describedby="pickup-modal-description"
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-950 text-slate-100 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div className="space-y-1">
            <span id="pickup-modal-title" className="text-[0.6rem] uppercase tracking-[0.35em] text-teal-400">
              {t("cartPage.pickup.title", { provider: t(`shipping.providers.${provider}`) })}
            </span>
            <p id="pickup-modal-description" className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {t("cartPage.pickup.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            ref={closeButtonRef}
            className="rounded-full border border-slate-700 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-slate-400 transition hover:border-teal-400 hover:text-teал-300"
          >
            {t("cartPage.pickup.close")}
          </button>
        </header>

        <div className="flex flex-col gap-3 border-b border-slate-800 px-6 py-4 text-[0.65rem] uppercase tracking-[0.3em] text-slate-300">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="flex flex-col gap-2">
              <span className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">
                {t("cartPage.form.city")}
              </span>
              <input
                type="text"
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
                ref={initialFieldRef}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[0.65rem] text-slate-100 focus:border-teal-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">
                {t("cartPage.form.postalCode")}
              </span>
              <input
                type="text"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[0.65rem] text-slate-100 focus:border-teal-400 focus:outline-none"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleLoad}
                disabled={loading || (!city && !postalCode)}
                className="inline-flex items-center justify-center rounded-full border border-teal-400/60 bg-teal-400/10 px-4 py-2 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-teal-300 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? t("cartPage.form.loadingQuote") : t("cartPage.pickup.search")}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[0.55rem] uppercase tracking-[0.3em] text-slate-400">
            <span className="text-slate-500">{t("cartPage.pickup.filterLabel")}</span>
            <button
              type="button"
              aria-pressed={filters.cashless}
              className={`rounded-full border px-3 py-1 transition ${
                filters.cashless
                  ? "border-teal-400 bg-teal-400/10 text-teal-300"
                  : "border-slate-700 text-slate-400 hover:border-teal-400/60 hover:text-teal-200"
              }`}
              onClick={() => toggleFilter("cashless")}
            >
              {t("cartPage.pickup.filters.cashless")}
            </button>
            <button
              type="button"
              aria-pressed={filters.fitting}
              className={`rounded-full border px-3 py-1 transition ${
                filters.fitting
                  ? "border-teal-400 bg-teal-400/10 text-teal-300"
                  : "border-slate-700 text-slate-400 hover:border-teal-400/60 hover:text-teal-200"
              }`}
              onClick={() => toggleFilter("fitting")}
            >
              {t("cartPage.pickup.filters.fitting")}
            </button>
            <button
              type="button"
              aria-pressed={filters.openToday}
              className={`rounded-full border px-3 py-1 transition ${
                filters.openToday
                  ? "border-teal-400 bg-teal-400/10 text-teal-300"
                  : "border-slate-700 text-slate-400 hover:border-teal-400/60 hover:text-teal-200"
              }`}
              onClick={() => toggleFilter("openToday")}
            >
              {t("cartPage.pickup.filters.openToday")}
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                className="rounded-full border border-slate-700 px-3 py-1 text-slate-400 transition hover:border-teal-400/60 hover:text-teal-200"
                onClick={resetFilters}
              >
                {t("cartPage.pickup.filters.reset")}
              </button>
            ) : null}
            <span className="ml-auto text-[0.55rem] text-slate-500">
              {t("cartPage.pickup.results", { count: filteredPoints.length })}
            </span>
          </div>
          {error ? (
            <span className="text-[0.55rem] font-semibold text-rose-400" role="alert">{error}</span>
          ) : null}
        </div>

        <div className="grid h-[70vh] gap-0 md:grid-cols-[1fr_1fr]">
          <div className="h-full">
            <MapContainer
              center={center}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(mapInstance) => {
                mapRef.current = mapInstance;
              }}
              aria-label={t("cartPage.pickup.mapLabel")}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClusterLayer
                points={filteredPoints}
                onSelect={handleSelect}
                onFocus={setSelectedCode}
                selectedCode={selectedCode}
                openTodayMap={openTodayMap}
                translate={t}
              />
            </MapContainer>
          </div>
          <div className="flex h-full flex-col overflow-y-auto border-t border-slate-800 bg-slate-900 p-4 md:border-l md:border-t-0" role="listbox" aria-label={t("cartPage.pickup.listLabel")}>
            {filteredPoints.length === 0 && !loading ? (
              <div className="flex flex-1 items-center justify-center text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">
                {hasActiveFilters ? t("cartPage.pickup.emptyFiltered") : t("cartPage.pickup.empty")}
              </div>
            ) : null}
            <ul className="flex flex-col gap-3">
              {filteredPoints.map((point) => {
                const isActive = selectedCode === point.code;
                const openToday = openTodayMap.get(point.code);
                return (
                  <li
                    key={`${point.provider}-${point.code}`}
                    className={`rounded-2xl border px-4 py-3 text-[0.6rem] uppercase tracking-[0.3em] transition ${
                      isActive
                        ? "border-teal-400/80 bg-teal-400/10 text-teal-300"
                        : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-teal-400/60 hover:text-teal-200"
                    }`}
                    role="option"
                    aria-selected={isActive}
                    tabIndex={0}
                    onClick={() => setSelectedCode(point.code)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCode(point.code);
                      }
                    }}
                  >
                    <div className="font-semibold text-[0.6rem] uppercase tracking-[0.35em]">{point.name}</div>
                    <div className="text-[0.55rem] text-slate-400">{point.address}</div>
                    {point.schedule ? (
                      <div className="text-[0.5rem] text-slate-500">{point.schedule}</div>
                    ) : null}
                    {openToday ? (
                      <div className="text-[0.5rem] font-semibold text-teal-400">
                        {t("cartPage.pickup.openToday")}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[0.45rem] uppercase tracking-[0.3em] text-teal-300">
                      {point.features?.cash ? <span>{t("cartPage.pickup.features.cash")}</span> : null}
                      {point.features?.cashless ? <span>{t("cartPage.pickup.features.cashless")}</span> : null}
                      {point.features?.fitting ? <span>{t("cartPage.pickup.features.fitting")}</span> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelect(point)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal-400/60 px-3 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.35em] text-teal-300 transition hover:border-teal-400 hover:text-teal-200"
                    >
                      {t("cartPage.pickup.choose")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

PickupPointModal.propTypes = {
  provider: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default PickupPointModal;

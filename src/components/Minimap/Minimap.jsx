import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxLanguage from "@mapbox/mapbox-gl-language";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./Minimap.module.css";

mapboxgl.accessToken =
    "pk.eyJ1IjoibWFoaTYyIiwiYSI6ImNtb3c3bXBsZTAzdnkycHB2bnlpc3V0bmcifQ.GYUUwH-J7E4wU9yX4snLfg";
const knownPlaceCoordinates = {
    "伊勢神宮": [136.7194, 34.4854],
};

function formatDistance(distance) {
    const km = distance / 1000;

    if (km >= 10) {
        return Math.round(km).toString();
    }

    return km.toFixed(1);
}

function formatDuration(duration) {
    return Math.round(duration / 60);
}

function normalizePlaceName(place) {

    function getKnownPlaceCoordinates(place) {
        const normalizedPlace = normalizePlaceName(place);

        return Object.entries(knownPlaceCoordinates).find(([name]) =>
            normalizedPlace === name || normalizedPlace.includes(name)
        )?.[1] ?? null;
    }
    if (typeof place !== "string") {
        return "";
    }

    return place
        .replace(/[()（）]/g, " ")
        .replace(/エリア/g, "")
        .trim();
}

function toRadians(value) {
    return (value * Math.PI) / 180;
}

function haversineDistance([lng1, lat1], [lng2, lat2]) {
    const earthRadius = 6371000;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);
    const sinLat = Math.sin(deltaLat / 2);
    const sinLng = Math.sin(deltaLng / 2);
    const a =
        sinLat * sinLat +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLng * sinLng;

    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function projectPointOnSegment(point, start, end) {
    const latScale = 110540;
    const lngScale = 111320 * Math.cos(toRadians((start[1] + end[1]) / 2));

    const px = point[0] * lngScale;
    const py = point[1] * latScale;
    const sx = start[0] * lngScale;
    const sy = start[1] * latScale;
    const ex = end[0] * lngScale;
    const ey = end[1] * latScale;

    const abx = ex - sx;
    const aby = ey - sy;
    const apx = px - sx;
    const apy = py - sy;
    const abLengthSquared = abx * abx + aby * aby;

    if (abLengthSquared === 0) {
        return { progress: 0, distance: Math.hypot(apx, apy) };
    }

    const progress = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLengthSquared));
    const closestX = sx + abx * progress;
    const closestY = sy + aby * progress;

    return {
        progress,
        distance: Math.hypot(px - closestX, py - closestY),
    };
}

function getClosestRouteProgress(coordinates, location) {
    if (!coordinates?.length || coordinates.length < 2 || !location) {
        return {
            distanceMeters: 0,
            deviationMeters: 0,
        };
    }

    let bestDistance = Number.POSITIVE_INFINITY;
    let bestProgress = 0;
    let traveledDistance = 0;

    for (let index = 0; index < coordinates.length - 1; index += 1) {
        const start = coordinates[index];
        const end = coordinates[index + 1];
        const segmentLength = haversineDistance(start, end);
        const projection = projectPointOnSegment(location, start, end);

        if (projection.distance < bestDistance) {
            bestDistance = projection.distance;
            bestProgress = traveledDistance + segmentLength * projection.progress;
        }

        traveledDistance += segmentLength;
    }

    return {
        distanceMeters: bestProgress,
        deviationMeters: bestDistance,
    };
}

function buildStepTimeline(steps) {
    let cumulativeDistance = 0;
    let cumulativeDuration = 0;

    return steps.map((step, index) => {
        const distance = step.distance ?? 0;
        const duration = step.duration ?? 0;
        const entry = {
            ...step,
            index,
            distance,
            duration,
            cumulativeDistanceStart: cumulativeDistance,
            cumulativeDistanceEnd: cumulativeDistance + distance,
            cumulativeDurationStart: cumulativeDuration,
            cumulativeDurationEnd: cumulativeDuration + duration,
            instruction:
                step.maneuver?.instruction ??
                step.bannerInstructions?.[0]?.primary?.text ??
                step.name ??
                "次の案内です",
        };

        cumulativeDistance += distance;
        cumulativeDuration += duration;

        return entry;
    });
}

function getDistanceText(distanceMeters) {
    return formatDistance(distanceMeters);
}

function getDurationText(durationSeconds) {
    return formatDuration(durationSeconds);
}

function MiniMap({ place, address, label, center: initialCenter, zoom: initialZoom = 12 }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const watchIdRef = useRef(null);
    const routePlanRef = useRef(null);
    const spokenStepIndexRef = useRef(-1);
    const lastRerouteAtRef = useRef(0);
    const initialLocationRequestRef = useRef(false);

    const destinationMarker = useRef(null);
    const currentMarker = useRef(null);

    const [center, setCenter] = useState([
        135.4983,
        34.7025
    ]);

    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeSummary, setRouteSummary] = useState(null);
    const [routePlan, setRoutePlan] = useState(null);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [remainingDistance, setRemainingDistance] = useState(null);
    const [remainingDuration, setRemainingDuration] = useState(null);
    const [deviationMeters, setDeviationMeters] = useState(null);
    const [navigationState, setNavigationState] = useState("ready");
    const [navigationError, setNavigationError] = useState("");
    const [mapLoaded, setMapLoaded] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [destinationReady, setDestinationReady] = useState(
        Array.isArray(initialCenter) && initialCenter.length === 2 && !address
    );

    const zoom = initialZoom;

    const routeSteps = routePlan?.steps ?? [];
    const currentStep = routeSteps[activeStepIndex] ?? null;

    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("このブラウザでは位置情報を利用できません。"));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve([
                        position.coords.longitude,
                        position.coords.latitude,
                    ]);
                },
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000,
                }
            );
        });
    }

    function announceInstruction(text) {
        if (!window.speechSynthesis || !text) {
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ja-JP";
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
    }

    function makeRouteAnnouncement(step, distanceLeftMeters, durationLeftSeconds) {
        const stepText = step?.instruction ?? "現在の案内を取得しました。";
        const distanceText = distanceLeftMeters != null
            ? `目的地まで約 ${getDistanceText(distanceLeftMeters)} kmです。`
            : "";
        const durationText = durationLeftSeconds != null
            ? `所要時間は約 ${getDurationText(durationLeftSeconds)} 分です。`
            : "";

        return [
            "ご案内します。",
            stepText,
            distanceText,
            durationText,
        ]
            .filter(Boolean)
            .join(" ");
    }

    async function fetchRoute(origin) {
        if (!origin) {
            return null;
        }

        try {
            setNavigationState("loading");
            setNavigationError("");

            const url =
                `https://api.mapbox.com/directions/v5/mapbox/driving/` +
                `${origin[0]},${origin[1]};` +
                `${center[0]},${center[1]}` +
                `?geometries=geojson&steps=true&overview=full&banner_instructions=true&voice_instructions=true&voice_units=metric&language=ja&access_token=${mapboxgl.accessToken}`;

            const res = await fetch(url);
            const data = await res.json();

            if (!data.routes?.length) {
                setRoutePlan(null);
                setRouteSummary(null);
                setNavigationState("ready");
                setNavigationError("ルートを取得できませんでした。");

                const source = map.current?.getSource("route");

                if (source) {
                    source.setData({
                        type: "Feature",
                        properties: {},
                        geometry: {
                            type: "LineString",
                            coordinates: [],
                        },
                    });
                }

                return null;
            }

            const route = data.routes[0];
            const steps = buildStepTimeline(
                route.legs?.flatMap((leg) => leg.steps ?? []) ?? []
            );

            const nextRoutePlan = {
                distance: route.distance ?? 0,
                duration: route.duration ?? 0,
                geometry: route.geometry,
                steps,
            };

            routePlanRef.current = nextRoutePlan;
            setRoutePlan(nextRoutePlan);
            setRouteSummary({
                distance: nextRoutePlan.distance,
                duration: nextRoutePlan.duration,
            });

            const source = map.current?.getSource("route");

            if (source) {
                source.setData({
                    type: "Feature",
                    properties: {},
                    geometry: route.geometry,
                });
            }

            setNavigationState("ready");
            return nextRoutePlan;
        } catch (error) {
            console.error("Route Error", error);
            setNavigationState("ready");
            setNavigationError("ルート案内の取得に失敗しました。");
            return null;
        }
    }

    function stopNavigation() {
        setIsNavigating(false);
        setNavigationState("ready");
        setDeviationMeters(null);
        setRemainingDistance(null);
        setRemainingDuration(null);
        spokenStepIndexRef.current = -1;

        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    async function startNavigation() {
        if (isNavigating) {
            return;
        }

        setNavigationError("");

        try {
            let origin = currentLocation;

            if (!origin) {
                origin = await getCurrentPosition();
                setCurrentLocation(origin);
            }

            if (!routePlanRef.current) {
                const nextRoutePlan = await fetchRoute(origin);

                if (!nextRoutePlan) {
                    return;
                }
            }

            setIsNavigating(true);
            setNavigationState("navigating");
            spokenStepIndexRef.current = -1;

            if (!watchIdRef.current && navigator.geolocation) {
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        setCurrentLocation([
                            position.coords.longitude,
                            position.coords.latitude,
                        ]);
                    },
                    (error) => {
                        console.error("現在地追跡失敗", error);
                        setNavigationError("現在地の追跡に失敗しました。");
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 2000,
                        timeout: 15000,
                    }
                );
            }

            if (routeSteps.length > 0) {
                announceInstruction(
                    makeRouteAnnouncement(routeSteps[0], routePlanRef.current.distance, routePlanRef.current.duration)
                );
            }
        } catch (error) {
            console.error("現在地取得失敗", error);
            setNavigationError(
                error instanceof Error ? error.message : "現在地の取得に失敗しました。"
            );
            setNavigationState("ready");
        }
    }

    function rerouteFromCurrentLocation() {
        if (!currentLocation) {
            return;
        }

        const now = Date.now();

        if (now - lastRerouteAtRef.current < 15000) {
            return;
        }

        lastRerouteAtRef.current = now;
        spokenStepIndexRef.current = -1;
        fetchRoute(currentLocation);
    }

    // 地図生成
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center,
            zoom,
        });

        map.current.addControl(new MapboxLanguage());

        map.current.on("load", () => {
            map.current.addSource("route", {
                type: "geojson",
                data: {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: [],
                    },
                },
            });

            map.current.addLayer({
                id: "route",
                type: "line",
                source: "route",
                layout: {
                    "line-cap": "round",
                    "line-join": "round",
                },
                paint: {
                    "line-color": "#2563eb",
                    "line-width": 6,
                    "line-opacity": 0.8,
                },
            });

            setMapLoaded(true);
        });

        return () => {
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }

            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }

            destinationMarker.current?.remove();
            currentMarker.current?.remove();
            map.current?.remove();
            map.current = null;
        };
    }, []);


    // 現在地取得
    useEffect(() => {
        if (initialLocationRequestRef.current) return;
        initialLocationRequestRef.current = true;

        if (!navigator.geolocation) return;

        getCurrentPosition()
            .then((position) => {
                setCurrentLocation(position);
            })
            .catch((error) => {
                console.error("現在地取得失敗", error);
            });
    }, []);


    // 初期位置が親から渡されている場合はそれを優先
    useEffect(() => {
        if (Array.isArray(initialCenter) && initialCenter.length === 2) {
            setCenter(initialCenter);
        }
    }, [initialCenter]);


    // 地名 → 座標
    useEffect(() => {
        if (Array.isArray(initialCenter) && initialCenter.length === 2) {
            setDestinationReady(true);
            return;
        }

        const keyword = normalizePlaceName(address || place);

        if (!keyword) {
            setDestinationReady(true);
            return;
        }

        let cancelled = false;

        async function geocode() {
            try {
                const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(keyword)}.json?country=jp&language=ja&limit=1&types=address,poi&access_token=${mapboxgl.accessToken}`
                );

                const data = await res.json();

                const feature = data.features?.[0];
                const knownCoordinates = getKnownPlaceCoordinates(keyword);

                if (!cancelled && knownCoordinates) {
                    setCenter(knownCoordinates);
                } else if (!cancelled && feature) {
                    setCenter(feature.center);
                }
                if (!cancelled) {
                    setDestinationReady(true);
                }
            } catch (error) {
                console.error(
                    "Geocode Error",
                    error
                );
                if (!cancelled) {
                    setDestinationReady(true);
                }
            }
        }

        geocode();

        return () => {
            cancelled = true;
        };
    }, [address, place]);


    // ルート取得
    useEffect(() => {
        if (!map.current || !mapLoaded || !center || !destinationReady) return;

        if (!currentLocation) {
            return;
        }

        let cancelled = false;

        async function updateRoute() {
            const nextRoutePlan = await fetchRoute(currentLocation);

            if (cancelled || !nextRoutePlan) {
                return;
            }

            if (isNavigating) {
                spokenStepIndexRef.current = -1;
            }
        }

        updateRoute();

        return () => {
            cancelled = true;
        };
    }, [center, currentLocation, mapLoaded]);


    // マーカー・ルート更新
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (isNavigating && currentLocation) {
            map.current.easeTo({
                center: currentLocation,
                zoom: Math.max(zoom, 14),
                duration: 700,
            });
        } else {
            map.current.flyTo({
                center,
                zoom,
            });
        }


        // 目的地マーカー
        destinationMarker.current?.remove();

        destinationMarker.current = new mapboxgl.Marker({
            color: "#e53935",
        })
            .setLngLat(center)
            .setPopup(
                new mapboxgl.Popup({
                    offset: 25,
                }).setText(label || place || address || "目的地")
            )
            .addTo(map.current);


        // 現在地マーカー
        if (currentLocation) {
            currentMarker.current?.remove();

            currentMarker.current = new mapboxgl.Marker({
                color: "#2563eb",
            })
                .setLngLat(currentLocation)
                .setPopup(
                    new mapboxgl.Popup()
                        .setText("現在地")
                )
                .addTo(map.current);
        }


    }, [
        center,
        destinationReady,
        currentLocation,
        isNavigating,
        mapLoaded
    ]);


    // ナビ進捗更新
    useEffect(() => {
        if (!isNavigating || !routePlan || !currentLocation) {
            return;
        }

        const progress = getClosestRouteProgress(
            routePlan.geometry?.coordinates ?? [],
            currentLocation
        );

        const routeStepsWithProgress = routePlan.steps;

        let nextActiveStepIndex = routeStepsWithProgress.length - 1;

        for (let index = 0; index < routeStepsWithProgress.length; index += 1) {
            if (progress.distanceMeters <= routeStepsWithProgress[index].cumulativeDistanceEnd) {
                nextActiveStepIndex = index;
                break;
            }
        }

        const activeStep = routeStepsWithProgress[nextActiveStepIndex];

        if (activeStep) {
            const ratio = activeStep.distance > 0
                ? Math.max(
                    0,
                    Math.min(
                        1,
                        (progress.distanceMeters - activeStep.cumulativeDistanceStart) / activeStep.distance
                    )
                )
                : 1;
            const durationProgress =
                activeStep.cumulativeDurationStart + activeStep.duration * ratio;

            setActiveStepIndex(nextActiveStepIndex);
            setRemainingDistance(Math.max(routePlan.distance - progress.distanceMeters, 0));
            setRemainingDuration(Math.max(routePlan.duration - durationProgress, 0));
            setDeviationMeters(progress.deviationMeters);

            if (nextActiveStepIndex !== spokenStepIndexRef.current) {
                spokenStepIndexRef.current = nextActiveStepIndex;
                announceInstruction(
                    makeRouteAnnouncement(
                        activeStep,
                        Math.max(routePlan.distance - progress.distanceMeters, 0),
                        Math.max(routePlan.duration - durationProgress, 0)
                    )
                );
            }
        }

        if (progress.deviationMeters > 120) {
            rerouteFromCurrentLocation();
        }
    }, [
        currentLocation,
        isNavigating,
        routePlan,
    ]);


    const routeDistanceText = routeSummary
        ? getDistanceText(routeSummary.distance)
        : null;
    const routeDurationText = routeSummary
        ? getDurationText(routeSummary.duration)
        : null;
    const navigationDistanceText = remainingDistance != null
        ? getDistanceText(remainingDistance)
        : routeDistanceText;
    const navigationDurationText = remainingDuration != null
        ? getDurationText(remainingDuration)
        : routeDurationText;
    const canStartNavigation = Boolean(routePlan && currentLocation);


    return (
        <div className={styles.miniMapWrap}>
            <div
                ref={mapContainer}
                className={styles.miniMap}
            />

            <div className={styles.navigationPanel}>
                <div className={styles.navigationHeader}>
                    <div>
                        <p className={styles.panelLabel}>Mapbox ナビ</p>
                        <h4 className={styles.panelTitle}>
                            {place || "目的地"}
                        </h4>
                    </div>
                    <span className={styles.statusBadge} data-state={navigationState}>
                        {isNavigating ? "案内中" : navigationState === "loading" ? "準備中" : "待機中"}
                    </span>
                </div>

                <div className={styles.navigationMetrics}>
                    <div>
                        <span>距離</span>
                        <strong>{routeDistanceText ? `約 ${routeDistanceText} km` : "取得中"}</strong>
                    </div>
                    <div>
                        <span>時間</span>
                        <strong>{routeDurationText ? `約 ${routeDurationText} 分` : "取得中"}</strong>
                    </div>
                </div>

                {navigationError && (
                    <p className={styles.navigationError}>{navigationError}</p>
                )}

                {isNavigating && currentStep && (
                    <div className={styles.currentInstruction}>
                        <p className={styles.sectionLabel}>現在の案内</p>
                        <p className={styles.instructionText}>{currentStep.instruction}</p>
                        <p className={styles.navigationDetail}>
                            残り約 {navigationDistanceText ? `${navigationDistanceText} km` : "-"} / {navigationDurationText ? `${navigationDurationText} 分` : "-"}
                        </p>
                        {deviationMeters != null && deviationMeters > 60 && (
                            <p className={styles.navigationWarn}>
                                ルートから約 {Math.round(deviationMeters)} m 外れています。自動で再検索します。
                            </p>
                        )}
                    </div>
                )}

                {!isNavigating && routeSteps[activeStepIndex] && (
                    <div className={styles.currentInstruction}>
                        <p className={styles.sectionLabel}>出発前の案内</p>
                        <p className={styles.instructionText}>{routeSteps[activeStepIndex].instruction}</p>
                        {routeSteps[activeStepIndex + 1] && (
                            <p className={styles.navigationDetail}>
                                次の案内: {routeSteps[activeStepIndex + 1].instruction}
                            </p>
                        )}
                    </div>
                )}

                <div className={styles.navigationButtons}>
                    {!isNavigating ? (
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={startNavigation}
                            disabled={!canStartNavigation || navigationState === "loading"}
                        >
                            案内を開始
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={stopNavigation}
                        >
                            案内を終了
                        </button>
                    )}

                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => {
                            if (routeSteps[activeStepIndex]) {
                                announceInstruction(
                                    makeRouteAnnouncement(
                                        routeSteps[activeStepIndex],
                                        remainingDistance ?? routePlan?.distance ?? 0,
                                        remainingDuration ?? routePlan?.duration ?? 0
                                    )
                                );
                            }
                        }}
                        disabled={!routeSteps.length}
                    >
                        音声で再案内
                    </button>

                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={rerouteFromCurrentLocation}
                        disabled={!currentLocation}
                    >
                        ルート再計算
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MiniMap;
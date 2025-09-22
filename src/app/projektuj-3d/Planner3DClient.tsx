"use client";

import { useMemo, useState } from "react";

type LayoutVariant = "single-wall" | "l-shape" | "island";
type CabinetType = "base" | "wall" | "tall" | "island";
type ApplianceId = "fridge" | "oven" | "cooktop" | "hood" | "dishwasher";

type LayoutOption = {
  value: LayoutVariant;
  label: string;
  description: string;
};

type MaterialOption = {
  value: string;
  label: string;
  color: string;
  description: string;
};

type FloorOption = {
  value: string;
  label: string;
  pattern: string;
  accent: string;
  description: string;
};

type ApplianceOption = {
  value: ApplianceId;
  label: string;
  description: string;
};

type CabinetShape = {
  id: string;
  width: number;
  depth: number;
  height: number;
  x: number;
  z: number;
  rotation?: number;
  elevation?: number;
  type: CabinetType;
};

type CabinetDetails = {
  front?: "oven" | "dishwasher" | "fridge";
  top?: "cooktop";
  wall?: "hood";
};

type KitchenSceneProps = {
  cabinets: CabinetShape[];
  cabinetColor: string;
  countertopColor: string;
  wallColor: string;
  floor: FloorOption;
  detailsMap: Record<string, CabinetDetails>;
  appliances: ApplianceId[];
  rotation: number;
  tilt: number;
  zoom: number;
};

type SummaryProps = {
  layout: LayoutOption;
  cabinet: MaterialOption;
  countertop: MaterialOption;
  wall: MaterialOption;
  floor: FloorOption;
  appliances: ApplianceOption[];
  selectedAppliances: ApplianceId[];
  layoutTip: string;
};

type ShareStatus = { state: "idle" } | { state: "success"; message: string } | { state: "error"; message: string };

const ROOM = { width: 360, depth: 240, height: 240 };
const BASE_HEIGHT = 88;
const BASE_DEPTH = 60;
const WALL_HEIGHT = 70;
const WALL_DEPTH = 34;
const TALL_HEIGHT = 220;
const TALL_DEPTH = 64;
const WALL_ELEVATION = BASE_HEIGHT + 52;

const CAMERA_DEFAULTS = { rotation: -26, tilt: 24, zoom: 100 };

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    value: "single-wall",
    label: "Jedna ściana",
    description: "Minimum 260 cm szerokości z pełnym ciągiem blatów.",
  },
  {
    value: "l-shape",
    label: "Układ w L",
    description: "Wygodny narożnik z dodatkowym blatem pomocniczym.",
  },
  {
    value: "island",
    label: "Z wyspą",
    description: "Centralna wyspa do gotowania i spotkań.",
  },
];

const CABINET_FINISHES: MaterialOption[] = [
  {
    value: "white-matt",
    label: "Biały mat",
    color: "#f5f5f5",
    description: "Jasne fronty, które optycznie powiększają przestrzeń.",
  },
  {
    value: "oak-natural",
    label: "Dąb naturalny",
    color: "#d7b892",
    description: "Ciepłe drewno z widocznym usłojeniem.",
  },
  {
    value: "graphite-soft",
    label: "Grafit satyna",
    color: "#48505d",
    description: "Nowoczesny, elegancki półmat.",
  },
  {
    value: "deep-navy",
    label: "Granat",
    color: "#1f3556",
    description: "Wyrazista, wieczorowa kolorystyka.",
  },
];

const COUNTERTOP_FINISHES: MaterialOption[] = [
  {
    value: "quartz-ice",
    label: "Biały kwarc",
    color: "#f2f1f0",
    description: "Neutralny blat kwarcowy odporny na plamy.",
  },
  {
    value: "oak-top",
    label: "Dąb szczotkowany",
    color: "#d1a774",
    description: "Naturalna powierzchnia drewniana z olejowaniem.",
  },
  {
    value: "basalt-dark",
    label: "Bazalt grafit",
    color: "#3f454d",
    description: "Kamienny blat o głębokim odcieniu.",
  },
];

const WALL_OPTIONS: MaterialOption[] = [
  {
    value: "warm-white",
    label: "Ciepła biel",
    color: "#f8f5ef",
    description: "Uniwersalne jasne tło.",
  },
  {
    value: "sage-mist",
    label: "Szałwia",
    color: "#d9e2d1",
    description: "Delikatna zieleń do spokojnych wnętrz.",
  },
  {
    value: "powder-grey",
    label: "Popiel",
    color: "#e2e5ea",
    description: "Chłodna neutralna baza.",
  },
  {
    value: "sandstone",
    label: "Piaskowiec",
    color: "#e9dcc6",
    description: "Ciepły odcień z nutą beżu.",
  },
];

const FLOOR_OPTIONS: FloorOption[] = [
  {
    value: "light-oak",
    label: "Jasny dąb",
    pattern: "repeating-linear-gradient(90deg, #f8f1e4 0 28px, #f2e7d7 28px 30px)",
    accent: "#e8d7bb",
    description: "Deski winylowe o jasnym wybarwieniu.",
  },
  {
    value: "stone-grey",
    label: "Kamień szary",
    pattern: "radial-gradient(circle at 20% 20%, #dee2e6, #cfd4da)",
    accent: "#c1c7ce",
    description: "Płytki w szlachetnym chłodnym tonie.",
  },
  {
    value: "walnut",
    label: "Orzech",
    pattern: "repeating-linear-gradient(90deg, #cdb199 0 24px, #b69277 24px 26px)",
    accent: "#a98268",
    description: "Ciemniejsza podłoga dla kontrastu.",
  },
];

const APPLIANCE_OPTIONS: ApplianceOption[] = [
  {
    value: "fridge",
    label: "Lodówka",
    description: "Wysoka zabudowa chłodziarki przy ciągu głównym.",
  },
  {
    value: "oven",
    label: "Piekarnik",
    description: "Piekarnik w zabudowie podblatowej.",
  },
  {
    value: "cooktop",
    label: "Płyta",
    description: "Czteropolowa płyta na blacie roboczym.",
  },
  {
    value: "hood",
    label: "Okap",
    description: "Kompaktowy okap slim nad płytą.",
  },
  {
    value: "dishwasher",
    label: "Zmywarka",
    description: "60 cm zmywarka z frontem meblowym.",
  },
];

const APPLIANCE_LABELS: Record<ApplianceId, string> = {
  fridge: "Lodówka",
  oven: "Piekarnik",
  cooktop: "Płyta",
  hood: "Okap",
  dishwasher: "Zmywarka",
};

const LAYOUT_TIPS: Record<LayoutVariant, string> = {
  "single-wall": "Rozmieść AGD według zasady trójkąta: lodówka – zlew – płyta w równych odstępach.",
  "l-shape": "Zapewnij minimum 90 cm przejścia między ramionami zabudowy.",
  island: "Wyspa powinna pozostawiać przynajmniej 100 cm wolnej przestrzeni z każdej strony.",
};

const baseRowZ = -ROOM.depth / 2 + BASE_DEPTH / 2 + 6;
const tallRowZ = -ROOM.depth / 2 + TALL_DEPTH / 2 + 4;

const CORE_CABINETS: CabinetShape[] = [
  { id: "base-left", width: 92, depth: BASE_DEPTH, height: BASE_HEIGHT, x: -86, z: baseRowZ, type: "base" },
  { id: "base-center", width: 116, depth: BASE_DEPTH, height: BASE_HEIGHT, x: 0, z: baseRowZ, type: "base" },
  { id: "base-right", width: 92, depth: BASE_DEPTH, height: BASE_HEIGHT, x: 94, z: baseRowZ, type: "base" },
  { id: "tall-pantry", width: 72, depth: BASE_DEPTH, height: TALL_HEIGHT, x: 168, z: baseRowZ, type: "tall" },
  { id: "wall-left", width: 92, depth: WALL_DEPTH, height: WALL_HEIGHT, x: -86, z: baseRowZ, elevation: WALL_ELEVATION, type: "wall" },
  { id: "wall-hood", width: 116, depth: WALL_DEPTH, height: WALL_HEIGHT, x: 0, z: baseRowZ, elevation: WALL_ELEVATION, type: "wall" },
  { id: "wall-right", width: 92, depth: WALL_DEPTH, height: WALL_HEIGHT, x: 94, z: baseRowZ, elevation: WALL_ELEVATION, type: "wall" },
];

const OPTIONAL_CABINETS: Partial<Record<ApplianceId, CabinetShape>> = {
  fridge: { id: "tall-fridge", width: 80, depth: TALL_DEPTH, height: TALL_HEIGHT, x: -174, z: tallRowZ, type: "tall" },
};

const LAYOUT_ADDITIONS: Record<LayoutVariant, CabinetShape[]> = {
  "single-wall": [],
  "l-shape": [
    { id: "base-corner", width: 132, depth: BASE_DEPTH, height: BASE_HEIGHT, x: 176, z: -4, rotation: -90, type: "base" },
    { id: "wall-corner", width: 122, depth: WALL_DEPTH, height: WALL_HEIGHT, x: 176, z: -4, rotation: -90, elevation: WALL_ELEVATION, type: "wall" },
  ],
  island: [
    { id: "island-main", width: 180, depth: 88, height: BASE_HEIGHT, x: 12, z: 62, type: "island" },
  ],
};

function adjustColor(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const num = parseInt(normalized, 16);
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function Planner3DClient() {
  const [layout, setLayout] = useState<LayoutVariant>("single-wall");
  const [cabinetFinish, setCabinetFinish] = useState(CABINET_FINISHES[0].value);
  const [countertopFinish, setCountertopFinish] = useState(COUNTERTOP_FINISHES[0].value);
  const [wallFinish, setWallFinish] = useState(WALL_OPTIONS[0].value);
  const [floorFinish, setFloorFinish] = useState(FLOOR_OPTIONS[0].value);
  const [selectedAppliances, setSelectedAppliances] = useState<ApplianceId[]>([
    "cooktop",
    "hood",
    "dishwasher",
    "oven",
  ]);
  const [rotation, setRotation] = useState(CAMERA_DEFAULTS.rotation);
  const [tilt, setTilt] = useState(CAMERA_DEFAULTS.tilt);
  const [zoom, setZoom] = useState(CAMERA_DEFAULTS.zoom);
  const [shareStatus, setShareStatus] = useState<ShareStatus>({ state: "idle" });

  const cabinetOption = useMemo(
    () => CABINET_FINISHES.find((item) => item.value === cabinetFinish) ?? CABINET_FINISHES[0],
    [cabinetFinish],
  );
  const countertopOption = useMemo(
    () => COUNTERTOP_FINISHES.find((item) => item.value === countertopFinish) ?? COUNTERTOP_FINISHES[0],
    [countertopFinish],
  );
  const wallOption = useMemo(
    () => WALL_OPTIONS.find((item) => item.value === wallFinish) ?? WALL_OPTIONS[0],
    [wallFinish],
  );
  const floorOption = useMemo(
    () => FLOOR_OPTIONS.find((item) => item.value === floorFinish) ?? FLOOR_OPTIONS[0],
    [floorFinish],
  );

  const cabinets = useMemo(() => {
    const base = CORE_CABINETS.map((cabinet) => ({ ...cabinet }));
    const additions = LAYOUT_ADDITIONS[layout].map((cabinet) => ({ ...cabinet }));
    const optionals = selectedAppliances.includes("fridge") && OPTIONAL_CABINETS.fridge
      ? [{ ...OPTIONAL_CABINETS.fridge }]
      : [];
    return [...base, ...additions, ...optionals];
  }, [layout, selectedAppliances]);

  const detailsMap = useMemo(() => {
    const map: Record<string, CabinetDetails> = {};
    const assign = (id: string, partial: CabinetDetails) => {
      map[id] = { ...map[id], ...partial };
    };
    if (selectedAppliances.includes("oven")) assign("base-left", { front: "oven" });
    if (selectedAppliances.includes("dishwasher")) assign("base-right", { front: "dishwasher" });
    if (selectedAppliances.includes("cooktop")) assign("base-center", { top: "cooktop" });
    if (selectedAppliances.includes("hood")) assign("wall-hood", { wall: "hood" });
    if (selectedAppliances.includes("fridge")) assign("tall-fridge", { front: "fridge" });
    return map;
  }, [selectedAppliances]);

  const layoutOption = useMemo(
    () => LAYOUT_OPTIONS.find((item) => item.value === layout) ?? LAYOUT_OPTIONS[0],
    [layout],
  );

  const selectedApplianceOptions = useMemo(
    () =>
      APPLIANCE_OPTIONS.filter((option) => selectedAppliances.includes(option.value)).sort(
        (a, b) => APPLIANCE_OPTIONS.findIndex((item) => item.value === a.value) -
          APPLIANCE_OPTIONS.findIndex((item) => item.value === b.value),
      ),
    [selectedAppliances],
  );

  const summaryText = useMemo(() => {
    const appliancesText = selectedApplianceOptions.length
      ? selectedApplianceOptions.map((item) => item.label).join(", ")
      : "Bez dodatkowego wyposażenia";
    return `Układ: ${layoutOption.label}. Fronty: ${cabinetOption.label}. Blat: ${countertopOption.label}. Ściany: ${wallOption.label}. Podłoga: ${floorOption.label}. Wyposażenie: ${appliancesText}.`;
  }, [cabinetOption.label, countertopOption.label, floorOption.label, layoutOption.label, selectedApplianceOptions, wallOption.label]);

  const handleToggleAppliance = (value: ApplianceId) => {
    setSelectedAppliances((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleResetCamera = () => {
    setRotation(CAMERA_DEFAULTS.rotation);
    setTilt(CAMERA_DEFAULTS.tilt);
    setZoom(CAMERA_DEFAULTS.zoom);
  };

  const handleShareProject = async () => {
    const message = `Mój projekt kuchni 3D:\n${summaryText}`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator && navigator.share) {
        await navigator.share({
          title: "Projekt kuchni 3D",
          text: message,
        });
        setShareStatus({ state: "success", message: "Projekt udostępniony." });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        setShareStatus({ state: "success", message: "Opis projektu skopiowany do schowka." });
        return;
      }
      setShareStatus({
        state: "error",
        message: `Udostępnianie nie jest dostępne w tej przeglądarce. Skopiuj opis projektu:\n${message}`,
      });
    } catch (error) {
      console.error(error);
      setShareStatus({ state: "error", message: "Nie udało się udostępnić projektu. Spróbuj ponownie." });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 pb-24 pt-10 text-slate-900">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Projektuj 3D</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Stwórz kuchnię w 3D na swoim telefonie</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Dobierz układ, materiały i wyposażenie, a podgląd 3D od razu pokaże, jak Twoja kuchnia będzie wyglądać.
          Interfejs został przygotowany z myślą o ekranach dotykowych – wszystkie kontrolki wygodnie obsłużysz kciukiem.
        </p>
      </header>

      <section className="rounded-3xl bg-white/90 p-5 shadow-xl ring-1 ring-slate-100">
        <KitchenScene
          cabinets={cabinets}
          cabinetColor={cabinetOption.color}
          countertopColor={countertopOption.color}
          wallColor={wallOption.color}
          floor={floorOption}
          detailsMap={detailsMap}
          appliances={selectedAppliances}
          rotation={rotation}
          tilt={tilt}
          zoom={zoom}
        />

        <div className="mt-6 grid gap-6">
          <ControlGroup title="Układ pomieszczenia">
            <div className="grid gap-3 sm:grid-cols-3">
              {LAYOUT_OPTIONS.map((option) => {
                const active = option.value === layout;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLayout(option.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-600 shadow"
                        : "border-slate-200 hover:border-orange-400 hover:bg-orange-50/70"
                    }`}
                    aria-pressed={active}
                  >
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="mt-2 block text-xs text-slate-500">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </ControlGroup>

          <ControlGroup title="Kolory i materiały">
            <div className="grid gap-5 sm:grid-cols-2">
              <MaterialSelector
                label="Fronty meblowe"
                options={CABINET_FINISHES}
                activeValue={cabinetFinish}
                onSelect={setCabinetFinish}
              />
              <MaterialSelector
                label="Blat roboczy"
                options={COUNTERTOP_FINISHES}
                activeValue={countertopFinish}
                onSelect={setCountertopFinish}
              />
              <MaterialSelector
                label="Ściany"
                options={WALL_OPTIONS}
                activeValue={wallFinish}
                onSelect={setWallFinish}
              />
              <FloorSelector
                label="Podłoga"
                options={FLOOR_OPTIONS}
                activeValue={floorFinish}
                onSelect={setFloorFinish}
              />
            </div>
          </ControlGroup>

          <ControlGroup title="Wyposażenie">
            <div className="flex flex-wrap gap-2">
              {APPLIANCE_OPTIONS.map((option) => {
                const active = selectedAppliances.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggleAppliance(option.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      active
                        ? "bg-orange-500 text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Wybieraj sprzęty, by zobaczyć jak zmienia się zabudowa. Lodówka dodaje wysoką szafę, a płyta i okap są oznaczone na widoku.
            </p>
          </ControlGroup>

          <ControlGroup title="Widok 3D">
            <CameraSlider
              label="Obrót"
              value={rotation}
              min={-50}
              max={40}
              step={1}
              unit="°"
              onChange={setRotation}
            />
            <CameraSlider
              label="Perspektywa"
              value={tilt}
              min={12}
              max={55}
              step={1}
              unit="°"
              onChange={setTilt}
            />
            <CameraSlider
              label="Przybliżenie"
              value={zoom}
              min={85}
              max={130}
              step={1}
              unit="%"
              onChange={setZoom}
            />
            <button
              type="button"
              onClick={handleResetCamera}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow hover:bg-slate-700"
            >
              Resetuj widok
            </button>
          </ControlGroup>
        </div>
      </section>

      <section className="rounded-3xl bg-white/90 p-5 shadow-xl ring-1 ring-slate-100">
        <SummaryPanel
          layout={layoutOption}
          cabinet={cabinetOption}
          countertop={countertopOption}
          wall={wallOption}
          floor={floorOption}
          appliances={APPLIANCE_OPTIONS}
          selectedAppliances={selectedAppliances}
          layoutTip={LAYOUT_TIPS[layout]}
        />
        <button
          type="button"
          onClick={handleShareProject}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-600"
        >
          Udostępnij mój projekt
        </button>
        {shareStatus.state === "success" && (
          <p className="mt-3 text-xs font-medium text-emerald-600">{shareStatus.message}</p>
        )}
        {shareStatus.state === "error" && (
          <div className="mt-3 space-y-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <p className="whitespace-pre-wrap">{shareStatus.message}</p>
            {shareStatus.message.startsWith("Udostępnianie nie jest dostępne") ? (
              <p className="text-red-600">
                Skopiuj tekst powyżej i wklej go do wiadomości, aby podzielić się projektem.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <h2 className="text-xl font-semibold">Gotowy, by pokazać projekt wykonawcy?</h2>
        <p className="mt-3 text-sm text-slate-200">
          Zapisz najważniejsze parametry i załącz do zapytania w zakładce „Strefa firm”, aby otrzymać wyceny od studiów kuchennych.
        </p>
        <ul className="mt-5 space-y-2 text-xs uppercase tracking-[0.22em] text-slate-300">
          <li>• eksportuj projekt do PDF (wkrótce)</li>
          <li>• dodaj zdjęcia referencyjne</li>
          <li>• zapisz kontakt do projektanta</li>
        </ul>
      </section>
    </main>
  );
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-inner">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{title}</p>
      <div className="mt-4 space-y-4 text-sm text-slate-600 sm:space-y-0">{children}</div>
    </div>
  );
}

function MaterialSelector({
  label,
  options,
  activeValue,
  onSelect,
}: {
  label: string;
  options: MaterialOption[];
  activeValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const active = option.value === activeValue;
          const highlight = adjustColor(option.color, 12);
          const shade = adjustColor(option.color, -14);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-orange-500 bg-orange-50 text-orange-600 shadow"
                  : "border-slate-200 hover:border-orange-400 hover:bg-orange-50/70"
              }`}
              aria-pressed={active}
            >
              <span
                className="block h-12 w-full rounded-xl shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${highlight}, ${shade})`,
                }}
              />
              <span className="mt-3 block text-sm font-semibold text-slate-800">{option.label}</span>
              <span className="text-xs text-slate-500">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FloorSelector({
  label,
  options,
  activeValue,
  onSelect,
}: {
  label: string;
  options: FloorOption[];
  activeValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const active = option.value === activeValue;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-orange-500 bg-orange-50 text-orange-600 shadow"
                  : "border-slate-200 hover:border-orange-400 hover:bg-orange-50/70"
              }`}
              aria-pressed={active}
            >
              <span
                className="block h-12 w-full rounded-xl border border-white/30 shadow-inner"
                style={{ background: option.pattern }}
              />
              <span className="mt-3 block text-sm font-semibold text-slate-800">{option.label}</span>
              <span className="text-xs text-slate-500">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CameraSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
        <span>{label}</span>
        <span className="text-slate-700">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-orange-500"
      />
    </div>
  );
}

function SummaryPanel({
  layout,
  cabinet,
  countertop,
  wall,
  floor,
  appliances,
  selectedAppliances,
  layoutTip,
}: SummaryProps) {
  const selected = appliances.filter((item) => selectedAppliances.includes(item.value));
  return (
    <div className="space-y-4 text-sm text-slate-600">
      <h2 className="text-lg font-semibold text-slate-900">Twój projekt</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryRow label="Układ" value={layout.label} />
        <SummaryRow label="Fronty" value={cabinet.label} description={cabinet.description} />
        <SummaryRow label="Blat" value={countertop.label} description={countertop.description} />
        <SummaryRow label="Ściany" value={wall.label} description={wall.description} />
        <SummaryRow label="Podłoga" value={floor.label} description={floor.description} />
        <SummaryRow
          label="Wyposażenie"
          value={selected.length ? selected.map((item) => item.label).join(", ") : "Bez dodatkowego wyposażenia"}
        />
      </dl>
      <div className="rounded-2xl bg-orange-50 p-4 text-xs text-orange-700">
        <p className="font-semibold uppercase tracking-[0.26em] text-orange-500">Wskazówka</p>
        <p className="mt-2 leading-relaxed text-orange-700">{layoutTip}</p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

function KitchenScene({
  cabinets,
  cabinetColor,
  countertopColor,
  wallColor,
  floor,
  detailsMap,
  appliances,
  rotation,
  tilt,
  zoom,
}: KitchenSceneProps) {
  const applianceBadges = appliances.map((item) => APPLIANCE_LABELS[item]);
  const lightenWall = adjustColor(wallColor, 18);
  const darkenWall = adjustColor(wallColor, -25);

  return (
    <div className="relative">
      <div className="relative aspect-[4/5] w-full overflow-visible">
        <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-inner" />
        <div className="absolute inset-[6%] overflow-visible rounded-[28px] bg-white shadow-lg ring-1 ring-slate-100">
          <div className="absolute inset-0" style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "62%",
                transformStyle: "preserve-3d",
                transform: `translate3d(-50%, -50%, 0) rotateX(${tilt}deg) rotateY(${rotation}deg) scale(${zoom / 100})`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: ROOM.width,
                  height: ROOM.height,
                  transformStyle: "preserve-3d",
                }}
              >
                <RoomShell wallColor={wallColor} wallLight={lightenWall} wallDark={darkenWall} floor={floor} />
                {cabinets.map((cabinet) => (
                  <CabinetBox
                    key={cabinet.id}
                    cabinet={cabinet}
                    cabinetColor={cabinetColor}
                    countertopColor={countertopColor}
                    details={detailsMap[cabinet.id]}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute left-1/2 top-6 flex max-w-[80%] -translate-x-1/2 flex-wrap justify-center gap-2">
            {applianceBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-slate-900/80 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white shadow"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomShell({
  wallColor,
  wallLight,
  wallDark,
  floor,
}: {
  wallColor: string;
  wallLight: string;
  wallDark: string;
  floor: FloorOption;
}) {
  const floorWidth = ROOM.width;
  const floorDepth = ROOM.depth;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: floorWidth,
          height: floorDepth,
          transform: `translate3d(${-floorWidth / 2}px, 0, ${-floorDepth / 2}px) rotateX(90deg)`,
          transformOrigin: "center",
          background: floor.pattern,
          borderRadius: "18px",
          boxShadow: "0 80px 140px rgba(15, 23, 42, 0.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: ROOM.width,
          height: ROOM.height,
          background: `linear-gradient(180deg, ${wallLight} 0%, ${wallColor} 60%, ${wallDark} 100%)`,
          transform: `translate3d(${-ROOM.width / 2}px, ${-ROOM.height}px, ${-ROOM.depth / 2}px)`,
          borderRadius: "12px",
          boxShadow: "0 40px 120px rgba(15, 23, 42, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: ROOM.depth,
          height: ROOM.height,
          background: `linear-gradient(180deg, ${wallLight} 0%, ${wallColor} 65%, ${wallDark} 100%)`,
          transform: `translate3d(${-ROOM.width / 2}px, ${-ROOM.height}px, ${-ROOM.depth / 2}px) rotateY(90deg)`,
          borderRadius: "12px",
          boxShadow: "0 30px 100px rgba(15, 23, 42, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: ROOM.depth,
          height: ROOM.height,
          background: `linear-gradient(180deg, ${adjustColor(wallLight, -5)} 0%, ${wallColor} 55%, ${wallDark} 100%)`,
          transform: `translate3d(${ROOM.width / 2}px, ${-ROOM.height}px, ${-ROOM.depth / 2}px) rotateY(-90deg)`,
          borderRadius: "12px",
          boxShadow: "0 30px 100px rgba(15, 23, 42, 0.18)",
        }}
      />
    </>
  );
}

function CabinetBox({
  cabinet,
  cabinetColor,
  countertopColor,
  details,
}: {
  cabinet: CabinetShape;
  cabinetColor: string;
  countertopColor: string;
  details?: CabinetDetails;
}) {
  const { width, depth, height, x, z, rotation = 0, elevation = 0, type } = cabinet;
  const bodyColor = type === "island" ? cabinetColor : adjustColor(cabinetColor, type === "wall" ? 6 : 0);
  const frontColor = type === "tall" ? adjustColor(bodyColor, -4) : bodyColor;
  const sideColor = adjustColor(frontColor, -28);
  const backColor = adjustColor(frontColor, -10);
  const topColor = type === "base" || type === "island"
    ? countertopColor
    : adjustColor(frontColor, 12);
  const topHighlight = adjustColor(topColor, 18);
  const topShade = adjustColor(topColor, -16);
  const baseTransform = `translate3d(${x}px, ${-elevation}px, ${z}px) rotateY(${rotation}deg)`;
  const innerTransform = `translate3d(${-width / 2}px, ${-height}px, ${-depth / 2}px)`;

  return (
    <div
      style={{
        position: "absolute",
        transformStyle: "preserve-3d",
        transform: baseTransform,
      }}
    >
      <div
        style={{
          position: "absolute",
          width,
          height,
          transformStyle: "preserve-3d",
          transform: innerTransform,
        }}
      >
        <Face width={width} height={height} color={frontColor} transform={`translateZ(${depth / 2}px)`} borderRadius={type === "island" ? 14 : 8} />
        <Face width={width} height={height} color={backColor} transform={`rotateY(180deg) translateZ(${depth / 2}px)`} borderRadius={type === "island" ? 14 : 6} />
        <Face width={depth} height={height} color={sideColor} transform={`rotateY(90deg) translateZ(${width / 2}px)`} borderRadius={8} />
        <Face width={depth} height={height} color={adjustColor(sideColor, 14)} transform={`rotateY(-90deg) translateZ(${width / 2}px)`} borderRadius={8} />
        <div
          style={{
            position: "absolute",
            width,
            height: depth,
            background: `linear-gradient(135deg, ${topHighlight}, ${topShade})`,
            transform: `rotateX(90deg) translateZ(${height}px)`,
            transformOrigin: "center",
            borderRadius: type === "island" ? "18px" : "10px",
            boxShadow: type === "island"
              ? "0 22px 50px rgba(15, 23, 42, 0.35)"
              : "0 12px 28px rgba(15, 23, 42, 0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width,
            height: 12,
            transform: `translate3d(0, ${height - 12}px, 0)`,
            background: `linear-gradient(180deg, ${adjustColor(sideColor, -12)}, ${adjustColor(sideColor, -32)})`,
            opacity: type === "base" || type === "island" ? 0.5 : 0.25,
          }}
        />
        {details?.front ? <FrontDetail type={details.front} width={width} height={height} depth={depth} /> : null}
        {details?.top ? <TopDetail type={details.top} width={width} height={height} depth={depth} /> : null}
        {details?.wall ? <WallDetail type={details.wall} width={width} height={height} depth={depth} /> : null}
      </div>
    </div>
  );
}

function Face({
  width,
  height,
  color,
  transform,
  borderRadius,
}: {
  width: number;
  height: number;
  color: string;
  transform: string;
  borderRadius?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        background: `linear-gradient(135deg, ${adjustColor(color, 18)}, ${adjustColor(color, -24)})`,
        transform,
        transformOrigin: "center",
        borderRadius,
        boxShadow: "0 6px 12px rgba(15, 23, 42, 0.18)",
      }}
    />
  );
}

function FrontDetail({
  type,
  width,
  height,
  depth,
}: {
  type: "oven" | "dishwasher" | "fridge";
  width: number;
  height: number;
  depth: number;
}) {
  if (type === "oven") {
    const doorWidth = width * 0.82;
    const doorHeight = height * 0.58;
    return (
      <div
        style={{
          position: "absolute",
          width: doorWidth,
          height: doorHeight,
          transform: `translate3d(${-doorWidth / 2}px, ${-doorHeight - height * 0.22}px, ${depth / 2 + 0.8}px)`,
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(27, 38, 59, 0.92), rgba(15, 23, 42, 0.78))",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.45)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: doorWidth * 0.6,
            height: 4,
            borderRadius: 2,
            background: "rgba(255, 255, 255, 0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: doorWidth * 0.72,
            height: doorHeight * 0.42,
            borderRadius: 10,
            background: "rgba(71, 85, 105, 0.4)",
            boxShadow: "inset 0 0 10px rgba(15, 23, 42, 0.55)",
          }}
        />
      </div>
    );
  }

  if (type === "dishwasher") {
    const panelWidth = width * 0.84;
    const panelHeight = height * 0.62;
    return (
      <div
        style={{
          position: "absolute",
          width: panelWidth,
          height: panelHeight,
          transform: `translate3d(${-panelWidth / 2}px, ${-panelHeight - height * 0.18}px, ${depth / 2 + 0.6}px)`,
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(236, 239, 244, 0.96), rgba(203, 213, 225, 0.9))",
          boxShadow: "0 10px 20px rgba(15, 23, 42, 0.35)",
          border: "1px solid rgba(148, 163, 184, 0.4)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: panelWidth * 0.5,
            height: 4,
            borderRadius: 2,
            background: "rgba(15, 23, 42, 0.35)",
          }}
        />
      </div>
    );
  }

  const handleHeight = height * 0.6;
  return (
    <div
      style={{
        position: "absolute",
        width: 8,
        height: handleHeight,
        transform: `translate3d(${width / 2 - 18}px, ${-handleHeight - height * 0.18}px, ${depth / 2 + 1}px)`,
        borderRadius: 9999,
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(148, 163, 184, 0.7))",
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.35)",
      }}
    />
  );
}

function TopDetail({
  type,
  width,
  height,
  depth,
}: {
  type: "cooktop";
  width: number;
  height: number;
  depth: number;
}) {
  if (type !== "cooktop") return null;
  const panelWidth = width * 0.72;
  const panelDepth = depth * 0.58;
  return (
    <div
      style={{
        position: "absolute",
        width: panelWidth,
        height: panelDepth,
        transform: `translate3d(${-panelWidth / 2}px, ${-height}px, ${-panelDepth / 2 + depth / 2}px) rotateX(90deg) translateZ(2px)`,
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.75))",
        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.45)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 12,
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "inset 0 0 12px rgba(15, 23, 42, 0.55)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: panelWidth * 0.18,
          height: panelWidth * 0.18,
          transform: "translate(-140%, -140%)",
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: panelWidth * 0.18,
          height: panelWidth * 0.18,
          transform: "translate(20%, -140%)",
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: panelWidth * 0.16,
          height: panelWidth * 0.16,
          transform: "translate(-140%, 10%)",
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: panelWidth * 0.16,
          height: panelWidth * 0.16,
          transform: "translate(20%, 10%)",
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.18)",
        }}
      />
    </div>
  );
}

function WallDetail({
  type,
  width,
  height,
  depth,
}: {
  type: "hood";
  width: number;
  height: number;
  depth: number;
}) {
  if (type !== "hood") return null;
  const bodyHeight = height * 0.65;
  return (
    <div
      style={{
        position: "absolute",
        width: width * 0.72,
        height: bodyHeight,
        transform: `translate3d(${-width * 0.36}px, ${-bodyHeight - height * 0.1}px, ${depth / 2 + 0.4}px)`,
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(241, 245, 249, 0.96), rgba(203, 213, 225, 0.9))",
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.35)",
        border: "1px solid rgba(148, 163, 184, 0.35)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: width * 0.32,
          height: 4,
          borderRadius: 2,
          background: "rgba(148, 163, 184, 0.8)",
        }}
      />
    </div>
  );
}

export default Planner3DClient;

import { useEffect, useMemo, useState } from "react";

type TileType = "empty" | "base" | "rally" | "farm" | "threat";

type MapTile = {
  type: TileType;
  note: string;
};

const MAP_STORAGE_KEY = "game-map-v1";
const MAP_COLUMNS = 12;
const MAP_ROWS = 8;

const tileTypes: Array<{ type: TileType; label: string }> = [
  { type: "empty", label: "Clear" },
  { type: "base", label: "Base" },
  { type: "rally", label: "Rally" },
  { type: "farm", label: "Farm" },
  { type: "threat", label: "Threat" },
];

const createEmptyMap = (): MapTile[] =>
  Array.from({ length: MAP_COLUMNS * MAP_ROWS }, () => ({ type: "empty", note: "" }));

function loadMap(): MapTile[] {
  try {
    const raw = window.localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return createEmptyMap();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== MAP_COLUMNS * MAP_ROWS) {
      return createEmptyMap();
    }

    return parsed.map((tile): MapTile => {
      const type = tileTypes.some((option) => option.type === tile?.type)
        ? tile.type
        : "empty";
      return {
        type,
        note: typeof tile?.note === "string" ? tile.note : "",
      };
    });
  } catch {
    return createEmptyMap();
  }
}

const getCoordinate = (index: number) => {
  const row = Math.floor(index / MAP_COLUMNS) + 1;
  const column = (index % MAP_COLUMNS) + 1;
  return `${column}, ${row}`;
};

export default function GameMapPage() {
  const [tiles, setTiles] = useState<MapTile[]>(loadMap);
  const [selectedType, setSelectedType] = useState<TileType>("base");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(tiles));
  }, [tiles]);

  const selectedTile = tiles[selectedIndex];

  const counts = useMemo(
    () =>
      tileTypes.reduce<Record<TileType, number>>(
        (summary, tileType) => ({
          ...summary,
          [tileType.type]: tiles.filter((tile) => tile.type === tileType.type).length,
        }),
        { empty: 0, base: 0, rally: 0, farm: 0, threat: 0 }
      ),
    [tiles]
  );

  function updateTile(index: number, type: TileType) {
    setSelectedIndex(index);
    setTiles((currentTiles) =>
      currentTiles.map((tile, tileIndex) =>
        tileIndex === index ? { ...tile, type } : tile
      )
    );
  }

  function updateSelectedNote(note: string) {
    setTiles((currentTiles) =>
      currentTiles.map((tile, tileIndex) =>
        tileIndex === selectedIndex ? { ...tile, note } : tile
      )
    );
  }

  function resetMap() {
    setTiles(createEmptyMap());
    setSelectedIndex(0);
  }

  return (
    <section className="card map-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Planning board</p>
          <h1>Game Map</h1>
        </div>
        <button className="secondary-button" type="button" onClick={resetMap}>
          Reset
        </button>
      </div>

      <div className="map-layout">
        <div className="map-board" aria-label="Editable game map">
          {tiles.map((tile, index) => (
            <button
              className={`map-tile ${tile.type} ${
                selectedIndex === index ? "selected" : ""
              }`}
              type="button"
              key={index}
              onClick={() => updateTile(index, selectedType)}
              onFocus={() => setSelectedIndex(index)}
              aria-label={`Map tile ${getCoordinate(index)} ${tile.type}`}
              title={tile.note || getCoordinate(index)}
            >
              <span className="tile-coordinate">{getCoordinate(index)}</span>
              <span className="tile-marker">{tile.type === "empty" ? "" : tile.type[0]}</span>
            </button>
          ))}
        </div>

        <aside className="map-panel">
          <div className="tile-tools" aria-label="Map tile tools">
            {tileTypes.map((tileType) => (
              <button
                className={`tool-button ${tileType.type} ${
                  selectedType === tileType.type ? "active" : ""
                }`}
                type="button"
                key={tileType.type}
                onClick={() => setSelectedType(tileType.type)}
              >
                {tileType.label}
              </button>
            ))}
          </div>

          <div className="map-summary">
            {tileTypes
              .filter((tileType) => tileType.type !== "empty")
              .map((tileType) => (
                <div className="summary-row" key={tileType.type}>
                  <span>{tileType.label}</span>
                  <strong>{counts[tileType.type]}</strong>
                </div>
              ))}
          </div>

          <label className="note-field">
            <span>Tile {getCoordinate(selectedIndex)}</span>
            <textarea
              value={selectedTile.note}
              onChange={(event) => updateSelectedNote(event.target.value)}
              placeholder="Add target, timer, or player note"
            />
          </label>
        </aside>
      </div>
    </section>
  );
}

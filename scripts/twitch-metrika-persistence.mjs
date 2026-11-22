import { readFile, rename, unlink, writeFile } from "node:fs/promises";

const STATUSES = new Set(["available", "pending", "not_found", "stale", "unavailable"]);
const OUTPUT = "lib/api/data/twitch-followers-metrika.snapshot.json";
const SOURCE = "Metrika Twitch account followers";
const PERSISTED_FIELDS = ["id", "login", "followerCount", "collectedAt"];
const HEADER_FIELDS = ["version", "source", "generatedAt", "collectedAt", "records"];
const PENDING_STAMP = new Date(0).toISOString();

/** Validate one normalized Metrika result before it is accepted for projection. */
function validateRecord(record) {
  if (!record || typeof record.login !== "string" || !/^[a-z0-9_]{1,25}$/i.test(record.login) ||
    typeof record.userId !== "string" || !/^\d+$/.test(record.userId) || !STATUSES.has(record.status) ||
    (record.value !== null && (!Number.isSafeInteger(record.value) || record.value < 0)) ||
    (record.collectedAt !== null && (typeof record.collectedAt !== "string" || !Number.isFinite(Date.parse(record.collectedAt))))) {
    throw new Error("Invalid normalized Twitch Metrika result.");
  }
  if (record.status === "available" && (record.value === null || record.collectedAt === null)) {
    throw new Error("Available Twitch Metrika result requires a value and collection time.");
  }
  if (record.retrievedAt !== undefined &&
    (typeof record.retrievedAt !== "string" || !Number.isFinite(Date.parse(record.retrievedAt)))) {
    throw new Error("Invalid Twitch Metrika retrieval time.");
  }
}

/** Validate a record that already lives in the persisted artifact (reader shape). */
function validatePersistedRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Invalid persisted Twitch Metrika record.");
  }
  const keys = Object.keys(record);
  if (keys.length !== PERSISTED_FIELDS.length || keys.some((key) => !PERSISTED_FIELDS.includes(key))) {
    throw new Error("Persisted Twitch Metrika record contains an unexpected field.");
  }
  if (typeof record.login !== "string" || record.login !== record.login.toLowerCase() ||
    !/^[a-z0-9_]{1,25}$/.test(record.login) || record.id !== `twitch:${record.login}` ||
    !Number.isSafeInteger(record.followerCount) || record.followerCount < 0 ||
    typeof record.collectedAt !== "string" || !Number.isFinite(Date.parse(record.collectedAt))) {
    throw new Error("Persisted Twitch Metrika record failed validation.");
  }
}

/**
 * Project one incoming result onto the reader's four-field record shape.
 * The reader requires a numeric followerCount and has no representation for a
 * missing metric, so any non-`available` status projects to `null` and is not
 * written.
 */
function projectRecord(record) {
  validateRecord(record);
  if (record.status !== "available") return null;
  const login = record.login.toLowerCase();
  return {
    id: `twitch:${login}`,
    login,
    followerCount: record.value,
    collectedAt: record.collectedAt,
  };
}

/** Read and strictly validate the current artifact, or fail loudly. */
async function readArtifact(outputPath) {
  let raw;
  try {
    raw = JSON.parse(await readFile(outputPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Twitch Metrika artifact is missing; call beginTwitchMetrikaRun before persisting.");
    }
    throw error;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
    raw.version !== 1 || typeof raw.source !== "string" ||
    typeof raw.generatedAt !== "string" || typeof raw.collectedAt !== "string" ||
    !Array.isArray(raw.records)) {
    throw new Error("Twitch Metrika persistence artifact schema invalid.");
  }
  const records = raw.records.map((record) => {
    validatePersistedRecord(record);
    return Object.fromEntries(PERSISTED_FIELDS.map((key) => [key, record[key]]));
  });
  return {
    header: {
      version: raw.version,
      source: raw.source,
      generatedAt: raw.generatedAt,
      collectedAt: raw.collectedAt,
    },
    records,
  };
}

/** Temp-file -> re-parse -> atomic rename, with a header/record key-set self-check. */
async function writeArtifactAtomic(outputPath, artifact) {
  const tempPath = `${outputPath}.${process.pid}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    const serialized = JSON.parse(await readFile(tempPath, "utf8"));
    if (!serialized || typeof serialized !== "object" || Array.isArray(serialized) ||
      Object.keys(serialized).length !== HEADER_FIELDS.length ||
      Object.keys(serialized).some((key) => !HEADER_FIELDS.includes(key)) ||
      !Array.isArray(serialized.records) ||
      serialized.records.some((item) => !item || typeof item !== "object" || Array.isArray(item) ||
        Object.keys(item).length !== PERSISTED_FIELDS.length ||
        Object.keys(item).some((key) => !PERSISTED_FIELDS.includes(key)))) {
      throw new Error("Twitch Metrika persistence artifact self-check failed.");
    }
    await rename(tempPath, outputPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

/** Persist one normalized result immediately; unknown fields/raw provider data are discarded. */
export async function persistTwitchMetrikaResult(record, { outputPath = OUTPUT } = {}) {
  const projected = projectRecord(record);
  if (!projected) return null;
  const { header, records } = await readArtifact(outputPath);
  const existingIndex = records.findIndex((item) => item.login === projected.login);
  if (existingIndex === -1) records.push(projected);
  else records[existingIndex] = projected;
  records.sort((a, b) => a.login.localeCompare(b.login));
  await writeArtifactAtomic(outputPath, { ...header, records });
  return projected;
}

/** Start a new census without carrying any prior-run metric values forward. */
export async function beginTwitchMetrikaRun({ outputPath = OUTPUT } = {}) {
  // The epoch sentinel is deliberate fail-closed behaviour: an artifact left
  // behind by a crashed or partial run fails the reader's age gate instead of
  // serving a shrunken pool with a fresh timestamp.
  const artifact = {
    version: 1,
    source: SOURCE,
    generatedAt: PENDING_STAMP,
    collectedAt: PENDING_STAMP,
    records: [],
  };
  await writeArtifactAtomic(outputPath, artifact);
}

/** Stamp a completed run: generatedAt is now, collectedAt is the earliest provider collection time. */
export async function finalizeTwitchMetrikaRun({ outputPath = OUTPUT } = {}) {
  const { header, records } = await readArtifact(outputPath);
  if (records.length === 0) {
    throw new Error("Refusing to finalize a Twitch Metrika artifact with no records.");
  }
  const earliest = Math.min(...records.map((record) => Date.parse(record.collectedAt)));
  if (!Number.isFinite(earliest)) {
    throw new Error("Twitch Metrika artifact contains an unparseable collection time.");
  }
  const artifact = {
    version: header.version,
    source: header.source,
    generatedAt: new Date().toISOString(),
    collectedAt: new Date(earliest).toISOString(),
    records,
  };
  await writeArtifactAtomic(outputPath, artifact);
  return artifact;
}

export { OUTPUT as TWITCH_METRIKA_RESULTS_PATH };

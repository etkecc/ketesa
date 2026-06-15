import { parse as parseCsv, unparse as unparseCsv, ParseResult } from "papaparse";
import { ChangeEvent, useState } from "react";
import { useTranslate, useNotify, HttpError } from "react-admin";

import { ImportLine, ParsedStats, Progress, ImportResult, ChangeStats } from "./types";
import dataProvider from "../../providers/data";
import { returnMXID, generateRandomMXID } from "../../utils/mxid";
import { generateRandomPassword } from "../../utils/password";
import createLogger from "../../utils/logger";

const log = createLogger("import");

const LOGGING = true;

const EXPECTED_FIELDS = ["id", "displayname"].sort();

const FALSE_VALUES = ["", "0", "false", "no", "off", "null", "undefined"];
const TRUE_VALUES = ["1", "true", "yes", "on"];

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const anyToBoolean = (value: any): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return false;
    }
    return value !== 0;
  }
  if (typeof value === "string") {
    const val = value.trim().toLowerCase();
    if (TRUE_VALUES.includes(val)) {
      return true;
    }
    if (FALSE_VALUES.includes(val)) {
      return false;
    }
  }
  return false;
};

export interface CsvValidationResult {
  ok: boolean;
  data: ImportLine[];
  stats: ParsedStats | null;
  errors: string[];
}

export const validateCsvImport = (
  { data, meta, errors }: ParseResult<ImportLine>,
  translate: (key: string, options?: Record<string, unknown>) => string
): CsvValidationResult => {
  /* First, verify the presence of required fields */
  meta.fields = meta.fields?.map(f => f.trim().toLowerCase());
  const missingFields = EXPECTED_FIELDS.filter(eF => !meta.fields?.find(mF => eF === mF));

  if (missingFields.length > 0) {
    return {
      ok: false,
      data: [],
      stats: null,
      errors: [translate("import_users.error.required_field", { field: missingFields[0] })],
    };
  }

  /* Collect some stats to prevent sneaky csv files from adding admin
     users or something.
   */
  const stats: ParsedStats = {
    user_types: { default: 0 },
    is_guest: 0,
    admin: 0,
    deactivated: 0,
    password: 0,
    avatar_url: 0,
    id: 0,

    total: data.length,
  };

  const errorMessages = errors.map(e => e.message);
  // sanitize the data first
  data = data.map(line => {
    const newLine = {} as ImportLine;
    for (const [key, value] of Object.entries(line)) {
      const normalizedKey = key.trim().toLowerCase();
      const normalizedValue = typeof value === "string" ? value.trim() : value;
      newLine[normalizedKey] = normalizedValue;
    }
    return newLine;
  });

  // process the data
  data.forEach((line, idx) => {
    if (line.user_type === undefined || line.user_type === "") {
      stats.user_types.default++;
    } else {
      if (stats.user_types[line.user_type] === undefined) {
        stats.user_types[line.user_type] = 0;
      }
      stats.user_types[line.user_type] += 1;
    }
    /* XXX correct the csv export that react-admin offers for the users
     * resource so it gives sensible field names and doesn't duplicate
     * id as "name"?
     */
    if (meta.fields?.includes("name")) {
      delete line.name;
    }
    if (meta.fields?.includes("is_admin")) {
      delete line.is_admin;
    }

    ["is_guest", "admin", "deactivated"].forEach(f => {
      const rawValue = line[f];
      if (rawValue === undefined || rawValue === "") {
        line[f] = false; // default values to false
        return;
      }
      if (typeof rawValue === "boolean") {
        if (rawValue) {
          stats[f]++;
        }
        line[f] = rawValue;
        return;
      }

      const normalizedValue = String(rawValue).trim().toLowerCase();
      if (TRUE_VALUES.includes(normalizedValue)) {
        stats[f]++;
        line[f] = true; // we need true booleans instead of strings
        return;
      }
      if (FALSE_VALUES.includes(normalizedValue)) {
        line[f] = false;
        return;
      }

      log.warn("invalid value in CSV", { field: f, row: idx, value: rawValue });
      errorMessages.push(
        translate("import_users.error.invalid_value", {
          field: f,
          row: idx,
        })
      );
      line[f] = false; // default values to false
    });

    if (line.password !== undefined && line.password !== "") {
      stats.password++;
    }

    if (line.avatar_url !== undefined && line.avatar_url !== "") {
      stats.avatar_url++;
    }

    if (line.id !== undefined && line.id !== "") {
      stats.id++;
    }
  });

  if (errorMessages.length > 0) {
    return { ok: false, data, stats: null, errors: errorMessages };
  }

  return { ok: true, data, stats, errors: [] };
};

const useImportFile = () => {
  const [csvData, setCsvData] = useState<ImportLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [stats, setStats] = useState<ParsedStats | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const [progress, setProgress] = useState<Progress>(null);

  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [skippedRecords, setSkippedRecords] = useState<string>("");

  const [conflictMode, setConflictMode] = useState<"stop" | "skip">("stop");
  const [useridMode, setUseridMode] = useState<"update" | "ignore">("update");

  const translate = useTranslate();
  const notify = useNotify();

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (progress !== null) return;

    setCsvData([]);
    setErrors([]);
    setStats(null);
    setImportResults(null);
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    /* Let's refuse some unreasonably big files instead of freezing
     * up the browser */
    if (file.size > 100000000) {
      const message = translate("import_users.errors.unreasonably_big", {
        size: (file.size / (1024 * 1024)).toFixed(2),
      });
      notify(message);
      setErrors([message]);
      return;
    }
    try {
      parseCsv<ImportLine>(file, {
        header: true,
        skipEmptyLines: true /* especially for a final EOL in the csv file */,
        complete: result => {
          if (result.errors) {
            setErrors(result.errors.map(e => e.toString()));
          }
          /* Papaparse is very lenient, we may be able to salvage
           * the data in the file. */
          verifyCsv(result);
        },
      });
    } catch {
      setErrors(["Unknown error"]);
      return null;
    }
  };

  const verifyCsv = ({ data, meta, errors }: ParseResult<ImportLine>) => {
    const result = validateCsvImport({ data, meta, errors }, translate);
    if (!result.ok) {
      setErrors(result.errors);
      return false;
    }

    setStats(result.stats);
    setCsvData(result.data);
    return true;
  };

  const onConflictModeChanged = async (e: ChangeEvent<HTMLSelectElement>) => {
    if (progress !== null) {
      return;
    }

    const value = e.target.value as "stop" | "skip";
    setConflictMode(value);
  };

  const onUseridModeChanged = (e: ChangeEvent<HTMLSelectElement>) => {
    if (progress !== null) {
      return;
    }

    const value = e.target.value as "update" | "ignore";
    setUseridMode(value);
  };

  const onDryRunModeChanged = (e: ChangeEvent<HTMLInputElement>) => {
    if (progress !== null) {
      return;
    }
    setDryRun(e.target.checked);
  };

  const runImport = async () => {
    if (progress !== null) {
      notify("import_users.errors.already_in_progress");
      return;
    }

    const results = await doImport();
    setImportResults(results);
    // offer CSV download of skipped or errored records
    // (so that the user doesn't have to filter out successful
    // records manually when fixing stuff in the CSV)
    setSkippedRecords(unparseCsv(results.skippedRecords));
    if (LOGGING) log.debug("skipped records after parse", { count: results.skippedRecords.length });
  };

  const doImport = async (): Promise<ImportResult> => {
    const skippedRecords: ImportLine[] = [];
    const succeededRecords: ImportLine[] = [];
    const changeStats: ChangeStats = {
      total: 0,
      id: 0,
      is_guest: 0,
      admin: 0,
      password: 0,
    };
    let entriesDone = 0;
    const entriesCount = csvData.length;
    try {
      setProgress({ done: entriesDone, limit: entriesCount });
      for (const entry of csvData) {
        const userRecord = { ...entry };
        userRecord.deactivated = anyToBoolean(userRecord.deactivated);
        userRecord.is_guest = anyToBoolean(userRecord.is_guest);
        userRecord.admin = anyToBoolean(userRecord.admin);
        // No need to do a bunch of cryptographic random number getting if
        // we are using neither a generated password nor a generated user id.
        if (useridMode === "ignore" || userRecord.id === undefined || userRecord.id === "") {
          userRecord.id = generateRandomMXID();
        }
        // we want to ensure that the ID is always full MXID, otherwise randomly-generated MXIDs will be in the full
        // form, but the ones from the CSV will be localpart-only.
        userRecord.id = returnMXID(userRecord.id);

        // if there are 3PIDs, convert them to objects ("medium:address,..." -> [{medium,address},...])
        if (typeof userRecord.threepids === "string" && userRecord.threepids !== "") {
          const threepids = userRecord.threepids.split(",").map(m => m.trim());
          const threepidObjs: { medium: string; address: string }[] = [];
          for (const threepid of threepids) {
            const parts = threepid.split(":");
            if (parts.length !== 2) {
              continue;
            }
            const medium = parts[0].trim().toLowerCase();
            const address = parts[1].trim();
            if (address === "") {
              continue;
            }
            threepidObjs.push({ medium, address });
          }
          userRecord.threepids = threepidObjs;
        }

        /* Conflict handling lives in submitRecord below. In "ignore" id-mode the
         * IDs are random, so a hit on an existing one is just a collision and we
         * re-roll. In "update" id-mode a hit is a real existing user, handled per
         * conflictMode: "stop" aborts the run, "skip" sets the record aside for
         * the downloadable retry file. Existing users are never modified. */
        if (LOGGING) log.debug("checking existence", { id: userRecord.id });
        let retries = 0;
        const submitRecord = async (recordData: ImportLine) => {
          try {
            await dataProvider.getOne("users", { id: recordData.id });

            if (LOGGING) log.debug("user already exists", { id: recordData.id });

            // In "ignore" mode the IDs are randomly generated, so a hit on an
            // existing one is just an unlucky collision: re-roll a fresh MXID
            // and retry instead of treating it as a real conflict.
            if (useridMode === "ignore") {
              retries++;
              if (retries > 512) {
                log.warn("retry loop stuck", { id: recordData.id, retries });
                skippedRecords.push(recordData);
                return;
              }
              const newRecordData = Object.assign({}, recordData, {
                id: returnMXID(generateRandomMXID()),
              });
              await submitRecord(newRecordData);
              return;
            }

            // In "update" mode the ID comes from the CSV, so a hit means the
            // user genuinely already exists. Honor the conflict mode.
            if (conflictMode === "stop") {
              throw new Error(
                translate("import_users.error.id_exits", {
                  id: recordData.id,
                })
              );
            }

            skippedRecords.push(recordData);
            return;
          } catch (e) {
            if (!(e instanceof HttpError) || (e.status && e.status !== 404)) {
              throw e;
            }

            if (LOGGING) log.debug("creating record", { id: recordData.id, displayname: recordData.displayname });

            // Generate a password only for records we actually create, so skipped
            // records keep their original CSV value in the downloadable retry file.
            if (recordData.password === undefined || recordData.password === "") {
              recordData.password = generateRandomPassword();
            }
            if (!dryRun) {
              await dataProvider.create("users", { data: recordData });
            }
            succeededRecords.push(recordData);
          }
        };

        await submitRecord(userRecord);
        entriesDone++;
        setProgress({ done: entriesDone, limit: csvData.length });
      }

      setProgress(null);
    } catch (e) {
      setErrors([
        translate("import_users.error.at_entry", {
          entry: entriesDone + 1,
          message: e instanceof Error ? e.message : String(e),
        }),
      ]);
      setProgress(null);
    }

    return {
      skippedRecords,
      succeededRecords,
      totalRecordCount: entriesCount,
      changeStats,
      wasDryRun: dryRun,
    };
  };

  const downloadSkippedRecords = () => {
    const element = document.createElement("a");
    log.info("downloading skipped records");
    const file = new Blob([skippedRecords], {
      type: "text/comma-separated-values",
    });
    element.href = URL.createObjectURL(file);
    element.download = "skippedRecords.csv";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  return {
    csvData,
    dryRun,
    onDryRunModeChanged,
    runImport,
    progress,
    importResults,
    errors,
    stats,
    conflictMode,
    useridMode,
    onConflictModeChanged,
    onUseridModeChanged,
    onFileChange,
    downloadSkippedRecords,
  };
};

export default useImportFile;

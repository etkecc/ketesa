import { parse as parseCsv } from "papaparse";

import { ImportLine } from "./types";
import { anyToBoolean, validateCsvImport } from "./useImportFile";

const translate = (key: string) => key;

const parseText = (text: string) =>
  parseCsv<ImportLine>(text, {
    header: true,
    skipEmptyLines: true,
  });

describe("anyToBoolean", () => {
  it("handles numeric inputs", () => {
    expect(anyToBoolean(1)).toBe(true);
    expect(anyToBoolean(-1)).toBe(true);
    expect(anyToBoolean(0.1)).toBe(true);
    expect(anyToBoolean(0)).toBe(false);
    expect(anyToBoolean(Number.NaN)).toBe(false);
    expect(anyToBoolean(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("validateCsvImport", () => {
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it("accepts BOM/whitespace headers and boolean variants", () => {
    const csv = "\uFEFFID , DisplayName , is_guest , admin , deactivated\r\n" + "@user:hs, Alice, TRUE, 0, no\r\n";
    const result = validateCsvImport(parseText(csv), translate);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data[0].id).toBe("@user:hs");
    expect(result.data[0].displayname).toBe("Alice");
    expect(result.data[0].is_guest).toBe(true);
    expect(result.data[0].admin).toBe(false);
    expect(result.data[0].deactivated).toBe(false);
    expect(result.stats?.is_guest).toBe(1);
    expect(result.stats?.admin).toBe(0);
  });

  it("handles semicolon delimiters and quoted fields", () => {
    const csv = "id;displayname;is_guest\n" + '@u:hs;"Doe, John";1\n' + '@v:hs;"Line1\nLine2";0\n';
    const result = validateCsvImport(parseText(csv), translate);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].displayname).toBe("Doe, John");
    expect(result.data[1].displayname).toBe("Line1\nLine2");
  });

  it("handles blank lines and mixed line endings", () => {
    const csv = "id,displayname\r\n@u:hs,User One\r\n\r\n@v:hs,User Two\n";
    const result = validateCsvImport(parseText(csv), translate);

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.stats?.total).toBe(2);
  });

  it("errors on missing required fields", () => {
    const csv = "id,name\n@u:hs,User One\n";
    const result = validateCsvImport(parseText(csv), translate);

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toBe("import_users.error.required_field");
  });

  it("errors on invalid boolean values", () => {
    const csv = "id,displayname,is_guest\n@u:hs,User One,maybe\n";
    const result = validateCsvImport(parseText(csv), translate);

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toBe("import_users.error.invalid_value");
  });

  it("strips name/is_admin legacy aliases but preserves user_type", () => {
    const csv = "id,displayname,name,user_type,is_admin\n" + "@u:hs,User One,Legacy Name,custom,TRUE\n";
    const result = validateCsvImport(parseText(csv), translate);

    expect(result.ok).toBe(true);
    expect(result.data[0].name).toBeUndefined();
    expect(result.data[0].is_admin).toBeUndefined();
    expect(result.data[0].user_type).toBe("custom");
  });
});

import { describe, expect, it } from "vitest";

import { countryName, loadCountryLocale } from "./countries";

describe("country names", () => {
  it("maps codes to localized names once the locale pack is loaded", async () => {
    await loadCountryLocale("de");

    expect(countryName("DE", "de")).toBe("Deutschland");
  });

  it("resolves for a locale without a pack instead of throwing", async () => {
    await expect(loadCountryLocale("xx")).resolves.toBeUndefined();
  });
});

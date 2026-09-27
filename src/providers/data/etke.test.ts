import { etkeProviderMethods } from "./etke";
import type { CompanyDetails } from "../types";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("access_token", "test_token");
});

describe("getServerNotifications", () => {
  const url = "https://admin.example/etke";

  it("maps X-Notifications-Advisory: none to status ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([{ event_id: "$a", output: "body", sent_at: "2026-04-22" }]), {
        status: 200,
        headers: { "X-Notifications-Advisory": "none" },
      })
    );

    const result = await etkeProviderMethods.getServerNotifications(url, "en");

    expect(result.status).toBe("ok");
    expect(result.success).toBe(true);
    expect(result.notifications).toHaveLength(1);
  });

  it("maps X-Notifications-Advisory: possibly_missed to status advisory", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "X-Notifications-Advisory": "possibly_missed" },
      })
    );

    const result = await etkeProviderMethods.getServerNotifications(url, "en");

    expect(result.status).toBe("advisory");
    expect(result.success).toBe(true);
  });

  it("defaults to status ok when advisory header is absent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const result = await etkeProviderMethods.getServerNotifications(url, "en");

    expect(result.status).toBe("ok");
    expect(result.success).toBe(true);
  });

  it("returns ok + empty list on 204 No Content", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await etkeProviderMethods.getServerNotifications(url, "en");

    expect(result.status).toBe("ok");
    expect(result.success).toBe(true);
    expect(result.notifications).toEqual([]);
  });

  it("returns unavailable on 503", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));

    const result = await etkeProviderMethods.getServerNotifications(url, "en");

    expect(result.status).toBe("unavailable");
    expect(result.success).toBe(false);
    expect(result.notifications).toEqual([]);
  });

  it("returns unavailable on non-ok HTTP (e.g. 500)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500, statusText: "Server Error" }));

    const result = await etkeProviderMethods.getServerNotifications(url, "en");

    expect(result.status).toBe("unavailable");
    expect(result.success).toBe(false);
  });

  it("returns unavailable when fetch rejects (network error)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    const result = await etkeProviderMethods.getServerNotifications(url, "en");

    expect(result.status).toBe("unavailable");
    expect(result.success).toBe(false);
  });
});

describe("upsertInvoiceEmails", () => {
  const url = "https://admin.example/etke";

  it("normalizes a network rejection to the localized error_save key", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(etkeProviderMethods.upsertInvoiceEmails(url, "en", true, ["a@example.com"])).rejects.toThrow(
      "etkecc.billing.invoice_emails.error_save"
    );
  });

  it("maps a 429 to the rate-limit key", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 429 }));

    await expect(etkeProviderMethods.upsertInvoiceEmails(url, "en", true, ["a@example.com"])).rejects.toThrow(
      "etkecc.billing.invoice_emails.error_rate_limited"
    );
  });

  it("surfaces a server-localized error body verbatim", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Adresse invalide" }), { status: 400 })
    );

    await expect(etkeProviderMethods.upsertInvoiceEmails(url, "en", true, ["bad"])).rejects.toThrow("Adresse invalide");
  });

  it("falls back to error_save when the error body is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(etkeProviderMethods.upsertInvoiceEmails(url, "en", true, ["a@example.com"])).rejects.toThrow(
      "etkecc.billing.invoice_emails.error_save"
    );
  });

  it("returns the parsed config on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ enabled: true, emails: ["a@example.com"], canceled: 2 }), { status: 200 })
    );

    const result = await etkeProviderMethods.upsertInvoiceEmails(url, "en", true, ["a@example.com"]);

    expect(result).toEqual({ enabled: true, emails: ["a@example.com"], canceled: 2 });
  });
});

describe("company endpoints", () => {
  const url = "https://admin.example/etke";
  const company: CompanyDetails = {
    fiscal_id: "DE123456789",
    name: "Example GmbH",
    country: "DE",
    address: "Main St 1",
    postal_code: "10115",
    city: "Berlin",
  };

  describe("getCompany", () => {
    it("returns the parsed company on 200", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(company), { status: 200 }));

      await expect(etkeProviderMethods.getCompany(url, "en")).resolves.toEqual(company);
    });

    it("returns null on 204 No Content", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await expect(etkeProviderMethods.getCompany(url, "en")).resolves.toBeNull();
    });

    it("surfaces the localized server error verbatim", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "This Matrix server is not registered as an etke.cc customer." }), {
          status: 402,
        })
      );

      await expect(etkeProviderMethods.getCompany(url, "en")).rejects.toThrow(
        "This Matrix server is not registered as an etke.cc customer."
      );
    });

    it("falls back to error_load when the error body is empty", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500, statusText: "Server Error" }));

      await expect(etkeProviderMethods.getCompany(url, "en")).rejects.toThrow(
        "etkecc.billing.company_details.error_load"
      );
    });

    it("normalizes a network rejection to the localized error_load key", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

      await expect(etkeProviderMethods.getCompany(url, "en")).rejects.toThrow(
        "etkecc.billing.company_details.error_load"
      );
    });
  });

  describe("upsertCompany", () => {
    it("returns the stored company on 200", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(company), { status: 200 }));

      await expect(etkeProviderMethods.upsertCompany(url, "en", company)).resolves.toEqual(company);
    });

    it("surfaces the VIES mismatch text verbatim", async () => {
      const message = "The details you provided do not match the VAT registry (VIES): Company name: expected Acme GmbH";
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: message }), { status: 400 }));

      await expect(etkeProviderMethods.upsertCompany(url, "en", company)).rejects.toThrow(message);
    });

    it("falls back to error when the error body is not JSON", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response("gateway timeout", { status: 503 }));

      await expect(etkeProviderMethods.upsertCompany(url, "en", company)).rejects.toThrow(
        "etkecc.billing.company_details.error"
      );
    });

    it("falls back to error when the error body is blank", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "   " }), { status: 400 }));

      await expect(etkeProviderMethods.upsertCompany(url, "en", company)).rejects.toThrow(
        "etkecc.billing.company_details.error"
      );
    });

    it("echoes the sent company on 204 No Content", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

      await expect(etkeProviderMethods.upsertCompany(url, "en", company)).resolves.toEqual(company);
    });

    it("normalizes a network rejection to the localized error key", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Missing access token"));

      await expect(etkeProviderMethods.upsertCompany(url, "en", company)).rejects.toThrow(
        "etkecc.billing.company_details.error"
      );
    });
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { AdminContext } from "react-admin";
import type { DataProvider } from "react-admin";
import type * as ReactAdmin from "react-admin";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import englishMessages from "../../i18n/en";
import { loadCountryLocale } from "../../utils/countries";
import type { CompanyDetails, SynapseDataProvider } from "../../providers/types";
import { CompanyDetailsDialog } from "./CompanyDetailsDialog";

// hoisted so the mock factory, which runs while modules are imported, already sees the spy.
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("react-admin", async importOriginal => {
  const actual = await importOriginal<typeof ReactAdmin>();
  return { ...actual, useNotify: () => notify };
});

const t = englishMessages.etkecc.billing.company_details;
const i18nProvider = polyglotI18nProvider(() => englishMessages, "en", [{ locale: "en", name: "English" }]);

type CompanyProvider = Pick<SynapseDataProvider, "getCompany" | "upsertCompany">;

const stored: CompanyDetails = {
  fiscal_id: "DE123456789",
  name: "Müller & Co GmbH",
  country: "DE",
  address: "Main St 1",
  postal_code: "10115",
  city: "Berlin",
};

const makeProvider = (company: CompanyDetails | null, overrides: Partial<CompanyProvider> = {}): CompanyProvider => ({
  getCompany: vi.fn().mockResolvedValue(company),
  upsertCompany: vi.fn().mockResolvedValue(company),
  ...overrides,
});

const renderDialog = (dataProvider: CompanyProvider, onClose = vi.fn()) => {
  // the mock implements only the two methods the dialog calls; AdminContext wants the full provider interface.
  const provider = dataProvider as unknown as DataProvider;
  return render(
    <AdminContext i18nProvider={i18nProvider} dataProvider={provider}>
      <CompanyDetailsDialog etkeccAdmin="https://admin.example/admin/hash" open onClose={onClose} />
    </AdminContext>
  );
};

const saveButton = () => screen.getByRole("button", { name: t.save });

const fillAll = async (user: UserEvent) => {
  await user.type(await screen.findByLabelText(t.fields.vat_id, { exact: false }), "DE123456789");
  await user.type(screen.getByLabelText(t.fields.company_name, { exact: false }), "Müller & Co GmbH");
  await user.type(screen.getByLabelText(t.fields.country, { exact: false }), "Germany");
  await user.click(await screen.findByRole("option", { name: "Germany" }));
  await user.type(screen.getByLabelText(t.fields.address, { exact: false }), "Main St 1");
  await user.type(screen.getByLabelText(t.fields.postal_code, { exact: false }), "10115");
  // trailing space exercises the trim before the POST body is built.
  await user.type(screen.getByLabelText(t.fields.city, { exact: false }), "Berlin ");
};

beforeAll(async () => {
  // the app registers country names during the i18n bootstrap; mirror that here.
  await loadCountryLocale("en");
});

beforeEach(() => {
  notify.mockClear();
});

describe("CompanyDetailsDialog", () => {
  it("prefills the stored company and keeps Save disabled until something changes", async () => {
    const dp = makeProvider(stored);
    renderDialog(dp);
    const user = userEvent.setup();

    expect(await screen.findByDisplayValue(stored.fiscal_id)).toBeInTheDocument();
    expect(screen.getByLabelText(t.fields.country, { exact: false })).toHaveValue("Germany");
    // an unchanged form would re-run the VIES check on identical data.
    expect(saveButton()).toBeDisabled();

    await user.type(screen.getByLabelText(t.fields.city, { exact: false }), "!");
    expect(saveButton()).toBeEnabled();
  });

  it("keeps Save disabled until every field is filled", async () => {
    const dp = makeProvider(null);
    renderDialog(dp);
    const user = userEvent.setup();

    const vatInput = await screen.findByLabelText(t.fields.vat_id, { exact: false });
    expect(saveButton()).toBeDisabled();
    await user.type(vatInput, "DE123456789");
    // one field is not enough, even though it counts as a change.
    expect(saveButton()).toBeDisabled();
  });

  it("starts blank on 204 and posts the trimmed company, then closes with a toast", async () => {
    const dp = makeProvider(null);
    const onClose = vi.fn();
    renderDialog(dp, onClose);
    const user = userEvent.setup();

    await fillAll(user);
    await user.click(saveButton());

    await waitFor(() =>
      expect(dp.upsertCompany).toHaveBeenCalledWith("https://admin.example/admin/hash", "en", {
        fiscal_id: "DE123456789",
        name: "Müller & Co GmbH",
        country: "DE",
        address: "Main St 1",
        postal_code: "10115",
        city: "Berlin",
      })
    );
    expect(notify).toHaveBeenCalledWith(t.saved, { type: "success" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the server's localized error and stays open when the save is rejected", async () => {
    const message = "The details you provided do not match the VAT registry (VIES): Company name: expected Acme GmbH";
    const dp = makeProvider(stored, { upsertCompany: vi.fn().mockRejectedValue(new Error(message)) });
    const onClose = vi.fn();
    renderDialog(dp, onClose);
    const user = userEvent.setup();

    await user.type(await screen.findByDisplayValue(stored.fiscal_id), "9");
    await user.click(saveButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // back to an editable Save so the customer can fix the field and retry.
    expect(saveButton()).toBeEnabled();
  });

  it("shows the server error instead of the form when the load fails", async () => {
    const message = "This Matrix server is not registered as an etke.cc customer.";
    const dp = makeProvider(null, { getCompany: vi.fn().mockRejectedValue(new Error(message)) });
    renderDialog(dp);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.save })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.cancel })).toBeInTheDocument();
  });

  it("translates a fallback key when the error body carries no message", async () => {
    const dp = makeProvider(null, {
      getCompany: vi.fn().mockRejectedValue(new Error("etkecc.billing.company_details.error_load")),
    });
    renderDialog(dp);

    expect(await screen.findByText(t.error_load)).toBeInTheDocument();
  });

  it("blocks a second submit while the save is in flight", async () => {
    const { promise, resolve } = Promise.withResolvers<CompanyDetails>();
    const onClose = vi.fn();
    const dp = makeProvider(null, { upsertCompany: vi.fn().mockReturnValue(promise) });
    renderDialog(dp, onClose);
    const user = userEvent.setup();

    await fillAll(user);
    await user.click(saveButton());

    const saving = screen.getByRole("button", { name: t.saving });
    expect(saving).toBeDisabled();
    // fireEvent still reaches the handler on a disabled button, so this pins the in-flight guard too.
    fireEvent.click(saving);
    expect(dp.upsertCompany).toHaveBeenCalledTimes(1);

    resolve(stored);
    await waitFor(() => expect(notify).toHaveBeenCalledWith(t.saved, { type: "success" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("refetches on every reopen so a stale company never leaks into the form", async () => {
    // the second open finds no stored company, so a blank form proves the reset ran.
    const getCompany = vi.fn().mockResolvedValueOnce(stored).mockResolvedValue(null);
    const dp = makeProvider(stored, { getCompany });
    // the mock implements only the two methods the dialog calls; AdminContext wants the full provider interface.
    const provider = dp as unknown as DataProvider;
    const { rerender } = render(
      <AdminContext i18nProvider={i18nProvider} dataProvider={provider}>
        <CompanyDetailsDialog etkeccAdmin="https://admin.example/admin/hash" open onClose={vi.fn()} />
      </AdminContext>
    );
    expect(await screen.findByDisplayValue(stored.fiscal_id)).toBeInTheDocument();

    rerender(
      <AdminContext i18nProvider={i18nProvider} dataProvider={provider}>
        <CompanyDetailsDialog etkeccAdmin="https://admin.example/admin/hash" open={false} onClose={vi.fn()} />
      </AdminContext>
    );
    rerender(
      <AdminContext i18nProvider={i18nProvider} dataProvider={provider}>
        <CompanyDetailsDialog etkeccAdmin="https://admin.example/admin/hash" open onClose={vi.fn()} />
      </AdminContext>
    );

    await waitFor(() => expect(dp.getCompany).toHaveBeenCalledTimes(2));
    // the second load answered 204: the prefilled values are gone.
    await waitFor(() => expect(screen.getByLabelText(t.fields.vat_id, { exact: false })).toHaveValue(""));
  });
});

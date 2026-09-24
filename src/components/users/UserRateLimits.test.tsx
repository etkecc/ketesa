import { act, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { AdminContext, DataProvider, HttpError, RecordContextProvider } from "react-admin";
import type { Mock } from "vitest";

import UserRateLimits from "./UserRateLimits";
import englishMessages from "../../i18n/en";

const i18nProvider = polyglotI18nProvider(() => englishMessages, "en", [{ locale: "en", name: "English" }]);

const record = { id: "@alice:example.org" };

const renderRateLimits = async (getRateLimits: Mock) => {
  const dataProvider = { getRateLimits } as unknown as DataProvider;

  const Wrapper = () => {
    const form = useForm();
    return (
      <AdminContext i18nProvider={i18nProvider} dataProvider={dataProvider}>
        <FormProvider {...form}>
          <RecordContextProvider value={record}>
            <UserRateLimits />
          </RecordContextProvider>
        </FormProvider>
      </AdminContext>
    );
  };

  await act(async () => {
    render(<Wrapper />);
  });
};

// One macrotask turn lets node report rejections nothing has handled, so assertions run after they would fire.
const flushRejections = async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 0);
  await act(async () => {
    await promise;
  });
};

describe("UserRateLimits", () => {
  it("degrades gracefully when the homeserver 404s the endpoint", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);

    try {
      await renderRateLimits(vi.fn().mockRejectedValue(new HttpError("M_UNRECOGNIZED: Not Found", 404)));
      await flushRejections();

      // The catch swallows the 404; no unhandled promise rejection escapes.
      expect(unhandled).toHaveLength(0);
      // The form keeps rendering its default empty fields.
      expect(screen.getByLabelText("Messages per second")).toBeInTheDocument();
      expect(screen.getByLabelText("Burst count")).toBeInTheDocument();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("renders fetched rate limits on success", async () => {
    const getRateLimits = vi.fn().mockResolvedValue({ messages_per_second: 5, burst_count: 10 });
    await renderRateLimits(getRateLimits);

    expect(getRateLimits).toHaveBeenCalledWith("@alice:example.org");
    expect((screen.getByLabelText("Messages per second") as HTMLInputElement).value).toBe("5");
    expect((screen.getByLabelText("Burst count") as HTMLInputElement).value).toBe("10");
  });
});

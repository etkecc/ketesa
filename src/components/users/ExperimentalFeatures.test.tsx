import { act, render, screen } from "@testing-library/react";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { AdminContext, DataProvider, HttpError, RecordContextProvider } from "react-admin";
import type { Mock } from "vitest";

import ExperimentalFeaturesList from "./ExperimentalFeatures";
import englishMessages from "../../i18n/en";

const i18nProvider = polyglotI18nProvider(() => englishMessages, "en", [{ locale: "en", name: "English" }]);

const record = { id: "@alice:example.org" };

const renderFeatures = async (getFeatures: Mock) => {
  const dataProvider = { getFeatures } as unknown as DataProvider;

  const Wrapper = () => (
    <AdminContext i18nProvider={i18nProvider} dataProvider={dataProvider}>
      <RecordContextProvider value={record}>
        <ExperimentalFeaturesList />
      </RecordContextProvider>
    </AdminContext>
  );

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

describe("ExperimentalFeaturesList", () => {
  it("degrades gracefully when the homeserver 404s the endpoint", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);

    try {
      await renderFeatures(vi.fn().mockRejectedValue(new HttpError("M_UNRECOGNIZED: Not Found", 404)));
      await flushRejections();

      // The catch swallows the 404; no unhandled promise rejection escapes.
      expect(unhandled).toHaveLength(0);
      // The list renders empty instead of crashing.
      expect(screen.queryByText("msc3881")).not.toBeInTheDocument();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("renders fetched features on success", async () => {
    const getFeatures = vi.fn().mockResolvedValue({ msc3881: true, msc3575: false });
    await renderFeatures(getFeatures);

    expect(getFeatures).toHaveBeenCalledWith("@alice:example.org");
    expect(screen.getByText("msc3881")).toBeInTheDocument();
    expect(screen.getByText("msc3575")).toBeInTheDocument();
  });
});

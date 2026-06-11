import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import polyglotI18nProvider from "ra-i18n-polyglot";
import { AdminContext } from "react-admin";

import { ViewMediaButton } from "./ViewMedia";
import englishMessages from "../../i18n/en";

const i18nProvider = polyglotI18nProvider(() => englishMessages, "en", [{ locale: "en", name: "English" }]);

// Flush the real microtask/macrotask queue so the async handleFile chain
// (fetch -> blob -> createObjectURL) settles. setImmediate stays real because only
// setTimeout is faked below, and React's scheduler relies on it.
const flushAsync = () => new Promise(resolve => setImmediate(resolve));

interface ClickedAnchor {
  target: string;
  download: string;
}

const renderButton = (props: { mimetype?: string; preview?: boolean }) =>
  render(
    <AdminContext i18nProvider={i18nProvider}>
      <ViewMediaButton
        mxcURL="mxc://example.org/abc123"
        label="abc123"
        uploadName="image.png"
        mimetype={props.mimetype}
        preview={props.preview}
      />
    </AdminContext>
  );

describe("ViewMediaButton", () => {
  let clickedAnchors: ClickedAnchor[];

  const mockMediaResponse = (type: string) => {
    // Hand back a Blob with the type set directly: jsdom's Response does not round-trip the
    // Content-Type onto Response.blob().type, but a real browser fetch does. The production
    // new-tab gate reads blob.type.
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(["media bytes"], { type })),
        json: () => Promise.resolve({}),
      } as unknown as Response)
    ) as unknown as typeof fetch;
  };

  const lastClick = () => clickedAnchors[clickedAnchors.length - 1];

  const clickButton = async (index: number) => {
    const button = screen.getAllByRole("button")[index];
    await act(async () => {
      fireEvent.click(button);
      await flushAsync();
    });
  };

  beforeEach(() => {
    // Fake only setTimeout so the revoke timer is controllable without stalling
    // React's setImmediate-based work loop.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    clickedAnchors = [];
    mockMediaResponse("image/png");
    global.URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
    global.URL.revokeObjectURL = vi.fn();
    // Capture each programmatic anchor click instead of letting jsdom navigate, so tests can
    // tell the new-tab path (target=_blank) from the download path (download attribute).
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clickedAnchors.push({ target: this.target, download: this.download });
    });

    localStorage.setItem("base_url", "https://example.org");
    localStorage.setItem("access_token", "secret-token");
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens an image in a new tab and keeps the blob URL alive past the tab's load", async () => {
    renderButton({ mimetype: "image/png", preview: true });

    await clickButton(0); // [0] = open-in-new-tab, [1] = download

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(lastClick()).toEqual({ target: "_blank", download: "" });

    // Regression guard: the old code revoked after 10ms, killing the new tab mid-navigation
    // and producing ERR_FILE_NOT_FOUND. The blob must still be alive here.
    vi.advanceTimersByTime(10);
    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-object-url");
  });

  it("revokes the download blob URL on the same delay, not after 10ms", async () => {
    renderButton({ mimetype: "image/png", preview: true });

    await clickButton(1); // download button

    expect(lastClick().download).toBe("image.png");

    vi.advanceTimersByTime(10);
    expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-object-url");
  });

  it("does not offer the new-tab open button for SVG media", () => {
    renderButton({ mimetype: "image/svg+xml", preview: true });

    // Only the download button renders; an SVG must never get the in-origin new-tab open.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("falls back to download when the served blob type is unsafe despite an image media_type", async () => {
    // The record claims image/png (so the open button shows) but the server serves text/html
    // (the federated-spoofing case). The blob must download, never render in our origin.
    mockMediaResponse("text/html");
    renderButton({ mimetype: "image/png", preview: true });

    await clickButton(0);

    expect(lastClick()).toEqual({ target: "", download: "image.png" });

    vi.advanceTimersByTime(60_000);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-object-url");
  });

  it("notifies and re-enables the button instead of opening anything when the request fails", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        blob: () => Promise.resolve(new Blob([])),
        json: () => Promise.resolve({ errcode: "M_FORBIDDEN", error: "forbidden" }),
      } as unknown as Response)
    ) as unknown as typeof fetch;
    renderButton({ mimetype: "image/png", preview: true });

    const openButton = screen.getAllByRole("button")[0];
    await act(async () => {
      fireEvent.click(openButton);
      await flushAsync();
    });

    // No blob created, nothing opened or downloaded, and the button is usable again.
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickedAnchors).toHaveLength(0);
    expect(openButton).not.toBeDisabled();
  });
});

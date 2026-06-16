/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, it, expect, vi } from "vitest";

// MUI's useMediaQuery walks window.matchMedia. jsdom doesn't ship one; polyfill before render.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

vi.mock("react-admin", () => ({
  useTranslate: () => (key: string) => key,
}));

import TypeToConfirmDialog from "./TypeToConfirmDialog";

const MXID = "@alice:hs.example.com";

const renderDialog = (overrides: Partial<React.ComponentProps<typeof TypeToConfirmDialog>> = {}) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <TypeToConfirmDialog
      isOpen
      title="Erase user"
      content="This is permanent."
      expectedValue={MXID}
      inputLabel="Type the MXID"
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />
  );
  return { onConfirm, onClose, ...utils };
};

const confirmButton = () => screen.getByRole("button", { name: "ra.action.confirm" });

describe("TypeToConfirmDialog", () => {
  it("Confirm is disabled until the typed value exactly matches expectedValue", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "@alice:wrong");
    expect(confirmButton()).toBeDisabled();

    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), MXID);
    expect(confirmButton()).toBeEnabled();

    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("whitespace-only input leaves Confirm disabled (never fires)", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole("textbox"), "   ");
    expect(confirmButton()).toBeDisabled();
  });

  it("trims surrounding whitespace on both sides before matching", async () => {
    const user = userEvent.setup();
    renderDialog({ expectedValue: `  ${MXID}  ` });
    await user.type(screen.getByRole("textbox"), `  ${MXID}  `);
    expect(confirmButton()).toBeEnabled();
  });

  it("Cancel calls onClose", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    await user.click(screen.getByRole("button", { name: "ra.action.cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no detectable accessibility violations", async () => {
    const { baseElement } = renderDialog();
    // MUI renders the dialog into a portal on document.body; baseElement covers it.
    const results = await axe(baseElement);
    expect(results.violations).toHaveLength(0);
  });
});

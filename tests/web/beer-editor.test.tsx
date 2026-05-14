import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { BeerEditor, type BeerEditorRow } from "../../apps/web/src/components/BeerEditor";
import { I18nProvider } from "../../apps/web/src/i18n/i18nContext";

vi.mock("../../apps/web/src/api/client", () => ({
  apiClient: { identifyBeerName: vi.fn() },
}));

vi.mock("../../apps/web/src/utils/beer-name-image", () => ({
  prepareImageForBeerNameRecognition: vi.fn(async (file: File) => file),
}));

vi.mock("../../apps/web/src/utils/player-identity", () => ({
  getOrCreateClientId: () => "test-client",
}));

let urlCounter = 0;
const createdUrls: string[] = [];
const revokedUrls: string[] = [];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  urlCounter = 0;
  createdUrls.length = 0;
  revokedUrls.length = 0;

  (URL as unknown as { createObjectURL: (blob: Blob) => string }).createObjectURL = vi.fn(() => {
    urlCounter += 1;
    const url = `blob:mock-${urlCounter}`;
    createdUrls.push(url);
    return url;
  });
  (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL = vi.fn((url: string) => {
    revokedUrls.push(url);
  });

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function makeFile(name = "beer.png"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

function renderEditor(beers: BeerEditorRow[], onBeersChange: (next: BeerEditorRow[]) => void = () => {}) {
  act(() => {
    root.render(
      <I18nProvider>
        <BeerEditor
          title="Test"
          gameName="g"
          onGameNameChange={() => {}}
          beers={beers}
          onBeersChange={onBeersChange}
          onSubmit={() => {}}
          submitting={false}
          submitLabel="Save"
          addLabel="Add"
        />
      </I18nProvider>,
    );
  });
}

function getPreviewImg(): HTMLImageElement | null {
  const preview = container.querySelector('[data-testid="beer-image-preview"]');
  return preview?.querySelector("img") ?? null;
}

function getPreviewText(): string {
  const preview = container.querySelector('[data-testid="beer-image-preview"]');
  return preview?.textContent?.trim() ?? "";
}

describe("BeerEditor thumbnail preview", () => {
  it("shows the localized no-image placeholder when no image is set", () => {
    renderEditor([{ clientKey: "a", name: "", imageUrl: "", file: null }]);
    expect(getPreviewImg()).toBeNull();
    expect(getPreviewText()).toBe("No image");
  });

  it("shows a preview from the persisted imageUrl when no local file is selected", () => {
    renderEditor([{ clientKey: "a", name: "Saison", imageUrl: "https://example.test/beer.jpg", file: null }]);
    const img = getPreviewImg();
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.test/beer.jpg");
    expect(img?.getAttribute("alt")).toContain("Saison");
  });

  it("shows a preview from a selected local file via createObjectURL", () => {
    const file = makeFile();
    renderEditor([{ clientKey: "a", name: "Stout", imageUrl: "", file }]);
    const img = getPreviewImg();
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toMatch(/^blob:mock-\d+$/);
    expect(createdUrls).toHaveLength(1);
    expect(img?.getAttribute("alt")).toContain("Stout");
  });

  it("prefers the local file preview over the persisted imageUrl", () => {
    const file = makeFile();
    renderEditor([{ clientKey: "a", name: "Lager", imageUrl: "https://example.test/old.jpg", file }]);
    const img = getPreviewImg();
    expect(img?.getAttribute("src")).toMatch(/^blob:mock-\d+$/);
  });

  it("revokes the previous object URL when the file is replaced", () => {
    const first = makeFile("a.png");
    let beers: BeerEditorRow[] = [{ clientKey: "row-1", name: "X", imageUrl: "", file: first }];
    const onBeersChange = (next: BeerEditorRow[]) => {
      beers = next;
      renderEditor(beers, onBeersChange);
    };
    renderEditor(beers, onBeersChange);
    expect(createdUrls).toHaveLength(1);
    const firstUrl = createdUrls[0];

    const second = makeFile("b.png");
    act(() => {
      onBeersChange([{ ...beers[0]!, file: second }]);
    });

    expect(createdUrls).toHaveLength(2);
    expect(revokedUrls).toContain(firstUrl);
    const img = getPreviewImg();
    expect(img?.getAttribute("src")).toBe(createdUrls[1]);
  });

  it("revokes all created object URLs on unmount", () => {
    const file = makeFile();
    renderEditor([{ clientKey: "a", name: "X", imageUrl: "", file }]);
    expect(createdUrls).toHaveLength(1);

    act(() => {
      root.unmount();
    });

    expect(revokedUrls).toEqual(expect.arrayContaining(createdUrls));
    // Re-render an empty editor to keep afterEach unmount safe.
    root = createRoot(container);
    act(() => {
      root.render(<div />);
    });
  });
});

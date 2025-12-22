import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useBundles, useBundleMetadata, useBundleCode } from "./bundles";

// Get typed fetch mock
const mockFetch = fetch as MockedFunction<typeof fetch>;

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useBundles", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches bundles list successfully", async () => {
    const mockBundles = [{ name: "counter" }, { name: "carousel" }];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBundles),
    } as Response);

    const { result } = renderHook(() => useBundles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockBundles);
    expect(mockFetch).toHaveBeenCalledWith("/api/bundles");
  });

  it("handles fetch error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useBundles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain("Failed to fetch bundles");
  });

  it("returns loading state initially", () => {
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useBundles(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useBundleMetadata", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches metadata for a component", async () => {
    const mockMetadata = {
      title: "Counter",
      description: "A simple counter component",
      props: {
        type: "object" as const,
        properties: {
          initialValue: { type: "number" as const },
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMetadata),
    } as Response);

    const { result } = renderHook(() => useBundleMetadata("counter"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMetadata);
    expect(mockFetch).toHaveBeenCalledWith("/api/bundles/counter/metadata");
  });

  it("does not fetch when name is null", () => {
    const { result } = renderHook(() => useBundleMetadata(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles 404 error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { result } = renderHook(() => useBundleMetadata("nonexistent"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain("Failed to fetch metadata");
  });
});

describe("useBundleCode", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches JavaScript code for a component", async () => {
    const mockCode =
      'import { jsx } from "react/jsx-runtime"; export default function() {}';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockCode),
    } as Response);

    const { result } = renderHook(() => useBundleCode("counter"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(mockCode);
    expect(mockFetch).toHaveBeenCalledWith("/api/bundles/counter.js");
  });

  it("does not fetch when name is null", () => {
    const { result } = renderHook(() => useBundleCode(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles bundle not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { result } = renderHook(() => useBundleCode("nonexistent"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain("Failed to fetch bundle");
  });
});

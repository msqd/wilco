import React, { useState, useMemo, Suspense, useRef, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useBundles, useBundleMetadata } from "./api/bundles.ts";
import { ServerComponent } from "./loader/ServerComponent.tsx";
import { PropsEditor, getDefaultValues } from "./components/PropsEditor.tsx";
import { StackTrace } from "./components/StackTrace.tsx";

function ComponentListItem({
  name,
  isSelected,
  onSelect,
}: {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: metadata } = useBundleMetadata(name);

  return (
    <li>
      <button onClick={onSelect} className={isSelected ? "selected" : ""}>
        <strong>{metadata?.title || name}</strong>
        {metadata?.description && <span>{metadata.description}</span>}
      </button>
    </li>
  );
}

function ErrorFallback({
  error,
  onRetry,
  componentStack,
}: {
  error: Error;
  onRetry: () => void;
  componentStack?: string;
}) {
  return (
    <div className="error-fallback">
      <div className="error-header">
        <span className="error-icon">⚠</span>
        <h4>Component Error</h4>
      </div>

      <div className="error-message">
        <strong>{error.name}:</strong> {error.message}
      </div>

      <details className="error-details" open>
        <summary>Stack Trace</summary>
        <StackTrace error={error} componentStack={componentStack} />
      </details>

      <button onClick={onRetry}>Retry</button>
    </div>
  );
}

type PreviewBackground = "white" | "light" | "dark" | "black" | "transparent";

const bgOptions: { value: PreviewBackground; title: string }[] = [
  { value: "white", title: "White" },
  { value: "light", title: "Light" },
  { value: "dark", title: "Dark" },
  { value: "black", title: "Black" },
  { value: "transparent", title: "Transparent" },
];

function BackgroundSelector({
  value,
  onChange,
}: {
  value: PreviewBackground;
  onChange: (bg: PreviewBackground) => void;
}) {
  return (
    <div className="bg-selector">
      <span className="bg-selector-label">BG</span>
      <div className="bg-selector-options">
        {bgOptions.map((opt) => (
          <button
            key={opt.value}
            className={`bg-selector-btn bg-selector-btn--${opt.value} ${value === opt.value ? "active" : ""}`}
            onClick={() => onChange(opt.value)}
            title={opt.title}
          />
        ))}
      </div>
    </div>
  );
}

function ComponentWrapper({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const updateBounds = () => {
      if (wrapperRef.current) {
        setBounds(wrapperRef.current.getBoundingClientRect());
      }
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(wrapperRef.current);

    return () => observer.disconnect();
  }, []);

  // Get canvas-relative positions for rulers
  const canvas = wrapperRef.current?.parentElement;
  const canvasBounds = canvas?.getBoundingClientRect();

  const top = bounds && canvasBounds ? bounds.top - canvasBounds.top : 0;
  const bottom = bounds && canvasBounds ? bounds.bottom - canvasBounds.top : 0;
  const left = bounds && canvasBounds ? bounds.left - canvasBounds.left : 0;
  const right = bounds && canvasBounds ? bounds.right - canvasBounds.left : 0;

  return (
    <>
      {bounds && (
        <>
          <div className="preview-ruler preview-ruler--top" style={{ top: top - 1 }} />
          <div className="preview-ruler preview-ruler--bottom" style={{ top: bottom }} />
          <div className="preview-ruler preview-ruler--left" style={{ left: left - 1 }} />
          <div className="preview-ruler preview-ruler--right" style={{ left: right }} />
        </>
      )}
      <div className="preview-component-wrapper" ref={wrapperRef}>
        {children}
      </div>
    </>
  );
}

function ComponentPreview({ name }: { name: string }) {
  const { data: metadata, isLoading: metadataLoading } = useBundleMetadata(name);
  const [propsOverrides, setPropsOverrides] = useState<Record<string, unknown>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [componentStack, setComponentStack] = useState<string | undefined>();
  const [background, setBackground] = useState<PreviewBackground>("transparent");

  // Compute the full props by merging defaults with overrides
  const props = useMemo(() => {
    const defaults = getDefaultValues(metadata?.props);
    return { ...defaults, ...propsOverrides };
  }, [metadata?.props, propsOverrides]);

  const handleRetry = () => {
    setPropsOverrides({});
    setComponentStack(undefined);
    setRetryCount((c) => c + 1);
  };

  const handleError = (_error: Error, info: { componentStack?: string | null }) => {
    setComponentStack(info.componentStack ?? undefined);
  };

  if (metadataLoading) {
    return (
      <div className="preview-layout">
        <div className="preview-panel">
          <div className="preview-header">
            <h2>Loading...</h2>
          </div>
          <div className="preview-canvas bg-transparent">
            <div className="loading-state">Loading component...</div>
          </div>
        </div>
        <div className="props-panel">
          <div className="props-header">
            <h3>Controls</h3>
          </div>
          <div className="props-content">
            <div className="loading-state">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-layout">
      {/* Preview Panel */}
      <div className="preview-panel">
        <div className="preview-header">
          <h2>
            <span className="component-name">{metadata?.title || name}</span>
          </h2>
          <BackgroundSelector value={background} onChange={setBackground} />
        </div>
        <div className={`preview-canvas bg-${background}`}>
          <ComponentWrapper>
            <ErrorBoundary
              fallbackRender={({ error }) => (
                <ErrorFallback
                  error={error}
                  onRetry={handleRetry}
                  componentStack={componentStack}
                />
              )}
              onError={handleError}
              resetKeys={[retryCount]}
            >
              <Suspense fallback={<div className="loading-state">Loading component...</div>}>
                <ServerComponent name={name} props={props} />
              </Suspense>
            </ErrorBoundary>
          </ComponentWrapper>
        </div>
      </div>

      {/* Props Panel */}
      <div className="props-panel">
        <div className="props-header">
          <h3>Controls</h3>
        </div>
        <div className="props-content">
          <PropsEditor
            schema={metadata?.props}
            values={props}
            onChange={setPropsOverrides}
          />
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  bundles,
  selectedBundle,
  onSelect,
}: {
  bundles: { name: string }[];
  selectedBundle: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>wilco</h1>
        <span>Server Components</span>
      </div>
      <div className="sidebar-content">
        <ul className="component-list">
          {bundles.map((bundle) => (
            <ComponentListItem
              key={bundle.name}
              name={bundle.name}
              isSelected={selectedBundle === bundle.name}
              onSelect={() => onSelect(bundle.name)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function App() {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const { data: bundles, isLoading, error } = useBundles();

  if (isLoading) {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>wilco</h1>
            <span>Server Components</span>
          </div>
          <div className="sidebar-content">
            <div className="loading-state">Loading...</div>
          </div>
        </aside>
        <main className="main-content">
          <div className="empty-state">Loading bundles...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>wilco</h1>
            <span>Server Components</span>
          </div>
        </aside>
        <main className="main-content">
          <div className="empty-state">
            <div>
              <h2>Error</h2>
              <p>{error.message}</p>
              <p>
                Make sure the backend is running: <code>uv run python -m wilco</code>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        bundles={bundles || []}
        selectedBundle={selectedBundle}
        onSelect={setSelectedBundle}
      />
      <main className="main-content">
        {selectedBundle ? (
          <ComponentPreview key={selectedBundle} name={selectedBundle} />
        ) : (
          <div className="empty-state">
            Select a component from the sidebar to preview
          </div>
        )}
      </main>
    </div>
  );
}

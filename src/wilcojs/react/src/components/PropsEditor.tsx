import type { PropsSchema, JsonSchemaProperty } from "../api/bundles.ts";

interface PropsEditorProps {
  schema: PropsSchema | undefined;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

function getDefaultValue(prop: JsonSchemaProperty): unknown {
  if (prop.default !== undefined) return prop.default;

  switch (prop.type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

export function getDefaultValues(
  schema: PropsSchema | undefined
): Record<string, unknown> {
  if (!schema?.properties) return {};

  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    defaults[key] = getDefaultValue(prop);
  }
  return defaults;
}

/**
 * Get the value for a property, falling back to schema default if undefined.
 */
function getValue(
  values: Record<string, unknown>,
  key: string,
  prop: JsonSchemaProperty
): unknown {
  const value = values[key];
  if (value !== undefined) return value;
  return getDefaultValue(prop);
}

function PropertyField({
  name,
  prop,
  value,
  onChange,
}: {
  name: string;
  prop: JsonSchemaProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = prop.title || name;

  if (prop.type === "boolean") {
    return (
      <label className="prop-field prop-field-checkbox">
        <input
          type="checkbox"
          checked={Boolean(value ?? false)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
        {prop.description && <small>{prop.description}</small>}
      </label>
    );
  }

  if (prop.type === "number") {
    return (
      <label className="prop-field">
        <span>{label}</span>
        <input
          type="number"
          value={value !== undefined ? Number(value) : 0}
          min={prop.minimum}
          max={prop.maximum}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {prop.description && <small>{prop.description}</small>}
      </label>
    );
  }

  if (prop.type === "string") {
    return (
      <label className="prop-field">
        <span>{label}</span>
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
        {prop.description && <small>{prop.description}</small>}
      </label>
    );
  }

  if (prop.type === "array" && prop.items?.type === "string") {
    const items = Array.isArray(value) ? (value as string[]) : [];

    return (
      <div className="prop-field">
        <span>{label}</span>
        {prop.description && <small>{prop.description}</small>}
        <div className="array-items">
          {items.map((item, index) => (
            <div key={index} className="array-item">
              <input
                type="text"
                value={String(item ?? "")}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index] = e.target.value;
                  onChange(newItems);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const newItems = items.filter((_, i) => i !== index);
                  onChange(newItems);
                }}
                className="remove-btn"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...items, ""])}
            className="add-btn"
          >
            + Add item
          </button>
        </div>
      </div>
    );
  }

  // Fallback: JSON editor for complex types
  const jsonValue =
    value !== undefined ? JSON.stringify(value, null, 2) : "null";

  return (
    <label className="prop-field">
      <span>{label}</span>
      <textarea
        value={jsonValue}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            // Invalid JSON, ignore
          }
        }}
        rows={4}
      />
      {prop.description && <small>{prop.description}</small>}
    </label>
  );
}

export function PropsEditor({ schema, values, onChange }: PropsEditorProps) {
  if (!schema?.properties || Object.keys(schema.properties).length === 0) {
    return <p className="no-props">This component has no configurable props.</p>;
  }

  const handleChange = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="props-editor">
      {Object.entries(schema.properties).map(([key, prop]) => (
        <PropertyField
          key={key}
          name={key}
          prop={prop}
          value={getValue(values, key, prop)}
          onChange={(v) => handleChange(key, v)}
        />
      ))}
    </div>
  );
}

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropsEditor, getDefaultValues } from "./PropsEditor";
import type { PropsSchema } from "../api/bundles";

describe("getDefaultValues", () => {
  it("returns empty object for undefined schema", () => {
    expect(getDefaultValues(undefined)).toEqual({});
  });

  it("returns empty object for schema without properties", () => {
    const schema: PropsSchema = { type: "object" };
    expect(getDefaultValues(schema)).toEqual({});
  });

  it("returns default values based on property types", () => {
    const schema: PropsSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        count: { type: "number" },
        active: { type: "boolean" },
        items: { type: "array" },
        config: { type: "object" },
      },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults).toEqual({
      name: "",
      count: 0,
      active: false,
      items: [],
      config: {},
    });
  });

  it("uses explicit default values when provided", () => {
    const schema: PropsSchema = {
      type: "object",
      properties: {
        name: { type: "string", default: "Default Name" },
        count: { type: "number", default: 42 },
      },
    };

    const defaults = getDefaultValues(schema);

    expect(defaults).toEqual({
      name: "Default Name",
      count: 42,
    });
  });
});

describe("PropsEditor", () => {
  it("shows message when no properties", () => {
    render(
      <PropsEditor schema={undefined} values={{}} onChange={() => {}} />
    );

    expect(screen.getByText(/no configurable props/i)).toBeInTheDocument();
  });

  it("shows message for empty properties", () => {
    const schema: PropsSchema = { type: "object", properties: {} };

    render(<PropsEditor schema={schema} values={{}} onChange={() => {}} />);

    expect(screen.getByText(/no configurable props/i)).toBeInTheDocument();
  });

  describe("string fields", () => {
    it("renders text input for string type", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          name: { type: "string", title: "Name" },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ name: "Test" }} onChange={() => {}} />
      );

      expect(screen.getByLabelText("Name")).toHaveValue("Test");
    });

    it("calls onChange when text input changes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const schema: PropsSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ name: "" }} onChange={onChange} />
      );

      await user.type(screen.getByRole("textbox"), "Hello");

      expect(onChange).toHaveBeenCalled();
    });

    it("shows description when provided", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          name: { type: "string", description: "Enter your name" },
        },
      };

      render(
        <PropsEditor schema={schema} values={{}} onChange={() => {}} />
      );

      expect(screen.getByText("Enter your name")).toBeInTheDocument();
    });
  });

  describe("number fields", () => {
    it("renders number input for number type", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          count: { type: "number", title: "Count" },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ count: 42 }} onChange={() => {}} />
      );

      expect(screen.getByLabelText("Count")).toHaveValue(42);
    });

    it("applies min and max constraints", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          count: { type: "number", minimum: 0, maximum: 100 },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ count: 50 }} onChange={() => {}} />
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
    });

    it("calls onChange with number value", () => {
      const onChange = vi.fn();
      const schema: PropsSchema = {
        type: "object",
        properties: {
          count: { type: "number" },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ count: 0 }} onChange={onChange} />
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "123" } });

      expect(onChange).toHaveBeenCalledWith({ count: 123 });
    });
  });

  describe("boolean fields", () => {
    it("renders checkbox for boolean type", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          active: { type: "boolean", title: "Active" },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ active: true }} onChange={() => {}} />
      );

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("toggles checkbox on click", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const schema: PropsSchema = {
        type: "object",
        properties: {
          active: { type: "boolean" },
        },
      };

      render(
        <PropsEditor
          schema={schema}
          values={{ active: false }}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole("checkbox"));

      expect(onChange).toHaveBeenCalledWith({ active: true });
    });
  });

  describe("array fields", () => {
    it("renders array items for string array", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" }, title: "Tags" },
        },
      };

      render(
        <PropsEditor
          schema={schema}
          values={{ tags: ["one", "two"] }}
          onChange={() => {}}
        />
      );

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveValue("one");
      expect(inputs[1]).toHaveValue("two");
    });

    it("adds item when clicking add button", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const schema: PropsSchema = {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" } },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ tags: [] }} onChange={onChange} />
      );

      await user.click(screen.getByText("+ Add item"));

      expect(onChange).toHaveBeenCalledWith({ tags: [""] });
    });

    it("removes item when clicking remove button", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const schema: PropsSchema = {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" } },
        },
      };

      render(
        <PropsEditor
          schema={schema}
          values={{ tags: ["one", "two"] }}
          onChange={onChange}
        />
      );

      const removeButtons = screen.getAllByText("×");
      await user.click(removeButtons[0]);

      expect(onChange).toHaveBeenCalledWith({ tags: ["two"] });
    });
  });

  describe("complex types", () => {
    it("renders JSON textarea for object type", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          config: { type: "object", title: "Config" },
        },
      };

      render(
        <PropsEditor
          schema={schema}
          values={{ config: { key: "value" } }}
          onChange={() => {}}
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea).toHaveValue('{\n  "key": "value"\n}');
    });

    it("parses valid JSON on change", () => {
      const onChange = vi.fn();
      const schema: PropsSchema = {
        type: "object",
        properties: {
          config: { type: "object" },
        },
      };

      render(
        <PropsEditor schema={schema} values={{ config: {} }} onChange={onChange} />
      );

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: '{"new": "value"}' } });

      expect(onChange).toHaveBeenCalledWith({ config: { new: "value" } });
    });
  });

  describe("multiple properties", () => {
    it("renders all property fields", () => {
      const schema: PropsSchema = {
        type: "object",
        properties: {
          name: { type: "string", title: "Name" },
          count: { type: "number", title: "Count" },
          active: { type: "boolean", title: "Active" },
        },
      };

      render(
        <PropsEditor
          schema={schema}
          values={{ name: "Test", count: 5, active: true }}
          onChange={() => {}}
        />
      );

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Count")).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });
  });
});

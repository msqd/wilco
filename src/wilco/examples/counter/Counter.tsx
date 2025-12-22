import { useState } from "react";

interface CounterProps {
  initialValue?: number;
  step?: number;
}

export default function Counter({ initialValue = 0, step = 1 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h3 style={{ margin: "0 0 1rem 0" }}>Counter Component</h3>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button onClick={() => setCount((c) => c - step)}>-{step}</button>
        <span style={{ fontSize: "1.5rem", minWidth: "3rem", textAlign: "center" }}>
          {count}
        </span>
        <button onClick={() => setCount((c) => c + step)}>+{step}</button>
      </div>
    </div>
  );
}

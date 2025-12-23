// @ts-ignore
import React from "react";
import Product from "../product";

interface ProductPreviewProps {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export default function ProductPreview(props: ProductPreviewProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
          margin: "16px 8px",
      }}
    >
      <div>
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6b7280",
          }}
        >
          List View
        </h3>
        <div
          style={{
            maxWidth: "280px",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          <Product {...props} mode="list" />
        </div>
      </div>

      <hr />

      <div>
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6b7280",
          }}
        >
          Detail View
        </h3>
        <div
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          <Product {...props} mode="detail" />
        </div>
      </div>
    </div>
  );
}

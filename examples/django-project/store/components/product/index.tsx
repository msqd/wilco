import React from "react";

interface ProductProps {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export default function Product({
  name,
  price,
  description,
  imageUrl,
}: ProductProps) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

  return (
    <div
      style={{
        display: "flex",
        gap: "24px",
        padding: "16px",
        backgroundColor: "#f9fafb",
        borderRadius: "12px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "200px",
          height: "200px",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#e5e7eb",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            No image
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: "24px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {name}
        </h2>

        <div
          style={{
            fontSize: "20px",
            fontWeight: 500,
            color: "#059669",
            marginBottom: "12px",
          }}
        >
          {formattedPrice}
        </div>

        {description && (
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

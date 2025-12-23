// @ts-ignore
import React from "react";

interface ProductProps {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  url?: string;
  mode?: "list" | "detail";
}

export default function Product({
  name,
  price,
  description,
  imageUrl,
  url,
  mode = "detail",
}: ProductProps) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

  const isListMode = mode === "list";

  // Truncate description in list mode
  const displayDescription =
    isListMode && description && description.length > 80
      ? description.slice(0, 80) + "..."
      : description;

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: isListMode ? "column" : "row",
        gap: isListMode ? "12px" : "24px",
        padding: "16px",
        backgroundColor: "#f9fafb",
        borderRadius: "12px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        height: isListMode ? "100%" : "auto",
        boxSizing: "border-box",
        transition: "box-shadow 0.2s ease",
        cursor: url ? "pointer" : "default",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: isListMode ? "100%" : "200px",
          height: isListMode ? "160px" : "200px",
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
            fontSize: isListMode ? "18px" : "24px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {name}
        </h2>

        <div
          style={{
            fontSize: isListMode ? "16px" : "20px",
            fontWeight: 500,
            color: "#059669",
            marginBottom: "12px",
          }}
        >
          {formattedPrice}
        </div>

        {displayDescription && (
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            {displayDescription}
          </p>
        )}
      </div>
    </div>
  );

  // Wrap in link if URL provided
  if (url) {
    return (
      <a
        href={url}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
          height: isListMode ? "100%" : "auto",
        }}
      >
        {content}
      </a>
    );
  }

  return content;
}

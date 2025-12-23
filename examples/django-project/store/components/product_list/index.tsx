// @ts-ignore
import React from "react";

interface Product {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  url?: string;
}

interface ProductListProps {
  products: Product[];
  title?: string;
}

// Inline Product component to avoid cross-component imports
// (wilco components are loaded independently)
function ProductCard({
  name,
  price,
  description,
  imageUrl,
  url,
}: Product) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

  // Truncate description
  const displayDescription =
    description && description.length > 80
      ? description.slice(0, 80) + "..."
      : description;

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        backgroundColor: "#f9fafb",
        borderRadius: "12px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        height: "100%",
        boxSizing: "border-box",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: "100%",
          height: "160px",
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
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "18px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {name}
        </h3>

        <div
          style={{
            fontSize: "16px",
            fontWeight: 500,
            color: "#059669",
            marginBottom: "8px",
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

  if (url) {
    return (
      <a
        href={url}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
          height: "100%",
        }}
      >
        {content}
      </a>
    );
  }

  return content;
}

export default function ProductList({ products, title }: ProductListProps) {
  if (!products || products.length === 0) {
    return (
      <div
        style={{
          padding: "48px",
          textAlign: "center",
          color: "#6b7280",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        No products found.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {title && (
        <h1
          style={{
            margin: "0 0 24px 0",
            fontSize: "28px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {title}
        </h1>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "24px",
        }}
      >
        {products.map((product, index) => (
          <ProductCard key={product.url || index} {...product} />
        ))}
      </div>
    </div>
  );
}

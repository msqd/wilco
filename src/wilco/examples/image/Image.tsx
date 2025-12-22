interface ImageProps {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  borderRadius?: string | number;
  onClick?: () => void;
}

const PLACEHOLDER_IMAGE = "https://picsum.photos/seed/placeholder/600/400";

export default function Image({
  src = PLACEHOLDER_IMAGE,
  alt = "",
  width = "100%",
  height = "auto",
  objectFit = "cover",
  borderRadius = 0,
  onClick,
}: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        objectFit,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        display: "block",
        cursor: onClick ? "pointer" : "default",
      }}
    />
  );
}

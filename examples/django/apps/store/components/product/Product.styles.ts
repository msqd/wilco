// @ts-ignore
import { styled } from "goober";

// Shared design tokens
const tokens = {
  colors: {
    background: "#f9fafb",
    border: "#e5e7eb",
    text: {
      primary: "#111827",
      secondary: "#6b7280",
      muted: "#9ca3af",
    },
    price: "#059669",
  },
  fonts: {
    base: "system-ui, -apple-system, sans-serif",
  },
  radii: {
    sm: "8px",
    md: "12px",
  },
};

interface ContainerProps {
  $isListMode: boolean;
  $isClickable: boolean;
}

export const Container = styled("div")<ContainerProps>`
  display: flex;
  flex-direction: ${(p) => (p.$isListMode ? "column" : "row")};
  gap: ${(p) => (p.$isListMode ? "12px" : "24px")};
  padding: 16px;
  background-color: ${tokens.colors.background};
  border-radius: ${tokens.radii.md};
  font-family: ${tokens.fonts.base};
  height: ${(p) => (p.$isListMode ? "100%" : "auto")};
  box-sizing: border-box;
  transition: box-shadow 0.2s ease;
  cursor: ${(p) => (p.$isClickable ? "pointer" : "default")};
`;

interface ImageWrapperProps {
  $isListMode: boolean;
}

export const ImageWrapper = styled("div")<ImageWrapperProps>`
  flex-shrink: 0;
  width: ${(p) => (p.$isListMode ? "100%" : "200px")};
  height: ${(p) => (p.$isListMode ? "160px" : "200px")};
  border-radius: ${tokens.radii.sm};
  overflow: hidden;
  background-color: ${tokens.colors.border};
`;

export const Image = styled("img")`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const NoImagePlaceholder = styled("div")`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${tokens.colors.text.muted};
  font-size: 14px;
`;

export const Content = styled("div")`
  flex: 1;
`;

interface TitleProps {
  $isListMode: boolean;
}

export const Title = styled("h2")<TitleProps>`
  margin: 0 0 8px 0;
  font-size: ${(p) => (p.$isListMode ? "18px" : "24px")};
  font-weight: 600;
  color: ${tokens.colors.text.primary};
`;

interface PriceProps {
  $isListMode: boolean;
}

export const Price = styled("div")<PriceProps>`
  font-size: ${(p) => (p.$isListMode ? "16px" : "20px")};
  font-weight: 500;
  color: ${tokens.colors.price};
  margin-bottom: 12px;
`;

export const Description = styled("p")`
  margin: 0;
  font-size: 14px;
  color: ${tokens.colors.text.secondary};
  line-height: 1.5;
`;

interface LinkWrapperProps {
  $isListMode: boolean;
}

export const LinkWrapper = styled("a")<LinkWrapperProps>`
  text-decoration: none;
  color: inherit;
  display: block;
  height: ${(p) => (p.$isListMode ? "100%" : "auto")};
`;

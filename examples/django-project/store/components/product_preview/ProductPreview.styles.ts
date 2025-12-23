// @ts-ignore
import { styled } from "goober";

const tokens = {
  colors: {
    text: {
      secondary: "#6b7280",
    },
  },
  fonts: {
    base: "system-ui, -apple-system, sans-serif",
  },
  radii: {
    md: "12px",
  },
  shadows: {
    card: "0 2px 8px rgba(0, 0, 0, 0.12)",
  },
};

export const Container = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-family: ${tokens.fonts.base};
  margin: 16px 8px;
`;

export const Section = styled("div")``;

export const SectionTitle = styled("h3")`
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${tokens.colors.text.secondary};
`;

export const ListPreviewWrapper = styled("div")`
  max-width: 280px;
  border-radius: ${tokens.radii.md};
  overflow: hidden;
  box-shadow: ${tokens.shadows.card};
`;

export const DetailPreviewWrapper = styled("div")`
  border-radius: ${tokens.radii.md};
  overflow: hidden;
  box-shadow: ${tokens.shadows.card};
`;

export const Divider = styled("hr")`
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0;
`;

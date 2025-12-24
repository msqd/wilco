// @ts-ignore
import { styled } from "goober";

const tokens = {
  colors: {
    text: {
      primary: "#111827",
      secondary: "#6b7280",
    },
  },
  fonts: {
    base: "system-ui, -apple-system, sans-serif",
  },
};

export const Container = styled("div")`
  font-family: ${tokens.fonts.base};
`;

export const PageTitle = styled("h1")`
  margin: 0 0 24px 0;
  font-size: 28px;
  font-weight: 700;
  color: ${tokens.colors.text.primary};
`;

export const Grid = styled("div")`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
`;

export const EmptyState = styled("div")`
  padding: 48px;
  text-align: center;
  color: ${tokens.colors.text.secondary};
  font-family: ${tokens.fonts.base};
`;

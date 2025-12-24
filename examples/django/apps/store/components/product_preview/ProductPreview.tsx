// @ts-ignore
import React from "react";
// @ts-ignore
import { useComponent } from "@wilcojs/react";
import {
  Container,
  Section,
  SectionTitle,
  ListPreviewWrapper,
  DetailPreviewWrapper,
  Divider,
} from "./ProductPreview.styles";

interface ProductPreviewProps {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export default function ProductPreview(props: ProductPreviewProps) {
  // Dynamically load the Product component
  const Product = useComponent("store:product");

  return (
    <Container>
      <Section>
        <SectionTitle>List View</SectionTitle>
        <ListPreviewWrapper>
          <Product {...props} mode="list" />
        </ListPreviewWrapper>
      </Section>

      <Divider />

      <Section>
        <SectionTitle>Detail View</SectionTitle>
        <DetailPreviewWrapper>
          <Product {...props} mode="detail" />
        </DetailPreviewWrapper>
      </Section>
    </Container>
  );
}

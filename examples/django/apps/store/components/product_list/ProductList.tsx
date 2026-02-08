// @ts-ignore
import React from "react";
// @ts-ignore
import { useComponent } from "@wilcojs/react";
import { Container, PageTitle, Grid, EmptyState } from "./ProductList.styles";

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

export default function ProductList({ products, title }: ProductListProps) {
  const ProductCard = useComponent("store:product");

  if (!products || products.length === 0) {
    return <EmptyState>No products found.</EmptyState>;
  }

  return (
    <Container>
      {title && <PageTitle>{title}</PageTitle>}
      <Grid>
        {products.map((product, index) => (
          <ProductCard key={product.url || index} {...product} mode="list" />
        ))}
      </Grid>
    </Container>
  );
}

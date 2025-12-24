// @ts-ignore
import React from "react";
import {
  Container,
  ImageWrapper,
  Image,
  NoImagePlaceholder,
  Content,
  Title,
  Price,
  Description,
  LinkWrapper,
} from "./Product.styles";

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
    <Container $isListMode={isListMode} $isClickable={!!url}>
      <ImageWrapper $isListMode={isListMode}>
        {imageUrl ? (
          <Image src={imageUrl} alt={name} />
        ) : (
          <NoImagePlaceholder>No image</NoImagePlaceholder>
        )}
      </ImageWrapper>

      <Content>
        <Title $isListMode={isListMode}>{name}</Title>
        <Price $isListMode={isListMode}>{formattedPrice}</Price>
        {displayDescription && <Description>{displayDescription}</Description>}
      </Content>
    </Container>
  );

  if (url) {
    return (
      <LinkWrapper href={url} $isListMode={isListMode}>
        {content}
      </LinkWrapper>
    );
  }

  return content;
}

import { useState, useEffect } from "react";
import { useComponent } from "@wilcojs/react";
import { NavButton } from "./NavButton";

interface CarouselProps {
  images: string[];
  autoPlay?: boolean;
  interval?: number;
}

export default function Carousel({
  images,
  autoPlay = false,
  interval = 3000,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load the Image component dynamically from another wilco component
  const Image = useComponent("image");

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, images.length]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  const goPrev = () => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  };

  const goNext = () => {
    setCurrentIndex((i) => (i + 1) % images.length);
  };

  if (images.length === 0) {
    return <div style={{ padding: "1rem", color: "#888" }}>No images provided</div>;
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "8px",
          backgroundColor: "#111",
        }}
      >
        <Image
          src={images[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          width="100%"
          height="400px"
          objectFit="cover"
        />

        {images.length > 1 && (
          <>
            <NavButton direction="prev" onClick={goPrev} />
            <NavButton direction="next" onClick={goNext} />
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                border: "none",
                padding: 0,
                background: index === currentIndex ? "#646cff" : "#444",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

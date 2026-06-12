import { useState, useEffect } from "react";

export default function Carousel({ slides, interval = 4000 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [slides.length, interval]);

  const slide = slides[current];

  return (
    <div className="carousel">
      <div className="carousel-stage">
        <a href={slide.url} target="_blank" rel="noopener noreferrer">
          <img src={slide.image} alt={slide.name} loading="lazy" />
        </a>
      </div>
      <div className="carousel-caption">
        <span>{slide.name}</span>
        <span className="carousel-location"> — {slide.location}</span>
      </div>
    </div>
  );
}

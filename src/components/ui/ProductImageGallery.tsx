"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import SafeImage from "@/components/ui/SafeImage";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSwipeable } from "react-swipeable";

interface ProductImageGalleryProps {
  images?: string[];
  productName: string;
  fallbackNode?: React.ReactNode;
}

const ProductImageGallery = React.memo(function ProductImageGallery({ 
  images, 
  productName, 
  fallbackNode 
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validImages = useMemo(() => {
    return images && images.length > 0 ? images : [];
  }, [images]);

  const hasMultiple = validImages.length > 1;
  const noImages = validImages.length === 0;

  const handleNext = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  }, [hasMultiple, validImages.length]);

  const handlePrev = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [hasMultiple, validImages.length]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNext(),
    onSwipedRight: () => handlePrev(),
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  useEffect(() => {
    if (!hasMultiple) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiple, handleNext, handlePrev]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div 
        {...swipeHandlers}
        className="relative aspect-square w-full overflow-hidden rounded-[32px] bg-white border border-gray-100 shadow-xs flex items-center justify-center group"
      >
        {noImages ? (
          fallbackNode || (
            <div className="relative w-full h-full p-4 md:p-8">
              <SafeImage
                src="/placeholder-product.png"
                alt={`Placeholder for ${productName}`}
                fill
                priority
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-contain opacity-50"
              />
            </div>
          )
        ) : (
          <div className="relative w-full h-full p-4 md:p-8">
            <SafeImage
              src={validImages[currentIndex]}
              alt={`${productName} - Image ${currentIndex + 1} of ${validImages.length}`}
              fill
              priority
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-contain"
            />
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-2.5 rounded-full shadow-md transition-all z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-2.5 rounded-full shadow-md transition-all z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </>
        )}
        
        {/* Badges slot can be added externally by making the parent component relative, but here we expect badges to be overlaid on top of this component's container in the parent */}
      </div>

      {hasMultiple && (
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x w-full">
          {validImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex items-center justify-center p-1 h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-xl border-2 transition-all snap-start bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4285F4] ${
                idx === currentIndex
                  ? "border-[#4285F4] ring-2 ring-[#4285F4]/20"
                  : "border-gray-100 opacity-70 hover:opacity-100 hover:border-gray-200"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <div className="relative flex items-center justify-center w-[90%] h-[90%]">
                <SafeImage
                  src={img}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 64px, 80px"
                  className="object-contain"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ProductImageGallery;

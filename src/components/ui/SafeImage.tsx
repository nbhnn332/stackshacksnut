"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { Image as ImageIcon } from "lucide-react";

export interface SafeImageProps extends Omit<ImageProps, "src"> {
  src?: string | null;
  fallbackIcon?: React.ReactNode;
}

const ALLOWED_DOMAINS = [
  "res.cloudinary.com",
  "images.unsplash.com",
  "picsum.photos",
  "via.placeholder.com",
  "i.postimg.cc",
  "cdn2.nutrabay.com"
];

const isValidImage = (imageUrl?: string | null): boolean => {
  if (!imageUrl) return false;
  if (imageUrl.startsWith("/")) return true;
  if (imageUrl.startsWith("http")) {
    try {
      const url = new URL(imageUrl);
      if (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".cloudinary.com")) return true;
      return ALLOWED_DOMAINS.includes(url.hostname);
    } catch {
      return false;
    }
  }
  return false;
};

export default function SafeImage({
  src,
  alt,
  fallbackIcon,
  className = "",
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);

  const showFallback = error || !isValidImage(src);
  const finalSrc = showFallback ? "/placeholder-product.png" : src!;

  // If we really want to render a div when showFallback is true and fallbackIcon is provided
  if (showFallback && fallbackIcon) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 border border-gray-200 overflow-hidden ${className}`}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <Image
      src={finalSrc}
      alt={alt || "Image"}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}

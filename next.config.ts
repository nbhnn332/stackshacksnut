import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "i.postimg.cc" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "cdn2.nutrabay.com" },
    ],
  },
};

export default nextConfig;

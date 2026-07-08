import SafeImage from "@/components/ui/SafeImage";

interface CartProductImageProps {
  src?: string;
  alt: string;
}

export default function CartProductImage({ src, alt }: CartProductImageProps) {
  return (
    <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 overflow-hidden rounded-xl bg-white border border-gray-100 flex items-center justify-center p-1">
      <div className="relative w-full h-full flex items-center justify-center">
        <SafeImage
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 64px, 80px"
          className="object-contain max-w-full max-h-full"
        />
      </div>
    </div>
  );
}

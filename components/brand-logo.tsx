import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand/config";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Taller logo in navbar */
  size?: "navbar" | "footer" | "compact";
};

const heights = {
  navbar: "h-9 sm:h-10 md:h-11",
  footer: "h-10 sm:h-12",
  compact: "h-8",
} as const;

export function BrandLogo({ className, size = "navbar" }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 group shrink-0", className)}
      aria-label={brand.name}
    >
      <div className={cn("relative w-auto", heights[size])}>
        <Image
          src={brand.logo.src}
          alt={brand.name}
          width={brand.logo.width}
          height={brand.logo.height}
          className="h-full w-auto max-w-[200px] sm:max-w-[220px] object-contain object-left"
          priority={size === "navbar"}
          sizes="(max-width: 768px) 180px, 220px"
        />
      </div>
    </Link>
  );
}

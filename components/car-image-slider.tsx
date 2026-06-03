"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const defaultImage = "https://images.unsplash.com/photo-1503376760302-8fac2a800d02?w=1200&q=80";

type Props = {
  images: string[];
  alt: string;
  className?: string;
  /** Hero height */
  heightClass?: string;
};

export function CarImageSlider({ images, alt, className, heightClass = "h-[40vh] md:h-[60vh]" }: Props) {
  const slides = images.length > 0 ? images : [defaultImage];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [JSON.stringify(slides)]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const n = slides.length;
        return (i + dir + n) % n;
      });
    },
    [slides.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className={cn("relative w-full bg-muted overflow-hidden group/slider", heightClass, className)}>
      {slides.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className={cn("absolute inset-0 transition-opacity duration-500", i === index ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none")}
          aria-hidden={i !== index}
        >
          <Image src={src} alt={`${alt}, photo ${i + 1}`} fill className="object-cover" sizes="100vw" priority={i === 0} />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-[2] pointer-events-none" />

      {slides.length > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full h-11 w-11 border border-zinc-700 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm opacity-80 md:opacity-0 md:group-hover/slider:opacity-100 transition-opacity"
            onClick={() => go(-1)}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full h-11 w-11 border border-zinc-700 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm opacity-80 md:opacity-0 md:group-hover/slider:opacity-100 transition-opacity"
            onClick={() => go(1)}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/60"
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

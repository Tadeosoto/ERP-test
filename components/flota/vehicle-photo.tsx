"use client";

import Image from "next/image";

function vehicleLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return `/api/vehicle-photos/${src}?w=${width}&q=${quality ?? 75}`;
}

export function VehiclePhoto({
  id,
  alt,
  width,
  height,
  className,
  sizes,
}: {
  id: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      loader={vehicleLoader}
      src={id}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes ?? `${width}px`}
      className={className ?? "h-full w-full object-cover"}
    />
  );
}

import Image from "next/image";
import { CCP_LOGO_ICON_PATH } from "@/components/ccp-logo";

type LoadingLogoProps = {
  /** Tamaño base del logo en px (antes de escalar en la animación). */
  size?: number;
  className?: string;
};

export function LoadingLogo({ size = 96, className = "" }: LoadingLogoProps) {
  const frame = Math.round(size * 1.4);

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: frame, height: frame }}
      aria-hidden
    >
      <Image
        src={CCP_LOGO_ICON_PATH}
        alt=""
        width={size}
        height={size}
        priority
        className="ccp-logo-loading object-contain"
      />
    </div>
  );
}

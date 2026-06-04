import Image from "next/image";

/** Logo con nombre — barra lateral oscura. */
export const CCP_LOGO_PATH = "/images/CCP logo.png";

/** Ícono CCP sin texto — fondos claros (cabecera, login, pie). */
export const CCP_LOGO_ICON_PATH = "/images/CCP-logo-sin-texto.png";

type CcpLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
};

const dimensions = {
  sm: { width: 160, height: 42 },
  md: { width: 220, height: 56 },
  lg: { width: 280, height: 72 },
} as const;

const iconPx = {
  sm: 32,
  md: 40,
  lg: 56,
} as const;

/** Logo completo con texto — usar en barra lateral (`orange-900`). */
export function CcpLogo({ size = "md", className = "", priority = false }: CcpLogoProps) {
  const dim = dimensions[size];
  return (
    <Image
      src={CCP_LOGO_PATH}
      alt="Consorcio Constructor Profesional"
      width={dim.width}
      height={dim.height}
      priority={priority}
      className={`h-auto max-w-full object-contain ${className}`}
    />
  );
}

/** Ícono isométrico naranja — fondos claros. */
export function CcpLogoIcon({
  size = "md",
  className = "",
  priority = false,
}: {
  size?: keyof typeof iconPx;
  className?: string;
  priority?: boolean;
}) {
  const px = iconPx[size];
  return (
    <Image
      src={CCP_LOGO_ICON_PATH}
      alt=""
      width={px}
      height={px}
      priority={priority}
      aria-hidden
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

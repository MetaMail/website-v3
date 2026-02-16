import Image from "next/image";
import logoSvg from "@/assets/logo.svg";

interface MetaMailLogoProps {
  className?: string;
  size?: number;
}

export function MetaMailLogo({ className, size = 24 }: MetaMailLogoProps) {
  return (
    <Image
      src={logoSvg}
      alt="MetaMail"
      width={size}
      height={size}
      className={className}
    />
  );
}

import Image from 'next/image';

interface SessiofLogoProps {
  size?: number;
  className?: string;
  showGradientBg?: boolean;
}

export default function SessiofLogo({ size = 32, className = '', showGradientBg = true }: SessiofLogoProps) {
  if (showGradientBg) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)',
          boxShadow: '0 4px 15px rgba(91,77,199,0.35)',
        }}
      >
        <Image
          src="/sessiof-logo.png"
          alt="Sessiof Logo"
          width={size}
          height={size}
          className="object-cover w-full h-full"
          priority
        />
      </div>
    );
  }

  return (
    <Image
      src="/sessiof-logo.png"
      alt="Sessiof Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  );
}

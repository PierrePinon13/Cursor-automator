
import { Image as LucideImage } from "lucide-react";

type CompanyLogoProps = {
  logoUrl?: string;
  companyName: string;
  className?: string;
  size?: number;
};

function getInitials(name: string) {
  // Ex: 'Keyrock' -> 'K', 'Société Générale' -> 'SG'
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export const CompanyLogo = ({
  logoUrl,
  companyName,
  className = "",
  size = 32,
}: CompanyLogoProps) => {
  // Placeholder image in case of error
  const fallbackImg =
    "/lovable-uploads/photo-1488590528505-98d2b5aba04b";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-white border border-gray-200 overflow-hidden ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${companyName} logo`}
          className="object-contain w-full h-full"
          loading="lazy"
          onError={(e) => {
            // @ts-ignore
            e.target.onerror = null;
            // @ts-ignore
            e.target.src = fallbackImg;
          }}
        />
      ) : (
        // Fallback: initiales ou icône image si pas de nom
        companyName ? (
          <span className="text-xs font-bold text-gray-600 select-none">
            {getInitials(companyName)}
          </span>
        ) : (
          <LucideImage className="text-gray-300" size={20} />
        )
      )}
    </span>
  );
};

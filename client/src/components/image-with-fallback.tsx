import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
  containerClassName?: string;
  loadingClassName?: string;
  testId?: string;
}

export function ImageWithFallback({
  src,
  alt,
  fallback,
  className = "",
  containerClassName = "",
  loadingClassName = "",
  testId,
}: ImageWithFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // If no src provided, show fallback immediately
  if (!src) {
    return <>{fallback}</>;
  }

  // If error occurred, show fallback
  if (hasError) {
    return <>{fallback}</>;
  }

  return (
    <div className={`relative ${containerClassName}`}>
      {/* Loading spinner overlay */}
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-muted/50 ${loadingClassName}`}>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Image */}
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        data-testid={testId}
      />
    </div>
  );
}
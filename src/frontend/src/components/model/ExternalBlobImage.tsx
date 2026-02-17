import { useState } from 'react';
import type { ExternalBlob } from '../../backend';

interface ExternalBlobImageProps {
  blob: ExternalBlob;
  alt: string;
  className?: string;
}

export default function ExternalBlobImage({ blob, alt, className = '' }: ExternalBlobImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrl = blob.getDirectURL();

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <p className="text-xs text-muted-foreground">Failed to load image</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-muted ${className}`}>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

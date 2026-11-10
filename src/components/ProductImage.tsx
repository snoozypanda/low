import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from './ui'

export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  eager,
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={cn('relative overflow-hidden bg-[#EEF2EC]', className)}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          className={cn('h-full w-full object-cover', imgClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#EAF6E5] to-[#DDEBD7] text-brand-dark/60">
          <ImageOff className="h-5 w-5" />
          <span className="px-2 text-center text-[8px] font-semibold uppercase tracking-wide">Image unavailable</span>
        </div>
      )}
    </div>
  )
}

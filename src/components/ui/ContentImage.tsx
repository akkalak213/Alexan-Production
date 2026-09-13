'use client'

import { ImageOff } from 'lucide-react'
import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

type Props = Omit<ImageProps, 'src' | 'onError' | 'onLoad'> & { src: string; unavailableLabel: string }

function LoadableImage({ unavailableLabel, alt, ...props }: Props) {
  const [failure, setFailure] = useState<'none' | 'optimizer' | 'source'>('none')

  if (failure === 'source') {
    return (
      <span className="content-image-unavailable" role="img" aria-label={alt || unavailableLabel}>
        <ImageOff size={24} strokeWidth={1.4} aria-hidden />
        <span>{unavailableLabel}</span>
      </span>
    )
  }

  return (
    <Image
      {...props}
      alt={alt}
      unoptimized={props.unoptimized || failure === 'optimizer'}
      onError={() => setFailure(failure === 'none' && !props.unoptimized ? 'optimizer' : 'source')}
    />
  )
}

/** Try the original once if image optimisation times out; never retry in a loop. */
export function ContentImage(props: Props) {
  return <LoadableImage key={props.src} {...props} />
}

import { useEffect } from 'react'

interface UseAppShellEffectsArgs {
  pathname: string
}

export const useAppShellEffects = ({ pathname }: UseAppShellEffectsArgs) => {
  useEffect(() => {
    document.body.classList.toggle('full-bleed', pathname === '/')
    return () => {
      document.body.classList.remove('full-bleed')
    }
  }, [pathname])

  useEffect(() => {
    const criticalImages = [
      '/icons/Vector.png',
      '/icons/Mia.png',
      '/images/Grow Nav.png',
      '/images/Optimise Nav.png',
      '/images/Protect Nav.png'
    ]

    criticalImages.forEach((src) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }, [])
}

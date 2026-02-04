import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CRITICAL_PRELOAD_IMAGES } from '../config/preload-assets'

export const useAppChromeEffects = () => {
  const location = useLocation()

  useEffect(() => {
    document.body.classList.toggle('full-bleed', location.pathname === '/')
    return () => {
      document.body.classList.remove('full-bleed')
    }
  }, [location.pathname])

  useEffect(() => {
    CRITICAL_PRELOAD_IMAGES.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }, [])
}

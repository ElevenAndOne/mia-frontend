import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const useAppChromeEffects = () => {
  const location = useLocation()

  useEffect(() => {
    document.body.classList.toggle('full-bleed', location.pathname === '/')
    return () => {
      document.body.classList.remove('full-bleed')
    }
  }, [location.pathname])
}

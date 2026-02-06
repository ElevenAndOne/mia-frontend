import type { ReactNode } from 'react'

interface LoginPageMobileProps {
  actionButtons: ReactNode
}

export const LoginPageMobile = ({ actionButtons }: LoginPageMobileProps) => {
  return (
    <div className="relative flex min-h-screen-dvh h-full flex-col lg:hidden">
      <div className="absolute inset-0">
        <video className="w-full h-full object-cover" autoPlay muted loop>
          <source src="/videos/mia-intro-video-compressed.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-utility-blue-600"></div>
      <div className="relative z-10 flex h-full flex-col">
        <div className="px-6 pt-8">
          <img src="/icons/mia-logo.png" alt="Mia" className="h-12 w-12" />
        </div>
        <div className="flex-1"></div>
        <div className="px-6 pb-8">
          <div className="max-w-sm">
            {actionButtons}
          </div>
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

interface LoginPageDesktopProps {
  actionButtons: ReactNode
}

export const LoginPageDesktop = ({ actionButtons }: LoginPageDesktopProps) => {
  return (
    <div className="hidden lg:flex min-h-screen-dvh h-full items-stretch justify-center gap-10 px-8 py-10">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 text-primary">
          <img src="/icons/mia-logo.png" alt="Mia" className="h-12 w-12" />
        </div>
        <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto mt-8 ">
          {actionButtons}
        </div>
        <div className="flex items-center justify-between paragraph-sm">
          <p>Mia v1.0.0</p>
        </div>
      </div>
      <div className="flex-1 flex justify-center items-center relative overflow-hidden rounded-3xl bg-linear-to-br from-utility-purple-600 to-utility-blue-700 p-4">
        <div className="h-full aspect-9/16 rounded-3xl overflow-hidden">
          <video className="w-full h-full object-cover" autoPlay muted loop>
            <source src="/videos/mia-intro-video-compressed.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  )
}

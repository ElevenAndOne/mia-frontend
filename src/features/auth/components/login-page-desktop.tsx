import type { ReactNode } from 'react'

interface LoginPageDesktopProps {
  actionButtons: ReactNode
}

export const LoginPageDesktop = ({ actionButtons }: LoginPageDesktopProps) => {
  return (
    // min-w-0 on both columns and max-w-full on the video box: the 9:16 box took its width
    // from the full page height, so in a window narrower than ~1200px it could not shrink,
    // the row overflowed, and justify-center pushed the sign-in buttons off the LEFT edge
    // (Josh's desktop, 2026-09-23). Now the box yields on width and the row never overflows.
    <div className="hidden lg:flex min-h-dvh h-full items-stretch justify-center gap-10 px-8 py-10 overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col">
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
      <div className="flex-1 min-w-0 flex justify-center items-center relative overflow-hidden rounded-3xl bg-linear-to-br from-utility-purple-600 to-utility-blue-700 p-4">
        <div className="h-full max-w-full aspect-9/16 rounded-3xl overflow-hidden">
          <video className="w-full h-full object-cover" autoPlay muted loop>
            <source src="/videos/mia-intro-video-compressed.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  )
}

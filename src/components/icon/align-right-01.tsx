export function AlignRight01({ size = 24, strokeWidth = 2, className }: { size?: number; strokeWidth?: number; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" height={size} width={size} className={className} >
            <path d="M21 21V3M3 12H17M17 12L10 5M17 12L10 19" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
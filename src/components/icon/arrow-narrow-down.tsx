export function ArrowNarrowDown({ size = 24, strokeWidth = 2, className }: { size?: number; strokeWidth?: number; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" height={size} width={size} className={className} >
            <path d="M12 4V20M12 20L18 14M12 20L6 14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
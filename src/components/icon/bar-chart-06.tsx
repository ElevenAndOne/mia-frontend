export function BarChart06({ size = 24, strokeWidth = 2, className }: { size?: number; strokeWidth?: number; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" height={size} width={size} className={className} >
            <path d="M9 8V21M21 17V21M3 3V21M15 13V21" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
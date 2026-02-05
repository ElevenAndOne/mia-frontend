export function BarChart03({ size = 24, strokeWidth = 2, className }: { size?: number; strokeWidth?: number; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" height={size} width={size} className={className} >
            <path d="M6 20V4M18 20V16M12 20V10" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
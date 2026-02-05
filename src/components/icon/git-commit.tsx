export function GitCommit({ size = 24, strokeWidth = 2, className }: { size?: number; strokeWidth?: number; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" height={size} width={size} className={className} >
            <path d="M16 12C16 14.2091 14.2091 16 12 16C9.79085 16 7.99999 14.2091 7.99999 12M16 12C16 9.79086 14.2091 8 12 8C9.79085 8 7.99999 9.79086 7.99999 12M16 12H22M7.99999 12H2.00018" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    )
}
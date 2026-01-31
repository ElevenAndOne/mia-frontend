export const getAccountIcon = (businessType?: string | null): string => {
  switch (businessType?.toLowerCase()) {
    case 'food':
      return '🍎'
    case 'engineering':
      return '⚙️'
    case 'retail':
      return '🏪'
    default:
      return '🏢'
  }
}

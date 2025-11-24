/**
 * Centralized exports for all composable layout components
 * Import from this file for cleaner imports across the app
 * 
 * Example:
 * import { PageLayout, Modal, Card, InsightCard } from '@/components/layouts'
 */

// Page Layout
export { PageLayout } from './page-layout'

// Modal
export { Modal } from './modal'

// Card Components
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from './card'

// Insight Components
export { InsightCard, InsightList } from './insight-card'

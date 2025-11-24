/**
 * Mock User Data
 * Generates fake user profiles for development
 */

import { UserProfile } from '../../contexts/SessionContext'

export const mockUsers: UserProfile[] = [
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    google_user_id: 'google_12345',
    meta_user_id: 'meta_54321'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@marketingpro.com',
    picture_url: 'https://images.unsplash.com/photo-1494790108755-2616b818c10c?w=100&h=100&fit=crop&crop=face',
    google_user_id: 'google_67890',
    meta_user_id: 'meta_09876'
  },
  {
    name: 'Mike Chen',
    email: 'mike.chen@digitalads.io',
    picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    google_user_id: 'google_11111',
    meta_user_id: 'meta_22222'
  }
]

export const generateRandomUser = (): UserProfile => {
  const firstNames = ['Alex', 'Taylor', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn']
  const lastNames = ['Wilson', 'Brown', 'Davis', 'Miller', 'Garcia', 'Rodriguez', 'Martinez', 'Anderson']
  const domains = ['example.com', 'testcompany.com', 'marketing.co', 'digitalads.com', 'business.org']
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const domain = domains[Math.floor(Math.random() * domains.length)]
  
  return {
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    picture_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
    google_user_id: `google_${Math.random().toString(36).substr(2, 9)}`,
    meta_user_id: `meta_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const getMockUser = (email?: string): UserProfile => {
  if (email) {
    const existingUser = mockUsers.find(user => user.email === email)
    if (existingUser) return existingUser
  }
  
  // Return default user or generate random one
  return mockUsers[0] || generateRandomUser()
}

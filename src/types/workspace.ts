export interface Workspace {
  tenant_id: string
  name: string
  created_at: string
  role?: 'owner' | 'admin' | 'member'
}

export interface WorkspaceMember {
  user_id: string
  email: string
  name?: string
  role: 'owner' | 'admin' | 'member'
}

export interface WorkspaceInvite {
  invite_id: string
  email?: string
  role: 'admin' | 'member'
  created_at: string
  expires_at: string
}

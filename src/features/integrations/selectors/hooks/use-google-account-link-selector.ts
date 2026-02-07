import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../../../../contexts/session-context'
import { useSelectorState } from './use-selector-state'
import { useMiaClient } from '../../../../sdk'
import type { GoogleAccount } from '../../types'

interface UseGoogleAccountLinkSelectorParams {
  isOpen: boolean
  onClose: () => void
  onSuccess: (linkedAccountId: string) => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useGoogleAccountLinkSelector = ({
  isOpen,
  onClose,
  onSuccess,
}: UseGoogleAccountLinkSelectorParams) => {
  const mia = useMiaClient()
  const { sessionId, selectedAccount, refreshAccounts, user } = useSession()
  const [standaloneAccounts, setStandaloneAccounts] = useState<GoogleAccount[]>([])
  const [managerGroups, setManagerGroups] = useState<Array<{ id: string; name: string; accounts: GoogleAccount[] }>>([])
  const [allSelectableAccounts, setAllSelectableAccounts] = useState<GoogleAccount[]>([])
  const [state, actions] = useSelectorState<string>({ onClose })
  const { selectedId, isLoading, isSubmitting, error, success } = state
  const { setSelectedId, setIsLoading, setError, handleClose, resetState, withSubmitting } = actions

  const resolveGoogleUserId = useCallback(async () => {
    if (user?.google_user_id) return user.google_user_id
    if (!sessionId) return null

    for (let i = 0; i < 10; i += 1) {
      await delay(500)
      try {
        const status = await mia.auth.google.getStatus()
        const userId = status?.user_info?.id
        if (status?.authenticated && userId) {
          return userId
        }
      } catch {
        // continue polling
      }
    }

    return null
  }, [user?.google_user_id, sessionId, mia])

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!sessionId) {
        setError('Missing session. Please try again.')
        return
      }

      await refreshAccounts()
      const userId = await resolveGoogleUserId()
      if (!userId) {
        setError('User not authenticated with Google. Please try again.')
        return
      }

      const { mccAccounts, regularAccounts } = await mia.accounts.getMccAccounts(userId)
      const mappedRegularAccounts: GoogleAccount[] = regularAccounts.map((acc) => ({
        customer_id: acc.customerId,
        descriptive_name: acc.descriptiveName,
        manager: acc.isManager,
        login_customer_id: acc.loginCustomerId,
      }))

      const groupedSubIds = new Set<string>()
      const mappedManagers = mccAccounts.map((mcc) => {
        const accounts = (mcc.subAccountIds || [])
          .map((subId) => mappedRegularAccounts.find((account) => account.customer_id === subId))
          .filter((account): account is GoogleAccount => Boolean(account))
          .map((account) => ({
            ...account,
            login_customer_id: account.login_customer_id || mcc.customerId
          }))

        accounts.forEach((account) => groupedSubIds.add(account.customer_id))

        return {
          id: mcc.customerId,
          name: mcc.descriptiveName,
          accounts
        }
      }).filter((manager) => manager.accounts.length > 0)

      const mappedStandalone = mappedRegularAccounts.filter((account) => !groupedSubIds.has(account.customer_id))
      const selectable = [...mappedStandalone, ...mappedManagers.flatMap((manager) => manager.accounts)]

      setStandaloneAccounts(mappedStandalone)
      setManagerGroups(mappedManagers)
      setAllSelectableAccounts(selectable)

      if (selectable.length === 1) {
        setSelectedId(selectable[0].customer_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Google Ads accounts')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, refreshAccounts, resolveGoogleUserId, setError, setIsLoading, setSelectedId, mia])

  useEffect(() => {
    if (!isOpen) return
    resetState()
    loadAccounts()
  }, [isOpen, resetState, loadAccounts])

  const handleLinkAccount = useCallback(async () => {
    if (!sessionId || !selectedAccount) {
      setError('Please select a Google Ads account')
      return
    }

    if (!selectedId) {
      setError('Please select a Google Ads account')
      return
    }

    const selectedGoogle = allSelectableAccounts.find((account) => account.customer_id === selectedId)

    await withSubmitting(async () => {
      await mia.accounts.linkGoogleAds(
        selectedAccount.id,
        selectedId,
        selectedGoogle?.login_customer_id
      )
      await refreshAccounts()
      onSuccess(selectedId)
      handleClose()
    })
  }, [sessionId, selectedAccount, selectedId, allSelectableAccounts, refreshAccounts, onSuccess, handleClose, setError, withSubmitting, mia])

  const standaloneItems = useMemo(() => {
    return standaloneAccounts.map((account) => ({
      id: account.customer_id,
      title: account.descriptive_name || `Account ${account.customer_id}`,
      subtitle: `ID: ${account.customer_id}${account.manager ? ' (Manager Account)' : ''}`,
    }))
  }, [standaloneAccounts])

  const managerItems = useMemo(() => {
    return managerGroups.map((manager) => ({
      id: manager.id,
      title: manager.name,
      subtitle: `${manager.accounts.length} managed accounts`,
      accounts: manager.accounts.map((account) => ({
        id: account.customer_id,
        title: account.descriptive_name || `Account ${account.customer_id}`,
        subtitle: `ID: ${account.customer_id}`
      }))
    }))
  }, [managerGroups])

  return {
    isLoading,
    isSubmitting,
    error,
    success,
    selectedId,
    standaloneItems,
    managerItems,
    isEmpty: allSelectableAccounts.length === 0,
    subtitle: `Link to your ${selectedAccount?.name || 'account'}`,
    setSelectedId,
    handleLinkAccount,
    handleClose,
  }
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useMiaClient, type Account, type MccAccount } from '../../../sdk'

type Provider = 'google' | 'meta'

interface ManagerGroup {
  id: string
  name: string
  subAccounts: Account[]
}

interface UseOnboardingAccountSelectorArgs {
  isOpen: boolean
  provider: Provider
  onSuccess: () => void
}

export const useOnboardingAccountSelector = ({ isOpen, provider, onSuccess }: UseOnboardingAccountSelectorArgs) => {
  const mia = useMiaClient()
  const { user, selectAccount } = useSession()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [expandedManagerId, setExpandedManagerId] = useState<string | null>(null)
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [mccAccounts, setMccAccounts] = useState<MccAccount[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [{ accounts }, mcc] = await Promise.all([
        mia.accounts.list({ refresh: true }),
        provider === 'google' && user?.google_user_id
          ? mia.accounts.getMccAccounts(user.google_user_id).then((result) => result.mccAccounts)
          : Promise.resolve([])
      ])

      setAllAccounts(accounts)
      setMccAccounts(mcc)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load available accounts')
    } finally {
      setIsLoading(false)
    }
  }, [mia, provider, user?.google_user_id])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setSelectedAccountId(null)
    setExpandedManagerId(null)
    void loadData()
  }, [isOpen, loadData])

  const googleAccounts = useMemo(
    () => allAccounts.filter((account) => Boolean(account.googleAdsId)),
    [allAccounts]
  )

  const metaAccounts = useMemo(
    () => allAccounts.filter((account) => Boolean(account.metaAdsId)),
    [allAccounts]
  )

  const managerGroups = useMemo<ManagerGroup[]>(() => {
    if (provider !== 'google') {
      return []
    }

    const accountsByGoogleId = new Map(googleAccounts.map((account) => [account.googleAdsId, account]))

    return mccAccounts
      .filter((mcc) => mcc.isManager)
      .map((mcc) => ({
        id: mcc.customerId,
        name: mcc.descriptiveName,
        subAccounts: (mcc.subAccountIds || [])
          .map((subId) => accountsByGoogleId.get(subId))
          .filter((account): account is Account => Boolean(account))
      }))
  }, [googleAccounts, mccAccounts, provider])

  const standaloneGoogleAccounts = useMemo(() => {
    if (provider !== 'google') {
      return []
    }

    const groupedIds = new Set(
      managerGroups.flatMap((group) => group.subAccounts.map((account) => account.googleAdsId))
    )

    return googleAccounts.filter((account) => {
      const isManager = account.googleAdsAccountType === 'mcc'
      return !isManager && !groupedIds.has(account.googleAdsId)
    })
  }, [googleAccounts, managerGroups, provider])

  const handleSubmit = useCallback(async () => {
    if (!selectedAccountId) {
      setError('Please select an account to continue.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const success = await selectAccount(selectedAccountId)
      if (!success) {
        setError('Could not select this account. Please try another account.')
        return
      }
      onSuccess()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to select account')
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess, selectAccount, selectedAccountId])

  return {
    isLoading,
    isSubmitting,
    error,
    selectedAccountId,
    managerGroups,
    standaloneGoogleAccounts,
    metaAccounts,
    provider,
    expandedManagerId,
    setExpandedManagerId,
    setSelectedAccountId,
    handleSubmit
  }
}

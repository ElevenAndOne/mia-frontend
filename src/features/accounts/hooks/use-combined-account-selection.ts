import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { getAccountIcon } from '../../../utils/account-icon'
import { useMccSelection } from './use-mcc-selection'
import type { AccountMapping, AccountSelectionItem, MccSelectionItem } from '../types'

interface UseCombinedAccountSelectionParams {
  onAccountSelected: () => void
}

export const useCombinedAccountSelection = ({ onAccountSelected }: UseCombinedAccountSelectionParams) => {
  const {
    availableAccounts,
    selectAccount,
    isLoading,
    error,
    clearError,
    user,
    refreshAccounts,
    sessionId,
  } = useSession()
  const [selectingAccountId, setSelectingAccountId] = useState<string | null>(null)
  const { mccAccounts, selectedMcc, isFetchingMccs, selectMcc, clearSelection } = useMccSelection({
    userId: user?.google_user_id,
    sessionId,
  })

  useEffect(() => {
    if (mccAccounts.length === 1 && !selectedMcc) {
      selectMcc(mccAccounts[0].customer_id)
    }
  }, [mccAccounts, selectedMcc, selectMcc])

  useEffect(() => {
    if (!isFetchingMccs && mccAccounts.length === 0 && availableAccounts.length === 1) {
      const account = availableAccounts[0]
      if (account.id.startsWith('user_')) {
        selectAccount(account.id).then((success) => {
          if (success) onAccountSelected()
        })
      }
    }
  }, [isFetchingMccs, mccAccounts.length, availableAccounts, selectAccount, onAccountSelected])

  useEffect(() => {
    if (selectedMcc && availableAccounts.length === 0) {
      refreshAccounts()
    }
  }, [selectedMcc, availableAccounts.length, refreshAccounts])

  const handleAccountSelect = useCallback(async (accountId: string) => {
    if (selectingAccountId) return
    setSelectingAccountId(accountId)
    clearError()

    try {
      const success = await selectAccount(accountId)
      if (success) onAccountSelected()
    } catch (err) {
      console.error('[ACCOUNT-SELECTION] Error selecting account:', err)
    } finally {
      setSelectingAccountId(null)
    }
  }, [selectingAccountId, clearError, selectAccount, onAccountSelected])

  const buildAccountItem = useCallback((account: AccountMapping, detail: string, iconOverride?: string): AccountSelectionItem => {
    return {
      id: account.id,
      name: account.name,
      detail,
      icon: iconOverride ?? getAccountIcon(account.business_type),
      iconBackground: account.color || 'var(--background-color-quaternary)',
      isSelecting: selectingAccountId === account.id,
      disabled: Boolean(selectingAccountId && selectingAccountId !== account.id),
    }
  }, [selectingAccountId])

  const mccItems = useMemo<MccSelectionItem[]>(() => {
    return mccAccounts.map((mcc) => {
      const subAccounts = availableAccounts.filter((account) =>
        mcc.sub_account_ids?.includes(account.google_ads_id || '') &&
        account.google_ads_account_type !== 'mcc'
      )

      return {
        id: mcc.customer_id,
        name: mcc.descriptive_name,
        accountCountLabel: `${subAccounts.length} Account${subAccounts.length !== 1 ? 's' : ''}`,
        isSelected: selectedMcc === mcc.customer_id,
        subAccounts: subAccounts.map((account) =>
          buildAccountItem(account, `Ads: ${account.google_ads_id}`, '📊')
        ),
      }
    })
  }, [mccAccounts, selectedMcc, availableAccounts, buildAccountItem])

  const standaloneAccounts = useMemo<AccountSelectionItem[]>(() => {
    return availableAccounts
      .filter((account) =>
        account.google_ads_account_type === 'standalone' &&
        (account.id.startsWith('google_') || account.id.startsWith('user_'))
      )
      .map((account) => buildAccountItem(account, `Standalone Account • Ads: ${account.google_ads_id}`))
  }, [availableAccounts, buildAccountItem])

  const directAccounts = useMemo<AccountSelectionItem[]>(() => {
    return availableAccounts
      .filter((account) => {
        if (account.google_ads_account_type === 'mcc') return false
        return account.id.startsWith('google_') || account.id.startsWith('user_') || account.id.startsWith('meta_')
      })
      .map((account) => {
        const detail = account.google_ads_id
          ? `Ads: ${account.google_ads_id}`
          : account.meta_ads_id
            ? `Meta: ${account.meta_ads_id}`
            : 'Account'
        return buildAccountItem(account, detail)
      })
  }, [availableAccounts, buildAccountItem])

  const showMccStep = mccAccounts.length > 1
  const isPageLoading = isFetchingMccs || (isLoading && availableAccounts.length === 0)

  return {
    user,
    error,
    isPageLoading,
    showMccStep,
    mccItems,
    standaloneAccounts,
    directAccounts,
    selectedMcc,
    selectMcc,
    clearSelection,
    handleAccountSelect,
  }
}

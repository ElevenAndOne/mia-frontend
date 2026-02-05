import { useEffect, useRef, useState } from 'react'
import { useMiaClient, type MccAccount } from '../../../sdk'

// Local type for backwards compatibility with snake_case properties
interface MccAccountLocal {
  customer_id: string
  descriptive_name: string
  account_count: number
  manager: boolean
  sub_account_ids?: string[]
}

interface UseMccSelectionParams {
  userId?: string | null
  sessionId?: string | null
}

// Map SDK MccAccount to local format
const mapMccAccount = (acc: MccAccount): MccAccountLocal => ({
  customer_id: acc.customerId,
  descriptive_name: acc.descriptiveName,
  account_count: acc.accountCount,
  manager: acc.isManager,
  sub_account_ids: acc.subAccountIds,
})

export const useMccSelection = ({ userId, sessionId }: UseMccSelectionParams) => {
  const mia = useMiaClient()
  const [mccAccounts, setMccAccounts] = useState<MccAccountLocal[]>([])
  const [selectedMcc, setSelectedMcc] = useState<string | null>(null)
  const [isFetchingMccs, setIsFetchingMccs] = useState(true)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (!userId) {
      setIsFetchingMccs(false)
      return
    }

    if (hasFetchedRef.current) return

    const load = async () => {
      try {
        setIsFetchingMccs(true)
        const { mccAccounts: accounts } = await mia.accounts.getMccAccounts(userId)
        setMccAccounts(accounts.map(mapMccAccount))
      } catch (err) {
        console.error('[ACCOUNT-SELECTION] Error fetching MCCs:', err)
      } finally {
        setIsFetchingMccs(false)
      }
    }

    hasFetchedRef.current = true
    load()
  }, [userId, mia])

  const selectMcc = async (mccId: string) => {
    setSelectedMcc(mccId)

    if (!sessionId) return

    try {
      await mia.session.selectMcc(mccId)
    } catch (err) {
      console.error('[ACCOUNT-SELECTION] Failed to store MCC selection', err)
    }
  }

  const clearSelection = () => {
    setSelectedMcc(null)
  }

  return {
    mccAccounts,
    selectedMcc,
    isFetchingMccs,
    selectMcc,
    clearSelection,
  }
}

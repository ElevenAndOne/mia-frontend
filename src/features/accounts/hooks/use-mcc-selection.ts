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
  const fetchedForUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    console.log('[MCC-SELECTION] Effect triggered, userId:', userId)

    if (!userId) {
      console.log('[MCC-SELECTION] No userId, skipping MCC fetch')
      setIsFetchingMccs(false)
      return
    }

    // Skip if we already fetched for this userId
    if (fetchedForUserIdRef.current === userId) {
      console.log('[MCC-SELECTION] Already fetched for this userId, skipping')
      return
    }

    const load = async () => {
      try {
        console.log('[MCC-SELECTION] Fetching MCC accounts for userId:', userId)
        setIsFetchingMccs(true)
        const { mccAccounts: accounts } = await mia.accounts.getMccAccounts(userId)
        console.log('[MCC-SELECTION] Fetched MCC accounts:', accounts.length)
        setMccAccounts(accounts.map(mapMccAccount))
      } catch (err) {
        console.error('[MCC-SELECTION] Error fetching MCCs:', err)
      } finally {
        setIsFetchingMccs(false)
      }
    }

    fetchedForUserIdRef.current = userId
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

import { useEffect, useRef, useState } from 'react'
import { fetchMccAccounts, selectMccAccount, type MccAccount } from '../services/mcc-service'

interface UseMccSelectionParams {
  userId?: string | null
  sessionId?: string | null
}

export const useMccSelection = ({ userId, sessionId }: UseMccSelectionParams) => {
  const [mccAccounts, setMccAccounts] = useState<MccAccount[]>([])
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
        const accounts = await fetchMccAccounts(userId)
        setMccAccounts(accounts)
      } catch (err) {
        console.error('[ACCOUNT-SELECTION] Error fetching MCCs:', err)
      } finally {
        setIsFetchingMccs(false)
      }
    }

    hasFetchedRef.current = true
    load()
  }, [userId])

  const selectMcc = async (mccId: string) => {
    setSelectedMcc(mccId)

    if (!sessionId) return

    try {
      await selectMccAccount(sessionId, mccId)
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

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../../contexts/toast-context'
import type { BrandGuideExtracted, MarketingContext, UploadResult } from '../types'
import {
  fetchMarketingContext,
  refreshPlatformSnapshot,
  saveBrandGuideExtraction,
  saveManualOverrides,
  uploadBrandGuide,
} from '../services/marketing-context-service'

export type UploadStep = 'idle' | 'uploading' | 'preview' | 'saving' | 'done'

export interface UseMarketingContextReturn {
  context: MarketingContext | null
  loading: boolean
  uploadStep: UploadStep
  uploadResult: UploadResult | null
  editedFields: Partial<BrandGuideExtracted>
  snapshotRefreshing: boolean
  // handlers
  handleFileSelect: (file: File) => Promise<void>
  handleFieldChange: (key: keyof BrandGuideExtracted, value: string | string[]) => void
  handleSaveExtraction: () => Promise<void>
  handleSaveOverrides: () => Promise<void>
  handleRefreshSnapshot: () => Promise<void>
  handleCancelUpload: () => void
}

export function useMarketingContext(sessionId: string | null): UseMarketingContextReturn {
  const { showToast } = useToast()
  const [context, setContext] = useState<MarketingContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [editedFields, setEditedFields] = useState<Partial<BrandGuideExtracted>>({})
  const [snapshotRefreshing, setSnapshotRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const data = await fetchMarketingContext(sessionId)
      setContext(data)
    } catch {
      // non-critical — context just won't show
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    load()
  }, [load])

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!sessionId) return
      setUploadStep('uploading')
      try {
        const result = await uploadBrandGuide(sessionId, file)
        setUploadResult(result)
        setEditedFields(result.extracted)
        setUploadStep('preview')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        showToast('error', msg)
        setUploadStep('idle')
      }
    },
    [sessionId, showToast]
  )

  const handleFieldChange = useCallback(
    (key: keyof BrandGuideExtracted, value: string | string[]) => {
      setEditedFields((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Strip empty strings from array fields before persisting
  const cleanFields = (fields: Partial<BrandGuideExtracted>): Partial<BrandGuideExtracted> => {
    const result = { ...fields }
    for (const key of Object.keys(result) as Array<keyof BrandGuideExtracted>) {
      const val = result[key]
      if (Array.isArray(val)) {
        (result as Record<string, unknown>)[key] = val.filter(Boolean)
      }
    }
    return result
  }

  const handleSaveExtraction = useCallback(async () => {
    if (!sessionId || !uploadResult) return
    setUploadStep('saving')
    try {
      await saveBrandGuideExtraction(
        sessionId,
        uploadResult.filename,
        uploadResult.brand_guide_raw,
        cleanFields(editedFields) as BrandGuideExtracted
      )
      showToast('success', 'Brand guide saved successfully')
      setUploadStep('done')
      setUploadResult(null)
      await load()
    } catch {
      showToast('error', 'Failed to save brand guide')
      setUploadStep('preview')
    }
  }, [sessionId, uploadResult, editedFields, showToast, load])

  const handleSaveOverrides = useCallback(async () => {
    if (!sessionId) return
    try {
      await saveManualOverrides(sessionId, cleanFields(editedFields))
      showToast('success', 'Changes saved')
      await load()
    } catch {
      showToast('error', 'Failed to save changes')
    }
  }, [sessionId, editedFields, showToast, load])

  const handleRefreshSnapshot = useCallback(async () => {
    if (!sessionId) return
    setSnapshotRefreshing(true)
    try {
      await refreshPlatformSnapshot(sessionId)
      showToast('success', 'Platform data refreshed')
      await load()
    } catch {
      showToast('error', 'Refresh failed — try again')
    } finally {
      setSnapshotRefreshing(false)
    }
  }, [sessionId, showToast, load])

  const handleCancelUpload = useCallback(() => {
    setUploadStep('idle')
    setUploadResult(null)
    setEditedFields({})
  }, [])

  return {
    context,
    loading,
    uploadStep,
    uploadResult,
    editedFields,
    snapshotRefreshing,
    handleFileSelect,
    handleFieldChange,
    handleSaveExtraction,
    handleSaveOverrides,
    handleRefreshSnapshot,
    handleCancelUpload,
  }
}

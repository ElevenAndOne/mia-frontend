import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../../contexts/toast-context'
import type { BrandGuideExtracted, MarketingContext, UploadResult } from '../types'
import {
  fetchMarketingContext,
  findCompetitors,
  generateBrandGuideFromWebsite,
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
  competitorSearching: boolean
  isGenerating: boolean
  generateHasExisting: boolean
  generateExistingFilename: string | null
  // handlers
  handleFileSelect: (file: File) => Promise<void>
  handleGenerateFromWebsite: (url: string) => Promise<void>
  handleFieldChange: (key: keyof BrandGuideExtracted, value: string | string[]) => void
  handleSaveExtraction: () => Promise<void>
  handleSaveOverrides: () => Promise<void>
  handleRefreshSnapshot: () => Promise<void>
  handleFindCompetitors: () => Promise<void>
  handleCancelUpload: () => void
}

export function useMarketingContext(
  sessionId: string | null,
  tenantId?: string | null
): UseMarketingContextReturn {
  const { showToast } = useToast()
  const [context, setContext] = useState<MarketingContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [editedFields, setEditedFields] = useState<Partial<BrandGuideExtracted>>({})
  const [snapshotRefreshing, setSnapshotRefreshing] = useState(false)
  const [competitorSearching, setCompetitorSearching] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateHasExisting, setGenerateHasExisting] = useState(false)
  const [generateExistingFilename, setGenerateExistingFilename] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const data = await fetchMarketingContext(sessionId, tenantId)
      setContext(data)
    } catch {
      // non-critical — context just won't show
    } finally {
      setLoading(false)
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    load()
  }, [load])

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!sessionId) return
      setUploadStep('uploading')
      try {
        const result = await uploadBrandGuide(sessionId, file, tenantId)
        setUploadResult(result)
        setEditedFields(result.extracted)
        setUploadStep('preview')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        showToast('error', msg)
        setUploadStep('idle')
      }
    },
    [sessionId, tenantId, showToast]
  )

  const handleGenerateFromWebsite = useCallback(
    async (url: string) => {
      if (!sessionId) return
      setIsGenerating(true)
      setUploadStep('uploading')
      try {
        const result = await generateBrandGuideFromWebsite(sessionId, url, tenantId)
        setUploadResult({ success: result.success, filename: result.filename, extracted: result.extracted, brand_guide_raw: result.brand_guide_raw })
        setEditedFields(result.extracted)
        setGenerateHasExisting(result.has_existing)
        setGenerateExistingFilename(result.existing_filename)
        setUploadStep('preview')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Generation failed'
        showToast('error', msg)
        setUploadStep('idle')
        setIsGenerating(false)
      }
    },
    [sessionId, tenantId, showToast]
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
        cleanFields(editedFields) as BrandGuideExtracted,
        tenantId
      )
      showToast('success', 'Brand guide saved successfully')
      setUploadStep('done')
      setUploadResult(null)
      setIsGenerating(false)
      setGenerateHasExisting(false)
      setGenerateExistingFilename(null)
      await load()
    } catch {
      showToast('error', 'Failed to save brand guide')
      setUploadStep('preview')
    }
  }, [sessionId, uploadResult, editedFields, showToast, load])

  const handleSaveOverrides = useCallback(async () => {
    if (!sessionId) return
    try {
      await saveManualOverrides(sessionId, cleanFields(editedFields), tenantId)
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

  const handleFindCompetitors = useCallback(async () => {
    if (!sessionId) return
    setCompetitorSearching(true)
    try {
      const competitors = await findCompetitors(sessionId, tenantId)
      if (competitors.length > 0) {
        await saveManualOverrides(sessionId, { competitors }, tenantId)
        await load()
        showToast('success', `Found ${competitors.length} competitors`)
      } else {
        showToast('error', 'No competitors found — try adding more brand details')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed'
      showToast('error', msg)
    } finally {
      setCompetitorSearching(false)
    }
  }, [sessionId, showToast, load])

  const handleCancelUpload = useCallback(() => {
    setUploadStep('idle')
    setUploadResult(null)
    setEditedFields({})
    setIsGenerating(false)
    setGenerateHasExisting(false)
    setGenerateExistingFilename(null)
  }, [])

  return {
    context,
    loading,
    uploadStep,
    uploadResult,
    editedFields,
    snapshotRefreshing,
    competitorSearching,
    isGenerating,
    generateHasExisting,
    generateExistingFilename,
    handleFileSelect,
    handleGenerateFromWebsite,
    handleFieldChange,
    handleSaveExtraction,
    handleSaveOverrides,
    handleRefreshSnapshot,
    handleFindCompetitors,
    handleCancelUpload,
  }
}

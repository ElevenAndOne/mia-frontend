import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../../contexts/toast-context'
import {
  deleteCampaignGuide,
  fetchCampaignGuides,
  saveCampaignGuide,
  uploadCampaignGuide,
} from '../services/campaign-guide-service'
import type { CampaignGuide, CampaignGuideExtracted, CampaignUploadResult } from '../types'

export type CampaignUploadStep = 'idle' | 'uploading' | 'preview' | 'saving'

export function useCampaignGuides(sessionId: string | null, tenantId?: string | null) {
  const { showToast } = useToast()
  const [guides, setGuides] = useState<CampaignGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadStep, setUploadStep] = useState<CampaignUploadStep>('idle')
  const [uploadResult, setUploadResult] = useState<CampaignUploadResult | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const data = await fetchCampaignGuides(sessionId, tenantId)
      setGuides(data)
    } catch {
      // non-critical
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
        const result = await uploadCampaignGuide(sessionId, file, tenantId)
        setUploadResult(result)
        setUploadStep('preview')
      } catch (err: unknown) {
        showToast('error', err instanceof Error ? err.message : 'Upload failed')
        setUploadStep('idle')
      }
    },
    [sessionId, tenantId, showToast]
  )

  const handleSave = useCallback(async () => {
    if (!sessionId || !uploadResult) return
    setUploadStep('saving')
    try {
      const saved = await saveCampaignGuide(
        sessionId,
        uploadResult.filename,
        uploadResult.raw_text,
        uploadResult.extracted,
        tenantId
      )
      setGuides((prev) => [saved, ...prev])
      showToast('success', 'Campaign guide saved')
      setUploadStep('idle')
      setUploadResult(null)
    } catch {
      showToast('error', 'Failed to save campaign guide')
      setUploadStep('preview')
    }
  }, [sessionId, tenantId, uploadResult, showToast])

  const handleCancel = useCallback(() => {
    setUploadStep('idle')
    setUploadResult(null)
  }, [])

  const handleDelete = useCallback(
    async (guideId: string) => {
      if (!sessionId) return
      setDeleting(guideId)
      try {
        await deleteCampaignGuide(sessionId, guideId, tenantId)
        setGuides((prev) => prev.filter((g) => g.id !== guideId))
        showToast('success', 'Campaign guide deleted')
      } catch {
        showToast('error', 'Failed to delete campaign guide')
      } finally {
        setDeleting(null)
      }
    },
    [sessionId, tenantId, showToast]
  )

  // Expose a way for the preview to update extracted fields (future edit support)
  const handleUpdateExtracted = useCallback(
    (updated: Partial<CampaignGuideExtracted>) => {
      if (!uploadResult) return
      setUploadResult((prev) =>
        prev ? { ...prev, extracted: { ...prev.extracted, ...updated } } : prev
      )
    },
    [uploadResult]
  )

  return {
    guides,
    loading,
    uploadStep,
    uploadResult,
    deleting,
    handleFileSelect,
    handleSave,
    handleCancel,
    handleDelete,
    handleUpdateExtracted,
  }
}

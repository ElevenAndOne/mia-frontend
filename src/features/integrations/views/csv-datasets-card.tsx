/**
 * CSV / Uploaded Datasets card for the Integrations page.
 *
 * Self-contained: renders the Extensions-style card AND its upload/manage modal, and
 * owns its own state + status (sidesteps the OAuth PlatformStatus plumbing, which is
 * provider-specific). "Connected" simply means the workspace has ≥1 uploaded dataset.
 *
 * Upload flow:
 *  - Drop/pick ONE file → stage it, edit its name (defaults to the filename), then Upload.
 *  - Drop/pick MANY files → staged as a batch, uploaded together (named by filename;
 *    rename any of them afterwards).
 *  - Each uploaded dataset's NAME is what shows in the list and to Mia; rename replaces it.
 *
 * Reads session/workspace from context; the backend derives the tenant from the session.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { Spinner } from '../../../components/spinner'
import { ConfirmDialog } from '../../../components/confirm-dialog'
import {
  listDatasets,
  uploadDataset,
  updateDataset,
  deleteDataset,
  type UploadedDataset,
} from '../services/dataset-service'

const _CSV_ICON = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 4.5A1.5 1.5 0 015.5 3h8l6 6v10.5A1.5 1.5 0 0118 21H5.5A1.5 1.5 0 014 19.5v-15z"
      stroke="#10B981"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M13 3v6h6" stroke="#10B981" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M7.5 13h9M7.5 16h9" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

function _isCsv(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type.includes('csv')
  )
}

function _stripExt(filename: string): string {
  return filename.replace(/\.csv$/i, '')
}

export function CsvDatasetsCard() {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()

  const [datasets, setDatasets] = useState<UploadedDataset[]>([])
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Staging (files picked but not yet uploaded)
  const [staged, setStaged] = useState<File[]>([])
  const [stagedName, setStagedName] = useState('')

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    try {
      setDatasets(await listDatasets(sessionId))
    } catch {
      // Non-fatal: an empty/failed list just shows the upload prompt.
    }
  }, [sessionId])

  useEffect(() => {
    if (activeWorkspace) void refresh()
  }, [activeWorkspace, refresh])

  const pickFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = Array.from(list).filter(_isCsv)
    if (files.length === 0) {
      setError('Please choose .csv file(s).')
      return
    }
    setError('')
    setStaged(files)
    if (files.length === 1) setStagedName(_stripExt(files[0].name))
  }, [])

  const clearStaged = useCallback(() => {
    setStaged([])
    setStagedName('')
  }, [])

  const uploadStaged = useCallback(async () => {
    if (!sessionId || staged.length === 0) return
    const single = staged.length === 1
    setUploading(true)
    setError('')
    try {
      for (const file of staged) {
        // Single file → the name the user typed; batch → each filename (extension stripped).
        const ds = await uploadDataset(sessionId, file, {
          name: single ? stagedName.trim() || undefined : _stripExt(file.name),
        })
        setDatasets((prev) => [ds, ...prev.filter((d) => d.dataset_id !== ds.dataset_id)])
      }
      showToast(
        'success',
        single ? `Uploaded "${stagedName.trim() || staged[0].name}"` : `Uploaded ${staged.length} datasets`
      )
      clearStaged()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setError(msg)
      showToast('error', msg)
    } finally {
      setUploading(false)
    }
  }, [sessionId, staged, stagedName, showToast, clearStaged])

  const startEdit = useCallback((d: UploadedDataset) => {
    setEditingId(d.dataset_id)
    setEditName(d.name)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!sessionId || !editingId) return
    const name = editName.trim()
    if (!name) {
      setError('Name cannot be empty.')
      return
    }
    try {
      const updated = await updateDataset(sessionId, editingId, { name })
      setDatasets((prev) => prev.map((d) => (d.dataset_id === updated.dataset_id ? updated : d)))
      setEditingId(null)
      showToast('success', 'Dataset renamed')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to rename dataset')
    }
  }, [sessionId, editingId, editName, showToast])

  const handleDelete = useCallback(
    async (datasetId: string) => {
      if (!sessionId) return
      try {
        await deleteDataset(sessionId, datasetId)
        setDatasets((prev) => prev.filter((d) => d.dataset_id !== datasetId))
        showToast('success', 'Dataset removed')
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Failed to remove dataset')
      }
    },
    [sessionId, showToast]
  )

  const hasDatasets = datasets.length > 0
  const closeModal = () => {
    setOpen(false)
    clearStaged()
    setEditingId(null)
    setError('')
  }

  return (
    <>
      {/* Card */}
      <div className="bg-primary border border-secondary rounded-xl p-3 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg bg-[#10B981]/10">
              {_CSV_ICON}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2">
                <h3 className="subheading-md text-primary truncate">Uploaded Data (CSV)</h3>
                {hasDatasets && (
                  <span className="px-1.5 py-0.5 rounded-full label-xs bg-utility-success-100 text-utility-success-700 border border-utility-success-200 shrink-0">
                    {datasets.length} dataset{datasets.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="paragraph-xs text-quaternary truncate">
                Upload CSV exports from any tool — Mia analyzes them in chat
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setError('')
              clearStaged()
              setOpen(true)
            }}
            className="px-4 py-2 rounded-lg subheading-sm shrink-0 bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover"
          >
            {hasDatasets ? 'Manage' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-overlay/40 flex items-center justify-center z-50 px-4">
          <div className="bg-primary rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#10B981]/10 shrink-0">
                  {_CSV_ICON}
                </div>
                <h2 className="title-h6 text-primary">Uploaded Data (CSV)</h2>
              </div>
              <p className="paragraph-sm text-tertiary">
                Upload CSV exports from tools Mia isn't directly connected to (a CRM, an email
                platform, anything tabular). Then ask Mia about them in chat — it queries the data
                and gives you insights.
              </p>
            </div>

            {/* Upload area: uploading → staging → dropzone */}
            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-secondary rounded-xl border-2 border-dashed border-tertiary mb-4">
                <Spinner />
                <p className="paragraph-sm">Uploading &amp; profiling…</p>
              </div>
            ) : staged.length > 0 ? (
              <div className="rounded-xl border border-secondary bg-secondary p-4 mb-4">
                {staged.length === 1 ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block subheading-md text-secondary mb-1">Name</label>
                      <input
                        type="text"
                        value={stagedName}
                        onChange={(e) => setStagedName(e.target.value)}
                        placeholder="e.g. Brevo campaigns"
                        className="w-full px-4 py-2.5 border border-primary rounded-lg focus:ring-2 focus:ring-utility-info-500 focus:border-transparent paragraph-sm bg-primary"
                      />
                    </div>
                    <p className="paragraph-xs text-quaternary truncate">File: {staged[0].name}</p>
                  </div>
                ) : (
                  <div>
                    <p className="subheading-md text-secondary mb-2">
                      {staged.length} files ready to upload
                    </p>
                    <ul className="space-y-1 mb-1">
                      {staged.map((f, i) => (
                        <li key={i} className="paragraph-xs text-tertiary truncate">
                          • {f.name}
                        </li>
                      ))}
                    </ul>
                    <p className="paragraph-xs text-quaternary">
                      Each is named by its filename — rename any after upload.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={clearStaged}
                    className="flex-1 px-4 py-2.5 border border-primary rounded-lg subheading-sm text-secondary hover:bg-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={uploadStaged}
                    disabled={staged.length === 1 && !stagedName.trim()}
                    className="flex-1 px-4 py-2.5 bg-brand-solid text-primary-onbrand rounded-lg subheading-sm hover:bg-brand-solid-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {staged.length === 1 ? 'Upload' : `Upload ${staged.length}`}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-tertiary p-8 text-center transition-colors hover:border-brand-solid hover:bg-secondary cursor-pointer mb-4"
                onDrop={(e) => {
                  e.preventDefault()
                  pickFiles(e.dataTransfer.files)
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    pickFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="subheading-md text-primary">Add CSV file(s)</p>
                  <p className="paragraph-sm text-secondary mt-1">
                    Drag and drop one or more, or click to browse
                  </p>
                </div>
              </div>
            )}

            {error && <p className="paragraph-xs text-error mb-3">{error}</p>}

            {/* Existing datasets */}
            {datasets.length > 0 && (
              <div className="mb-4">
                <h3 className="subheading-md text-secondary mb-2">Your datasets</h3>
                <div className="space-y-2">
                  {datasets.map((d) =>
                    editingId === d.dataset_id ? (
                      <div key={d.dataset_id} className="bg-secondary border border-secondary rounded-lg p-3 space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="w-full px-3 py-2 border border-primary rounded-lg paragraph-sm bg-primary"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 px-3 py-1.5 border border-primary rounded-lg label-sm text-secondary hover:bg-primary"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={!editName.trim()}
                            className="flex-1 px-3 py-1.5 bg-brand-solid text-primary-onbrand rounded-lg label-sm hover:bg-brand-solid-hover disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={d.dataset_id}
                        className="flex items-center justify-between gap-3 bg-secondary border border-secondary rounded-lg p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="subheading-sm text-primary truncate">{d.name}</p>
                          <p className="paragraph-xs text-quaternary truncate">
                            {d.row_count.toLocaleString()} rows · {d.column_count} columns
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(d)}
                            className="px-3 py-1.5 rounded-lg label-sm text-secondary hover:bg-primary"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(d.dataset_id)}
                            className="px-3 py-1.5 rounded-lg label-sm text-error hover:bg-error-primary"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={uploading}
                className="flex-1 px-4 py-3 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        message="Remove this dataset? Mia will no longer be able to analyze it."
        confirmLabel="Remove"
        onConfirm={() => {
          const id = pendingDeleteId
          setPendingDeleteId(null)
          if (id) void handleDelete(id)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  )
}

export default CsvDatasetsCard

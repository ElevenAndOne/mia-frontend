import { useState } from 'react'
import { Modal } from '../../overlay'
import { FEEDBACK_CATEGORIES } from '../services/chat-service'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the optional category/details when the user hits Submit. The -1
   *  rating is already recorded before this modal opens — dismissing loses nothing. */
  onSubmit: (category: string | undefined, details: string | undefined) => void
}

/** Thumbs-down detail dialog (Claude-style): optional issue category + free text.
 *  Everything is optional — the vote itself was captured on the thumb click. */
export const FeedbackModal = ({ isOpen, onClose, onSubmit }: FeedbackModalProps) => {
  const [category, setCategory] = useState('')
  const [details, setDetails] = useState('')

  const handleSubmit = () => {
    onSubmit(category || undefined, details.trim() || undefined)
    setCategory('')
    setDetails('')
  }

  const handleClose = () => {
    setCategory('')
    setDetails('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit feedback" size="md">
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-col gap-1.5">
          <label className="paragraph-xs text-secondary">What type of issue? (optional)</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-secondary text-primary paragraph-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-brand-primary"
          >
            <option value="">Select an issue…</option>
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="paragraph-xs text-secondary">Please provide details: (optional)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="What went wrong, or what did you expect instead?"
            className="w-full bg-secondary text-primary paragraph-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-brand-primary resize-none"
          />
        </div>

        <p className="paragraph-xs text-quaternary">
          Submitting shares this conversation with the Mia team so we can fix issues and
          improve responses.
        </p>

        <button
          onClick={handleSubmit}
          className="w-full py-2.5 rounded-lg bg-brand-primary text-white paragraph-sm font-medium hover:opacity-90 transition-opacity"
        >
          Submit feedback
        </button>
      </div>
    </Modal>
  )
}

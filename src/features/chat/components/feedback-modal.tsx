import { useState } from 'react'
import { Modal } from '../../overlay'
import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORIES_UP } from '../services/chat-service'

interface FeedbackModalProps {
  isOpen: boolean
  /** Which way the message was voted. Decides the wording and the category list. */
  rating: 1 | -1
  onClose: () => void
  /** Called with the optional category/details when the user hits Submit. The vote itself
   *  is already recorded before this modal opens, so dismissing loses nothing. */
  onSubmit: (category: string | undefined, details: string | undefined) => void
}

/** Detail dialog for a thumbs vote (Claude-style): optional category + free text.
 *
 *  Both votes open it. Asking only on a thumbs down meant every report could list what was
 *  broken and nothing that worked (Megan, 2026-09-18), so a thumbs up now asks what went
 *  right. Everything is optional: the vote was captured on the thumb click. */
export const FeedbackModal = ({ isOpen, rating, onClose, onSubmit }: FeedbackModalProps) => {
  const [category, setCategory] = useState('')
  const [details, setDetails] = useState('')

  const positive = rating === 1
  const categories = positive ? FEEDBACK_CATEGORIES_UP : FEEDBACK_CATEGORIES
  const copy = positive
    ? {
        title: 'What went right?',
        categoryLabel: 'What worked well? (optional)',
        placeholderOption: 'Select what worked…',
        detailsLabel: 'Anything else? (optional)',
        detailsPlaceholder: 'What made this one good?',
        submit: 'Send feedback',
      }
    : {
        title: 'Submit feedback',
        categoryLabel: 'What type of issue? (optional)',
        placeholderOption: 'Select an issue…',
        detailsLabel: 'Please provide details: (optional)',
        detailsPlaceholder: 'What went wrong, or what did you expect instead?',
        submit: 'Submit feedback',
      }

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
    <Modal isOpen={isOpen} onClose={handleClose} title={copy.title} size="md">
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-col gap-1.5">
          <label className="paragraph-xs text-secondary">{copy.categoryLabel}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-secondary text-primary paragraph-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-brand-primary"
          >
            <option value="">{copy.placeholderOption}</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="paragraph-xs text-secondary">{copy.detailsLabel}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={copy.detailsPlaceholder}
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
          {copy.submit}
        </button>
      </div>
    </Modal>
  )
}

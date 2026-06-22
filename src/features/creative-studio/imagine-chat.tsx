import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type WheelEvent,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
} from 'react'
import {
  Send, Loader2, Link2, RefreshCw, Image as ImageIcon, ThumbsUp, ThumbsDown,
  Sparkles, Layers, Check, X, Palette, Type, Target, Maximize2, Pencil, History, Plus, UploadCloud,
} from 'lucide-react'
import { sendChatMessageStreaming } from '../chat/services/chat-service'
import { figmaDnaApi, miaCreateApi, type DnaSummary, type MiaAsset, type PageFrame } from './creative-studio-api'

interface Props {
  tenantId: string
  sessionId: string
  variantSeed?: { prompt: string; imageUrl: string } | null
  onClearVariantSeed?: () => void
}

type Destination = 'designer_hero' | 'meta_feed'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Generated assets discovered after this assistant turn (filled by polling). */
  assets?: MiaAsset[]
  streaming?: boolean
}

const FEEDBACK_TAGS = ['colour', 'layout', 'voice', 'composition'] as const

// Streaming reveal cadence — same mechanism as chat v2: text accumulates in a ref instantly and
// a fixed interval drip-feeds it to display state, decoupling bursty network chunks from render.
const REVEAL_INTERVAL_MS = 40 // ~25 ticks/sec
const CHARS_PER_TICK = 5 // ~125 chars/sec

let _idSeq = 0
const nextId = () => `m${++_idSeq}_${Date.now()}`

// One saved conversation in the per-workspace history (localStorage). The "current" thread is
// just the active entry; "New chat" starts a new one without deleting the others.
interface Conversation {
  id: string
  title: string
  savedAt: number
  messages: ChatMsg[]
  fileInput: string
  dna: DnaSummary | null
  selectedPage: string
}

const deriveTitle = (msgs: ChatMsg[]): string => {
  const firstUser = msgs.find(m => m.role === 'user')
  const t = (firstUser?.content || '').trim()
  return t ? (t.length > 44 ? t.slice(0, 44) + '…' : t) : 'New chat'
}

const relTime = (ms: number): string => {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ── Per-asset feedback control (§6.7) ───────────────────────────────────────────
function AssetFeedback({
  asset, tenantId, sessionId,
}: { asset: MiaAsset; tenantId: string; sessionId: string }) {
  const [rating, setRating] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleTag = (t: string) =>
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))

  // Selecting a rating no longer submits — the user can add tags/a note in any order, then Save.
  const setRatingToggle = (r: number) => setRating(prev => (prev === r ? null : r))
  const dirty = rating != null || tags.length > 0 || note.trim().length > 0

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    await miaCreateApi.submitFeedback(sessionId, tenantId, {
      asset_id: asset.asset_id,
      job_id: asset.job_id ?? undefined,
      rating: rating ?? undefined,
      tags,
      note: note.trim() || undefined,
    })
    setSaving(false)
    setSavedAt(Date.now())
  }

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRatingToggle(5)}
          className={`p-1 rounded ${rating === 5 ? 'bg-emerald-500/30 text-emerald-300' : 'text-slate-400 hover:text-emerald-300'}`}
          title="On-brand / usable"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setRatingToggle(1)}
          className={`p-1 rounded ${rating === 1 ? 'bg-red-500/30 text-red-300' : 'text-slate-400 hover:text-red-300'}`}
          title="Off-brand / unusable"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-[11px] text-slate-500 hover:text-slate-300"
        >
          {open ? 'hide' : 'add note'}
        </button>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="text-[11px] px-2 py-0.5 rounded bg-purple-600/40 hover:bg-purple-600/60 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : savedAt ? 'Update' : 'Save'}
          </button>
        )}
        {savedAt && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <Check className="w-3 h-3" /> saved
          </span>
        )}
      </div>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_TAGS.map(t => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  tags.includes(t)
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="one-line note…"
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white placeholder-slate-500"
          />
        </div>
      )}
    </div>
  )
}

// ── Inline generated-asset card ─────────────────────────────────────────────────
function AssetCard({
  asset, tenantId, sessionId, onZoom, isEditTarget, onPickTarget,
}: {
  asset: MiaAsset
  tenantId: string
  sessionId: string
  onZoom: (url: string) => void
  isEditTarget: boolean
  onPickTarget: (a: MiaAsset) => void
}) {
  return (
    <div
      className={`relative bg-slate-900/70 border rounded-lg overflow-hidden ${
        isEditTarget ? 'border-purple-400 ring-2 ring-purple-400/60' : 'border-slate-700'
      }`}
    >
      {asset.ratio && (
        <span className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-semibold text-white">
          {asset.ratio}
        </span>
      )}
      {asset.selected && !asset.ratio && (
        <span className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-emerald-500/80 text-[10px] font-semibold text-white flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> pick
        </span>
      )}
      {isEditTarget && (
        <span className="absolute bottom-[52px] left-1 z-10 px-1.5 py-0.5 rounded bg-purple-500/90 text-[10px] font-semibold text-white">
          editing
        </span>
      )}
      <div className="relative group">
        <img src={asset.cdn_url} alt={asset.prompt || 'generated'} className="w-full aspect-square object-cover" />
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPickTarget(asset)}
            title={isEditTarget ? 'Editing this image' : 'Edit this image (your next message edits it)'}
            className={`p-1 rounded ${isEditTarget ? 'bg-purple-500/80' : 'bg-slate-950/60 hover:bg-purple-500/60'}`}
          >
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={() => onZoom(asset.cdn_url)}
            className="p-1 rounded bg-slate-950/60"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
      <div className="p-2">
        {asset.vision_score && (
          <div className="text-[10px] text-slate-400 mb-1">
            on-brand {asset.vision_score.on_brand}/10 · overall {asset.vision_score.overall}/10
          </div>
        )}
        <AssetFeedback asset={asset} tenantId={tenantId} sessionId={sessionId} />
      </div>
    </div>
  )
}

export default function ImagineChat({ tenantId, sessionId, variantSeed, onClearVariantSeed }: Props) {
  // Per-workspace conversation history in localStorage. The current thread is the active entry;
  // "New chat" starts a fresh one and the old ones stay switchable from the History dropdown.
  const HISTORY_KEY = `mia-create-history:${tenantId}`
  const ACTIVE_KEY = `mia-create-active:${tenantId}`
  const init = useMemo(() => {
    let hist: Conversation[] = []
    try {
      hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    } catch {
      hist = []
    }
    let aId = ''
    try {
      aId = localStorage.getItem(ACTIVE_KEY) || ''
    } catch {
      aId = ''
    }
    const active = hist.find(c => c.id === aId) || hist[0] || null
    return { hist, activeId: active?.id || nextId(), active }
  }, [HISTORY_KEY, ACTIVE_KEY])

  const [history, setHistory] = useState<Conversation[]>(init.hist)
  const [activeId, setActiveId] = useState<string>(init.activeId)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [messages, setMessages] = useState<ChatMsg[]>(init.active?.messages || [])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Brand source / DNA
  const [fileInput, setFileInput] = useState(init.active?.fileInput || '')
  const [dna, setDna] = useState<DnaSummary | null>(init.active?.dna || null)
  const [dnaLoading, setDnaLoading] = useState(false)
  const [dnaError, setDnaError] = useState<string | null>(null)
  const [selectedPage, setSelectedPage] = useState<string>(init.active?.selectedPage || '')

  // Reference-frame picker: thumbnails of the selected page's frames; the user picks which one
  // is the visual reference (replaces the backend's blind first-frame pick). selectedRefNode:
  // null = auto (first frame), 'palette' = no reference (palette/DNA only), else a node_id.
  const [pageFrames, setPageFrames] = useState<PageFrame[]>([])
  const [framesLoading, setFramesLoading] = useState(false)
  const [selectedRefNode, setSelectedRefNode] = useState<string | null>(null)

  // Generation controls
  const [destination, setDestination] = useState<Destination>('designer_hero')
  const [numVariants, setNumVariants] = useState(1)
  const [aspectRatio, setAspectRatio] = useState('1:1')

  const [zoom, setZoom] = useState<string | null>(null)
  // The image the user pinned as the edit target (overrides "most recent" for the next edit).
  const [editTarget, setEditTarget] = useState<{ assetId: string; url: string } | null>(null)

  const knownAssetIds = useRef<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollTimers = useRef<number[]>([])
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Placement set (resize one image into multiple sizes; headline composited per-size).
  const [placeSizes, setPlaceSizes] = useState<string[]>(['1:1', '4:5', '9:16', '16:9'])
  const [placeHeadline, setPlaceHeadline] = useState('')
  const [placeColor, setPlaceColor] = useState('#FFFFFF')
  const [makingSet, setMakingSet] = useState(false)

  // Smooth streaming reveal (chat v2 mechanism): chunks land in receivedRef instantly; a 40ms
  // interval drips CHARS_PER_TICK chars into the streaming message — no choppy per-chunk setState.
  const receivedRef = useRef('')
  const displayIndexRef = useRef(0)
  const streamDoneRef = useRef(false)
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll only while the user is parked at the bottom. Any upward intent (wheel-up or an
  // upward scroll delta) pauses following; returning to the bottom resumes it. Prevents the
  // reveal tick from yanking the view down while the user scrolls up to read.
  const shouldAutoScrollRef = useRef(true)
  const prevScrollTopRef = useRef(0)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    const goingUp = el.scrollTop < prevScrollTopRef.current - 1
    if (goingUp) shouldAutoScrollRef.current = false
    else if (atBottom) shouldAutoScrollRef.current = true
    prevScrollTopRef.current = el.scrollTop
  }, [])
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0) shouldAutoScrollRef.current = false
  }, [])
  const scrollToBottomIfFollowing = () => {
    if (shouldAutoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  // Prefill from Library "Create Variant".
  useEffect(() => {
    if (variantSeed?.prompt) {
      setInput(`Make a variation of this: ${variantSeed.prompt}`)
      onClearVariantSeed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantSeed])

  // Follow new content only while the user is parked at the bottom (not when they've scrolled up).
  useEffect(() => {
    scrollToBottomIfFollowing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // Hydrate the de-dupe set from the active conversation's images so polling doesn't re-attach them.
  useEffect(() => {
    ;(init.active?.messages || []).forEach(m =>
      (m.assets || []).forEach(a => knownAssetIds.current.add(a.asset_id)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Upsert the active conversation into history whenever the working state changes (functional
  // update so this effect doesn't depend on `history` and loop). Only save a conversation once it
  // has produced at least one generated image — keeps blank "New chat" sessions out of history —
  // and prune any pre-existing blank entries on the way.
  useEffect(() => {
    const hasImage = (msgs: ChatMsg[]) => msgs.some(m => (m.assets?.length ?? 0) > 0)
    setHistory(prev => {
      const others = prev.filter(c => c.id !== activeId && hasImage(c.messages || []))
      if (!hasImage(messages)) return others
      const entry: Conversation = {
        id: activeId,
        title: deriveTitle(messages),
        savedAt: Date.now(),
        messages: messages.map(m => ({ ...m, streaming: false })),
        fileInput,
        dna,
        selectedPage,
      }
      return [entry, ...others]
    })
  }, [activeId, messages, fileInput, dna, selectedPage])

  // Persist the history list + active id (cap to 30 recent conversations).
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)))
      localStorage.setItem(ACTIVE_KEY, activeId)
    } catch {
      /* quota / serialization — non-fatal */
    }
  }, [HISTORY_KEY, ACTIVE_KEY, history, activeId])

  const newChat = () => {
    setActiveId(nextId()) // current one is already saved in history via the effect above
    setMessages([])
    setEditTarget(null)
    knownAssetIds.current.clear()
    setHistoryOpen(false)
    // Brand source (fileInput/dna/selectedPage) intentionally carries over to the new chat.
  }

  const switchConversation = (id: string) => {
    setHistoryOpen(false)
    if (id === activeId) return
    const c = history.find(x => x.id === id)
    if (!c) return
    setActiveId(id)
    setMessages(c.messages || [])
    setFileInput(c.fileInput || '')
    setDna(c.dna || null)
    setSelectedPage(c.selectedPage || '')
    setEditTarget(null)
    knownAssetIds.current = new Set(
      (c.messages || []).flatMap(m => (m.assets || []).map(a => a.asset_id)),
    )
  }

  const deleteConversation = (id: string, e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setHistory(prev => prev.filter(c => c.id !== id))
    if (id === activeId) newChat()
  }

  useEffect(
    () => () => {
      pollTimers.current.forEach(clearTimeout)
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
    },
    [],
  )

  const linkBrandSource = async () => {
    const ref = fileInput.trim()
    if (!ref) return
    setDnaLoading(true)
    setDnaError(null)
    try {
      const summary = await figmaDnaApi.extract(sessionId, tenantId, ref)
      setDna(summary)
      setSelectedPage('')
    } catch (e) {
      setDnaError(e instanceof Error ? e.message : 'Could not read that Figma file')
    } finally {
      setDnaLoading(false)
    }
  }

  const refreshDna = async () => {
    if (!dna) return
    setDnaLoading(true)
    try {
      const summary = await figmaDnaApi.refresh(sessionId, tenantId, dna.file_key)
      setDna(summary)
    } catch (e) {
      setDnaError(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setDnaLoading(false)
    }
  }

  // Poll for newly generated assets after an assistant turn and attach them to that message.
  const pollForAssets = useCallback(
    (targetMsgId: string, sinceIso: string, autoPin = false) => {
      let ticks = 0
      let idleTicks = 0
      let foundThisTurn = 0 // assets attached for THIS turn (not the global known set)
      const tick = async () => {
        ticks += 1
        try {
          const { assets } = await miaCreateApi.listAssets(sessionId, tenantId, undefined, 30)
          const fresh = assets.filter(
            a => a.created_at && a.created_at > sinceIso,
          )
          const newOnes = fresh.filter(a => !knownAssetIds.current.has(a.asset_id))
          newOnes.forEach(a => knownAssetIds.current.add(a.asset_id))
          foundThisTurn += newOnes.length

          // After an edit, advance the pin to the result so consecutive edits chain naturally.
          if (autoPin && newOnes.length) {
            const newest = newOnes.reduce((a, b) =>
              (a.created_at || '') > (b.created_at || '') ? a : b,
            )
            if (newest.cdn_url) setEditTarget({ assetId: newest.asset_id, url: newest.cdn_url })
          }

          if (fresh.length) {
            // Merge: attach fresh assets to the target message, updating in place so
            // late-arriving Vision scores / selection flags refresh.
            setMessages(prev =>
              prev.map(m => {
                if (m.id !== targetMsgId) return m
                const byId = new Map((m.assets || []).map(a => [a.asset_id, a]))
                fresh.forEach(a => byId.set(a.asset_id, a))
                return { ...m, assets: Array.from(byId.values()) }
              }),
            )
          }
          idleTicks = newOnes.length ? 0 : idleTicks + 1
        } catch {
          idleTicks += 1
        }
        // Keep polling up to ~2.5min. Stop early ONLY once THIS turn has produced an image and
        // then gone idle — not based on the global known-asset set (which is non-empty after the
        // first generation, and previously caused later turns to give up before their job landed).
        if (ticks < 50 && !(foundThisTurn > 0 && idleTicks >= 6)) {
          pollTimers.current.push(window.setTimeout(tick, 3000))
        }
      }
      pollTimers.current.push(window.setTimeout(tick, 2500))
    },
    [sessionId, tenantId],
  )

  // Load the selected page's frames as reference thumbnails; reset the pick when the page changes.
  useEffect(() => {
    setSelectedRefNode(null)
    setPageFrames([])
    if (!dna?.file_key || !selectedPage) return
    let cancelled = false
    setFramesLoading(true)
    figmaDnaApi
      .listPageFrames(sessionId, tenantId, dna.file_key, selectedPage)
      .then(r => { if (!cancelled) setPageFrames(r.frames || []) })
      .catch(() => { if (!cancelled) setPageFrames([]) })
      .finally(() => { if (!cancelled) setFramesLoading(false) })
    return () => { cancelled = true }
  }, [dna?.file_key, selectedPage, sessionId, tenantId])

  const buildHint = (): string => {
    // This is a creative-only surface: steer Mia to generate the image via Mia Create rather
    // than route the message into campaign/copy planning. The user's visible bubble stays clean.
    const bits: string[] = []
    if (dna?.file_key) bits.push(`brand source: Figma file ${dna.file_key}`)
    if (selectedPage) bits.push(`page "${selectedPage}"`)
    bits.push(`variants: ${numVariants}`)
    bits.push(`aspect ratio: ${aspectRatio}`)
    bits.push(`destination: ${destination}`)
    // A pinned edit target takes precedence: edit THAT image, ignore page styling for this turn.
    if (editTarget) {
      return (
        `\n\n[Use Mia Create to EDIT the user's pinned image by calling generate_creative with ` +
        `reference_asset_id="${editTarget.assetId}" (edit target: asset ${editTarget.assetId}). ` +
        `Keep that image and apply only the requested change. Do NOT set use_page_reference. ` +
        `Do NOT write a campaign brief or save a campaign. Settings — ${bits.join(', ')}.]`
      )
    }
    // Selecting a page IS the intent to base the look on it — instruct deterministically so the
    // user doesn't have to also say "base on the Emailers page". The frame-picker refines which
    // reference is used: a specific frame, or "palette only" (no visual reference).
    let pageRefNudge = ''
    if (selectedRefNode === 'palette') {
      pageRefNudge = ` The user chose PALETTE ONLY — set use_page_reference=false (no visual reference frame); still use page="${selectedPage}" for voice/palette.`
    } else if (selectedRefNode) {
      pageRefNudge = ` The user picked a specific reference frame — set use_page_reference=true, page="${selectedPage}", and reference_node_id="${selectedRefNode}" so the output matches THAT frame's look.`
    } else if (selectedPage) {
      pageRefNudge = ` The "${selectedPage}" page is selected as the brand reference — set use_page_reference=true and page="${selectedPage}" so the output matches that page's look.`
    }
    return (
      `\n\n[Use Mia Create to GENERATE the image(s) now by calling the generate_creative tool. ` +
      `Do NOT write a campaign brief, a strategy plan, or save a campaign.${pageRefNudge} ` +
      `Pass aspect_ratio="${aspectRatio}". ` +
      `Settings — ${bits.join(', ')}.]`
    )
  }

  const send = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    const hint = buildHint()
    const wasEdit = !!editTarget // editing a pinned image → advance the pin to the result
    const userMsg: ChatMsg = { id: nextId(), role: 'user', content: text }
    const asstId = nextId()
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg, { id: asstId, role: 'assistant', content: '', streaming: true }])
    setInput('')
    setIsStreaming(true)
    shouldAutoScrollRef.current = true // follow the fresh reply

    // Reset the reveal buffer and start the steady drip (independent of chunk arrival).
    receivedRef.current = ''
    displayIndexRef.current = 0
    streamDoneRef.current = false
    if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
    revealIntervalRef.current = setInterval(() => {
      const remaining = receivedRef.current.length - displayIndexRef.current
      if (remaining > 0) {
        displayIndexRef.current += Math.min(CHARS_PER_TICK, remaining)
        const shown = receivedRef.current.slice(0, displayIndexRef.current)
        setMessages(prev => prev.map(m => (m.id === asstId ? { ...m, content: shown } : m)))
        scrollToBottomIfFollowing()
      } else if (streamDoneRef.current) {
        // Caught up and the stream is done — finalize this message and stop the drip.
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
        revealIntervalRef.current = null
        setMessages(prev =>
          prev.map(m => (m.id === asstId ? { ...m, content: receivedRef.current, streaming: false } : m)),
        )
      }
    }, REVEAL_INTERVAL_MS)

    const turnStart = new Date().toISOString()
    try {
      await sendChatMessageStreaming(
        {
          message: text + hint,
          session_id: sessionId,
          user_id: '',
          date_range: 'last_30_days',
          selected_platforms: ['figma'],
          conversation_history: history,
        },
        chunk => {
          // Accumulate only — the interval reveals it. No per-chunk setState (that was the choppiness).
          if (chunk.error) receivedRef.current += `\n\n⚠️ ${chunk.error}`
          if (chunk.text) receivedRef.current += chunk.text
        },
      )
    } catch (e) {
      receivedRef.current += `\n\n⚠️ ${e instanceof Error ? e.message : 'Something went wrong'}`
    } finally {
      streamDoneRef.current = true
      setIsStreaming(false)
      // Generation runs in the background after the turn — poll for the resulting images.
      // On an edit, auto-advance the pin to the result so the next edit chains off it.
      pollForAssets(asstId, turnStart, wasEdit)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Upload a user image to use as a reference/edit source → pin it as the edit target so the
  // next message edits/generates off it (routes to the faithful edit model).
  const uploadFile = async (f: File) => {
    if (!f.type.startsWith('image/')) {
      setMessages(prev => [
        ...prev,
        { id: nextId(), role: 'assistant', content: '⚠️ Please upload an image file.' },
      ])
      return
    }
    setUploading(true)
    try {
      const { asset_id, cdn_url } = await miaCreateApi.uploadReference(sessionId, tenantId, f)
      knownAssetIds.current.add(asset_id) // don't let polling re-attach the upload as a "result"
      setEditTarget({ assetId: asset_id, url: cdn_url })
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: `⚠️ ${err instanceof Error ? err.message : 'Upload failed'}`,
        },
      ])
    } finally {
      setUploading(false)
    }
  }
  const onUploadInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (uploadInputRef.current) uploadInputRef.current.value = ''
    if (f) uploadFile(f)
  }
  const onDropImage = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) uploadFile(f)
  }

  // Resize the pinned (or most recent) image into the selected placement sizes; the result lands
  // as an assistant message in the thread. Headline (if any) is composited per-size on the backend.
  const runPlacementSet = async () => {
    if (makingSet || placeSizes.length === 0) return
    setMakingSet(true)
    try {
      const { assets } = await miaCreateApi.makePlacementSet(sessionId, tenantId, {
        asset_id: editTarget?.assetId,
        sizes: placeSizes,
        headline: placeHeadline.trim() || undefined,
        text_color: placeColor,
      })
      assets.forEach(a => knownAssetIds.current.add(a.asset_id))
      setMessages(prev => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: `Placement set — ${assets.map(a => a.ratio).join(', ')}${
            placeHeadline.trim() ? ' (headline composited per size)' : ''
          }.`,
          assets,
        },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: `⚠️ ${err instanceof Error ? err.message : 'Placement set failed'}`,
        },
      ])
    } finally {
      setMakingSet(false)
    }
  }
  const toggleSize = (s: string) =>
    setPlaceSizes(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]))

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
      {/* ── Brand Source ───────────────────────────────────────── */}
      <div className="col-span-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-auto">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-purple-400" /> Brand Source
        </h3>
        <div className="flex gap-2">
          <input
            value={fileInput}
            onChange={e => setFileInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && linkBrandSource()}
            placeholder="Paste a Figma file link…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500"
          />
          <button
            onClick={linkBrandSource}
            disabled={dnaLoading}
            className="px-2 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs text-white"
          >
            {dnaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Link'}
          </button>
        </div>
        {dnaError && <p className="text-[11px] text-red-400 mt-2">{dnaError}</p>}

        {dna && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 truncate" title={dna.file_name}>{dna.file_name}</span>
              <button onClick={refreshDna} className="text-slate-500 hover:text-white" title="Re-sync">
                <RefreshCw className={`w-3.5 h-3.5 ${dnaLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {dna.palette_source && dna.palette_source !== 'named_styles' && (
              <p className="text-[10px] text-amber-400/90">
                Palette inferred from usage — confirm before relying on exact values.
              </p>
            )}
            {dna.pages?.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 mb-1">Base on page (look + voice)</p>
                <select
                  value={selectedPage}
                  onChange={e => setSelectedPage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="">All pages</option>
                  {dna.pages.map(p => (
                    <option key={p.page} value={p.page}>{p.page} ({p.frame_count})</option>
                  ))}
                </select>

                {/* Reference-frame picker — choose the exact frame to style from, or palette-only */}
                {selectedPage && (
                  <div className="mt-2">
                    <p className="text-[11px] text-slate-500 mb-1">
                      Reference frame{framesLoading ? ' · loading…' : ''}
                    </p>
                    <button
                      onClick={() => setSelectedRefNode(selectedRefNode === 'palette' ? null : 'palette')}
                      title="Generate from palette & voice only — no visual reference frame"
                      className={`text-[10px] px-2 py-1 rounded border mb-1.5 ${selectedRefNode === 'palette' ? 'border-purple-400 bg-purple-500/20 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-600'}`}
                    >
                      Palette only
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {pageFrames.filter(f => f.thumbnail_url).map(f => (
                        <button
                          key={f.node_id}
                          onClick={() => setSelectedRefNode(selectedRefNode === f.node_id ? null : f.node_id)}
                          title={f.name}
                          className={`w-14 h-14 rounded overflow-hidden border-2 ${selectedRefNode === f.node_id ? 'border-purple-400' : 'border-transparent hover:border-slate-600'}`}
                        >
                          <img src={f.thumbnail_url!} alt={f.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {selectedRefNode === 'palette'
                        ? 'No visual reference — palette & voice only.'
                        : selectedRefNode
                          ? 'Using your picked frame as the visual reference.'
                          : 'Default: auto-picks the first frame. Pick one for control.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reference image — upload or drag & drop; becomes the edit/generate source */}
        <div className="mt-5">
          <p className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
            <ImageIcon className="w-4 h-4 text-purple-400" /> Reference image
          </p>
          {editTarget ? (
            <div className="relative">
              <img
                src={editTarget.url}
                alt="reference"
                className="w-full max-h-44 object-cover rounded-lg border border-purple-400/50"
              />
              <button
                onClick={() => setEditTarget(null)}
                className="absolute top-1 right-1 p-1 rounded bg-slate-950/70 text-white hover:bg-slate-900"
                title="Remove reference"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="text-[10px] text-purple-300 mt-1">
                Used as the edit / reference source for your next message.
              </p>
            </div>
          ) : (
            <div
              onClick={() => uploadInputRef.current?.click()}
              onDragOver={e => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropImage}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-purple-400 bg-purple-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                  <p className="text-xs text-slate-400">Drop an image or click to upload</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">edit or generate from your own picture</p>
                </>
              )}
            </div>
          )}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={onUploadInput}
            className="hidden"
          />
        </div>

        {/* Placement set — resize the pinned/latest image into multiple sizes */}
        <div className="mt-5">
          <p className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-purple-400" /> Placement set
          </p>
          <p className="text-[10px] text-slate-500 mb-2">
            Resize the {editTarget ? 'pinned' : 'latest'} image into multiple sizes — any headline
            is composited per size (never cropped).
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {['1:1', '4:5', '3:4', '9:16', '16:9', '1.91:1'].map(s => (
              <button
                key={s}
                onClick={() => toggleSize(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  placeSizes.includes(s)
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            value={placeHeadline}
            onChange={e => setPlaceHeadline(e.target.value)}
            placeholder="optional headline (composited on each size)"
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white placeholder-slate-500 mb-2"
          />
          {placeHeadline.trim() && (
            <select
              value={placeColor}
              onChange={e => setPlaceColor(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white mb-2"
            >
              <option value="#FFFFFF">White text</option>
              {(dna?.brand_palette || []).map(c => (
                <option key={c.hex} value={c.hex}>
                  {c.name || c.hex} text
                </option>
              ))}
            </select>
          )}
          <button
            onClick={runPlacementSet}
            disabled={makingSet || placeSizes.length === 0}
            className="w-full py-1.5 rounded bg-purple-600/40 hover:bg-purple-600/60 disabled:opacity-40 text-xs text-white flex items-center justify-center gap-1"
          >
            {makingSet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Generate set (${placeSizes.length})`}
          </button>
        </div>
      </div>

      {/* ── Conversation + canvas ──────────────────────────────── */}
      <div className="col-span-6 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {/* Conversation header: current title + switchable history + new chat */}
        <div className="relative flex items-center justify-between px-3 py-2 border-b border-slate-800">
          <span className="text-xs text-slate-400 truncate max-w-[50%]">{deriveTitle(messages)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(o => !o)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <History className="w-3.5 h-3.5" /> History ({history.length})
            </button>
            <button
              onClick={newChat}
              className="text-xs px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-white flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New chat
            </button>
          </div>
          {historyOpen && (
            <div className="absolute right-2 top-9 z-30 w-72 max-h-80 overflow-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1">
              {history.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-500">No saved conversations yet</div>
              )}
              {history.map(c => (
                <button
                  key={c.id}
                  onClick={() => switchConversation(c.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 ${
                    c.id === activeId ? 'bg-slate-800/60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-200 truncate">{c.title}</div>
                    <div className="text-[10px] text-slate-500">{relTime(c.savedAt)}</div>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => deleteConversation(c.id, e)}
                    className="text-slate-500 hover:text-red-400 shrink-0"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="flex-1 overflow-auto p-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <ImageIcon className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Link a Figma file, then ask Mia to create on-brand images.</p>
              <p className="text-xs mt-1">e.g. “3 Instagram posts for the apricot launch, for runners”</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={m.role === 'user' ? 'max-w-[85%] bg-purple-600/30 border border-purple-500/30 rounded-xl px-3 py-2' : 'max-w-full'}>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">
                  {m.content}
                  {m.streaming && <span className="inline-block w-2 h-4 ml-0.5 bg-purple-400 animate-pulse align-middle" />}
                </p>
                {m.assets && m.assets.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {m.assets.map(a => (
                      <AssetCard
                        key={a.asset_id}
                        asset={a}
                        tenantId={tenantId}
                        sessionId={sessionId}
                        onZoom={setZoom}
                        isEditTarget={editTarget?.assetId === a.asset_id}
                        onPickTarget={pa =>
                          setEditTarget(prev =>
                            prev?.assetId === pa.asset_id ? null : { assetId: pa.asset_id, url: pa.cdn_url },
                          )
                        }
                      />
                    ))}
                  </div>
                )}
                {m.role === 'assistant' && !m.streaming && (!m.assets || m.assets.length === 0) && (
                  <PendingHint />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-800 p-3">
          {editTarget && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded bg-purple-500/15 border border-purple-500/30">
              <img src={editTarget.url} alt="" className="w-7 h-7 rounded object-cover" />
              <span className="text-xs text-purple-200">Editing this image — your next message edits it</span>
              <button
                onClick={() => setEditTarget(null)}
                className="ml-auto text-slate-400 hover:text-white"
                title="Stop editing this image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <DestinationToggle value={destination} onChange={setDestination} />
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>variants</span>
              <select
                value={numVariants}
                onChange={e => setNumVariants(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
              >
                {[1, 2, 3, 4, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>size</span>
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                title="Output aspect ratio"
              >
                <option value="1:1">1:1 square</option>
                <option value="4:5">4:5 portrait</option>
                <option value="3:4">3:4 portrait</option>
                <option value="9:16">9:16 story</option>
                <option value="16:9">16:9 landscape</option>
                <option value="1.91:1">1.91:1 banner</option>
              </select>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="Message Mia…"
              className="flex-1 resize-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
            />
            <button
              onClick={send}
              disabled={isStreaming || !input.trim()}
              className="p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-40 rounded-lg text-white"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Brand DNA ──────────────────────────────────────────── */}
      <div className="col-span-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-auto">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-pink-400" /> Brand DNA
        </h3>
        {!dna && <p className="text-xs text-slate-500">Link a Figma file to see its exact palette and type.</p>}
        {dna && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-slate-500 mb-1.5">Palette</p>
              <div className="space-y-1">
                {dna.brand_palette?.map(c => (
                  <div key={c.hex} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded border border-slate-600" style={{ backgroundColor: c.hex }} />
                    <span className="text-[11px] text-slate-300">{c.name || ''}</span>
                    <span className="text-[11px] text-slate-500 ml-auto font-mono">{c.hex}</span>
                  </div>
                ))}
                {(!dna.brand_palette || dna.brand_palette.length === 0) && (
                  <p className="text-[11px] text-slate-500">No named colours found.</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1"><Type className="w-3 h-3" /> Type</p>
              <div className="space-y-0.5">
                {(dna.named_text_styles || []).slice(0, 6).map((t, i) => (
                  <div key={i} className="text-[11px] text-slate-300">
                    {t.fontFamily}{t.fontSize ? ` · ${t.fontSize}px` : ''}
                  </div>
                ))}
                {(!dna.named_text_styles || dna.named_text_styles.length === 0) &&
                  (dna.fonts_by_frequency || []).slice(0, 4).map((f, i) => (
                    <div key={i} className="text-[11px] text-slate-300">{f.fontFamily}</div>
                  ))}
              </div>
            </div>
            {dna.brand_pages && dna.brand_pages.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Brand pages</p>
                <p className="text-[11px] text-slate-300">{dna.brand_pages.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8" onClick={() => setZoom(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setZoom(null)}><X className="w-6 h-6" /></button>
          <img src={zoom} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  )
}

function DestinationToggle({ value, onChange }: { value: Destination; onChange: (v: Destination) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
      <button
        onClick={() => onChange('designer_hero')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${value === 'designer_hero' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
        title="Best-of-N: Mia picks the strongest"
      >
        <Sparkles className="w-3 h-3" /> Hero
      </button>
      <button
        onClick={() => onChange('meta_feed')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${value === 'meta_feed' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
        title="Keep the diverse set as a Meta creative pool"
      >
        <Target className="w-3 h-3" /> Meta feed
      </button>
    </div>
  )
}

function PendingHint() {
  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> If Mia is generating, images will appear here shortly…
    </div>
  )
}

// The campaign save gate (backend chat_engine save_campaign) makes Mia end the full
// campaign summary with "Type **yes** to save as draft." and stop. In the UI that line
// becomes a button: the trailing prompt is stripped from the text and the caller renders
// "Save as draft", which sends the same "yes" the gate is waiting for.
const SAVE_DRAFT_LINE = /\n*[^\n]*\btype\s+\**yes\**\s+to\s+save\b[^\n]*\s*$/i

export const SAVE_DRAFT_REPLY = 'yes'

export const splitSaveDraftPrompt = (content: string): { body: string; hasPrompt: boolean } => {
  if (!SAVE_DRAFT_LINE.test(content)) return { body: content, hasPrompt: false }
  return { body: content.replace(SAVE_DRAFT_LINE, '').trimEnd(), hasPrompt: true }
}

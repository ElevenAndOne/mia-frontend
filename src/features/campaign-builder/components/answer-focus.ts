import type { AskFocus } from './your-turn'

// An answer goes to the chat as itself, under a tag naming the question in a few words (local test 27 Oct: every answer
// read "About: Your answer · Key facts" over "My answer: …"). Mia reads "Answer:" as a closed question (chat_context).
export const answerFocus = (question: string, answer: string, about?: string | null): AskFocus => {
  const words = question.replace(/[?.!]+$/, '').split(/\s+/)
  return { label: `Answer: ${about || words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : '')}`, detail: question, text: answer }
}

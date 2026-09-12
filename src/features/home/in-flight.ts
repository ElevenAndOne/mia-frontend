/**
 * Which "Do this next" card started the chat that is currently running. Set when a card's
 * button sends its prompt; read when the schedule flow announces a queued post so that card
 * can turn over in place. sessionStorage so a reload mid-flow still resolves it.
 */
export const HOME_CARD_IN_FLIGHT_KEY = 'mia:home-card-in-flight'

export function setHomeCardInFlight(cardId: string): void {
  try {
    sessionStorage.setItem(HOME_CARD_IN_FLIGHT_KEY, cardId)
  } catch {
    /* private mode */
  }
}

/** Returns the card id and clears it. */
export function takeHomeCardInFlight(): string | null {
  try {
    const id = sessionStorage.getItem(HOME_CARD_IN_FLIGHT_KEY)
    sessionStorage.removeItem(HOME_CARD_IN_FLIGHT_KEY)
    return id
  } catch {
    return null
  }
}

export function clearHomeCardInFlight(): void {
  try {
    sessionStorage.removeItem(HOME_CARD_IN_FLIGHT_KEY)
  } catch {
    /* ignore */
  }
}

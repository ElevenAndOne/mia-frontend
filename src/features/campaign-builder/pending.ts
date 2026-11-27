export type Pending = { id: string; summary: string[]; at?: string; about?: string }

/** A card made by a button on the page (Fix it on a finding or note) shows in Your turn only; a chat shows the cards
 *  from what the PM typed (Josh, 24 Nov, E19). */
export const chatCards = (pending: Pending[]) => pending.filter((p) => !/^(Fix|Note|Missing) · /.test(p.about ?? ''))

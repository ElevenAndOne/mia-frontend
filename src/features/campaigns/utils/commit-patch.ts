// Runs an inline-edit save and only commits the optimistic UI update when the
// server confirms it. On HTTP error or a network throw it surfaces a toast and
// leaves state untouched — so a failed save can't silently "stick" on screen
// and then vanish on the next reload.
export async function commitPatch(
  doFetch: () => Promise<Response>,
  onOk: () => void,
  showToast: (variant: 'error', message: string) => void,
): Promise<void> {
  try {
    const res = await doFetch()
    if (res.ok) onOk()
    else showToast('error', await refusal(res, "Couldn't save your change. Please try again."))
  } catch {
    showToast('error', "Couldn't save — check your connection and retry.")
  }
}

// The server's own reason when it gives one (a campaign made in the campaign builder says where its plan changes,
// review 5 Nov, 1.3: the page said only "Couldn't save your change" and dropped it)
export async function refusal(res: Response, fallback: string): Promise<string> {
  const detail = await res.json().then((b) => b?.detail, () => null)
  return typeof detail === 'string' && detail ? detail : fallback
}

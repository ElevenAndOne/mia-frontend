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
    else showToast('error', "Couldn't save your change — please try again.")
  } catch {
    showToast('error', "Couldn't save — check your connection and retry.")
  }
}

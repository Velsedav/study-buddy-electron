const api = () => (window as any).electronAPI.autostart

export async function getAutostart(): Promise<boolean> {
  try {
    return await api().isEnabled()
  } catch {
    return false
  }
}

export async function setAutostart(enabled: boolean): Promise<void> {
  await api().setEnabled(enabled)
}

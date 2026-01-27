import { useEffect, useState } from "react"
import { X } from "lucide-react"

type InstallPromptProps = {
  onClose?: () => void
}

export function InstallPrompt({ onClose }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // 初回ログイン後に出したい場合は、ここでlocalStorageチェック等を入れる
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null)
      setShowPrompt(false)
      onClose?.()
    })
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("installPromptDismissed", "true")
    onClose?.()
  }

  // iOS判定（Safariは beforeinstallprompt が無い）
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches

  // 既にインストール済みなら非表示
  if (isStandalone) return null

  // Android: beforeinstallprompt で出す
  if (!isIOS && !showPrompt) return null

  // iOS: 手動案内（Safariの共有ボタン → ホーム画面に追加）
  if (isIOS && localStorage.getItem("installPromptDismissed")) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div className="text-lg font-bold text-zinc-900">
            ホーム画面に追加
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 hover:bg-zinc-100"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        <p className="text-sm text-zinc-600 mb-4">
          {isIOS
            ? "Safariの共有ボタン（↑）から「ホーム画面に追加」を選ぶと、次回からワンタップでアクセスできます。"
            : "このアプリをホーム画面に追加すると、次回からワンタップで起動できます。"}
        </p>

        {!isIOS && (
          <button
            type="button"
            onClick={handleInstall}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            追加する
          </button>
        )}

        {isIOS && (
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  )
}

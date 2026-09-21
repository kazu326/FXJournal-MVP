type AttentionStartCardProps = {
  onStart: () => void;
};

export function AttentionStartCard({ onStart }: AttentionStartCardProps) {
  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-violet-600">
            Attention Navigator
          </p>
          <h2 className="m-0 mt-0.5 text-sm font-black leading-snug text-zinc-900">
            いま、この相場を見る価値を30秒で確認
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-700">
          4問
        </span>
      </div>
      <button
        type="button"
        data-testid="attention-start-home"
        onClick={onStart}
        className="mt-2 min-h-11 w-full rounded-xl border-0 bg-violet-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        30秒チェックを始める
      </button>
    </section>
  );
}

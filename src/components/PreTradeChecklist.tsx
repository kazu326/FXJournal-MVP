import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { haptics } from "../lib/haptics";
import type { GateState } from "../store/tradeStore";
import { useEffect } from "react";
import { useMascotStore } from "../store/mascotStore";

interface PreTradeChecklistProps {
    items: {
        id: keyof GateState;
        label: string;
        checked: boolean;
    }[];
    onToggle: (id: keyof GateState, checked: boolean) => void;
}

function ChecklistItem({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    const shouldReduceMotion = useReducedMotion();

    const handleToggle = () => {
        haptics.light();
        onChange(!checked);
    };

    return (
        <button
            type="button"
            aria-pressed={checked}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={handleToggle}
        >
            <div
                className={`flex items-center justify-center size-6 rounded-md border-2 transition-colors ${checked ? "bg-blue-600 border-blue-600" : "border-zinc-300 bg-transparent"
                    }`}
            >
                <motion.div
                    initial={false}
                    animate={{ scale: checked ? (shouldReduceMotion ? 1 : [0.8, 1.2, 1]) : 0, opacity: checked ? 1 : 0 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 20 }}
                >
                    {checked && <Check className="size-4 text-white font-bold" strokeWidth={3} />}
                </motion.div>
            </div>
            <span
                className={`text-sm font-semibold select-none transition-colors ${checked ? "text-zinc-900" : "text-zinc-500"
                    }`}
            >
                {label}
            </span>
        </button>
    );
}

export function PreTradeChecklist({ items, onToggle }: PreTradeChecklistProps) {
    const showMascot = useMascotStore(state => state.showMascot);

    const allChecked = items.length > 0 && items.every(item => item.checked);

    useEffect(() => {
        if (items.length === 0) return;
        if (allChecked) {
            showMascot('gateAllClear');
        } else {
            showMascot('gateNG');
        }
    }, [allChecked, items.length, showMascot]);

    useEffect(() => {
        return () => {
            const currentEvent = useMascotStore.getState().currentEvent;
            if (currentEvent === 'gateNG' || currentEvent === 'gateAllClear') {
                useMascotStore.getState().hideMascot();
            }
        };
    }, []);

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-bold text-zinc-800 m-0 border-b border-zinc-50 pb-2">
                最終確認項目
            </h4>
            <div className="flex flex-col gap-2">
                {items.map((item) => (
                    <ChecklistItem
                        key={item.id}
                        label={item.label}
                        checked={item.checked}
                        onChange={(checked) => onToggle(item.id, checked)}
                    />
                ))}
            </div>
        </div>
    );
}

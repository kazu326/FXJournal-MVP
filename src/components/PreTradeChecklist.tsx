import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { haptics } from "../lib/haptics";
import type { GateState } from "../store/tradeStore";

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
    const handleToggle = () => {
        haptics.light();
        onChange(!checked);
    };

    return (
        <div
            className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white shadow-sm cursor-pointer transition-colors hover:bg-zinc-50"
            onClick={handleToggle}
        >
            <div
                className={`flex items-center justify-center size-6 rounded-md border-2 transition-colors ${checked ? "bg-blue-600 border-blue-600" : "border-zinc-300 bg-transparent"
                    }`}
            >
                <motion.div
                    initial={false}
                    animate={{ scale: checked ? [0.8, 1.2, 1] : 0, opacity: checked ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
        </div>
    );
}

export function PreTradeChecklist({ items, onToggle }: PreTradeChecklistProps) {
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

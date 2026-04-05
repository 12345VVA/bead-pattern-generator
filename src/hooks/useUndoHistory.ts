import { useCallback, useState } from "react";

interface UseUndoHistoryOptions<T> {
    clone: (value: T) => T;
    maxLength?: number;
}

export function useUndoHistory<T>(options: UseUndoHistoryOptions<T>) {
    const maxLength = options.maxLength ?? 50;
    const [history, setHistory] = useState<T[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const reset = useCallback((value: T) => {
        const cloned = options.clone(value);
        setHistory([cloned]);
        setHistoryIndex(0);
        return cloned;
    }, [options]);

    const push = useCallback((value: T) => {
        const cloned = options.clone(value);

        setHistory(prev => {
            const next = prev.slice(0, historyIndex + 1);
            next.push(cloned);
            if (next.length > maxLength) {
                next.shift();
            }
            return next;
        });

        setHistoryIndex(prev => Math.min(prev + 1, maxLength - 1));
        return cloned;
    }, [historyIndex, maxLength, options]);

    const undo = useCallback(() => {
        if (historyIndex <= 0) return null;

        const previous = history[historyIndex - 1];
        if (!previous) return null;

        const cloned = options.clone(previous);
        setHistoryIndex(historyIndex - 1);
        return cloned;
    }, [history, historyIndex, options]);

    return {
        history,
        historyIndex,
        canUndo: historyIndex > 0,
        reset,
        push,
        undo,
    };
}

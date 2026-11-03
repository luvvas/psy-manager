import { useCallback, useState } from "react";

const ONLY_MINE_KEY = "agenda:only-mine:v1";
const LEGACY_ONLY_MINE_KEY = "agenda:only-mine";

function readOnlyMine(): boolean {
    try {
        return (localStorage.getItem(ONLY_MINE_KEY) ?? localStorage.getItem(LEGACY_ONLY_MINE_KEY)) === "1";
    } catch {
        return false;
    }
}

function writeOnlyMine(value: boolean) {
    try {
        localStorage.setItem(ONLY_MINE_KEY, value ? "1" : "0");
    } catch {
        return;
    }
}

export function useOnlyMineFilter() {
    const [onlyMine, setOnlyMineState] = useState(readOnlyMine);

    const setOnlyMine = useCallback((value: boolean) => {
        setOnlyMineState(value);
        writeOnlyMine(value);
    }, []);

    return [onlyMine, setOnlyMine] as const;
}

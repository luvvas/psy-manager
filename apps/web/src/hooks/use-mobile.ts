import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

function subscribe(onChange: () => void) {
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

const getSnapshot = () => query.matches;

/**
 * true abaixo de 768px. Lê o valor já no primeiro render (antes, começava `false` e
 * corrigia num efeito: no celular a sidebar de desktop aparecia e depois trocava) e
 * assina o booleano do media query, não a largura da janela.
 */
export function useIsMobile() {
    return useSyncExternalStore(subscribe, getSnapshot);
}

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useRef, type PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 3;
const FALLBACK_WIDTH_PX = 256;

interface DragState {
    pointerId: number;
    startX: number;
    startWidth: number;
    width: number;
    dragged: boolean;
}

function currentSidebarWidth(rail: HTMLElement) {
    const gap = rail
        .closest<HTMLElement>('[data-slot="sidebar"]')
        ?.querySelector<HTMLElement>('[data-slot="sidebar-gap"]');
    return gap?.getBoundingClientRect().width ?? FALLBACK_WIDTH_PX;
}

export function SidebarResizeRail() {
    const { state, toggleSidebar, setWidth, previewWidth } = useSidebar();
    const dragRef = useRef<DragState | null>(null);

    function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
        if (state === "collapsed") {
            toggleSidebar();
            return;
        }
        e.preventDefault();
        const startWidth = currentSidebarWidth(e.currentTarget);
        dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startWidth,
            width: startWidth,
            dragged: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        const delta = e.clientX - drag.startX;
        if (Math.abs(delta) > DRAG_THRESHOLD_PX) drag.dragged = true;
        if (!drag.dragged) return;
        drag.width = previewWidth(drag.startWidth + delta);
    }

    function finishDrag(e: PointerEvent<HTMLButtonElement>, toggleOnClick: boolean) {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        dragRef.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        if (drag.dragged) setWidth(drag.width);
        else if (toggleOnClick) toggleSidebar();
    }

    return (
        <button
            type="button"
            data-sidebar="rail"
            aria-label="Redimensionar barra lateral"
            tabIndex={-1}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => finishDrag(e, true)}
            onPointerCancel={(e) => finishDrag(e, false)}
            className={cn(
                "absolute inset-y-0 z-20 hidden w-4 touch-none sm:flex",
                "group-data-[side=left]:-right-4 ltr:-translate-x-1/2",
                "after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 hover:after:bg-sidebar-border",
                state === "collapsed" ? "cursor-e-resize" : "cursor-col-resize",
            )}
        />
    );
}

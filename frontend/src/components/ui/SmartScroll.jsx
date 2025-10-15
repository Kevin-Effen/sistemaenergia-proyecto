import { useEffect, useRef } from "react";

/**
 * SmartScroll: envuelve tu <table> y añade una barra superior sincronizada (scroll horizontal).
 * Uso:
 *  <SmartScroll>
 *    <table> ... </table>
 *  </SmartScroll>
 */
export default function SmartScroll({ children, className = "" }) {
  const topRef = useRef(null);
  const bottomRef = useRef(null);
  const shimRef = useRef(null);

  useEffect(() => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    const shim = shimRef.current;
    if (!top || !bottom || !shim) return;

    const syncShimWidth = () => {
      const inner = bottom.querySelector("table");
      if (inner) {
        shim.style.width = `${inner.scrollWidth}px`;
      }
    };
    
    // Sincronizar inmediatamente y después de un timeout para asegurar que el DOM esté listo
    syncShimWidth();
    const timeoutId = setTimeout(syncShimWidth, 100);

    const onTopScroll = () => {
      if (bottom.scrollLeft !== top.scrollLeft) {
        bottom.scrollLeft = top.scrollLeft;
      }
    };
    const onBottomScroll = () => {
      if (top.scrollLeft !== bottom.scrollLeft) {
        top.scrollLeft = bottom.scrollLeft;
      }
    };

    top.addEventListener("scroll", onTopScroll, { passive: true });
    bottom.addEventListener("scroll", onBottomScroll, { passive: true });
    window.addEventListener("resize", syncShimWidth);

    return () => {
      clearTimeout(timeoutId);
      top.removeEventListener("scroll", onTopScroll);
      bottom.removeEventListener("scroll", onBottomScroll);
      window.removeEventListener("resize", syncShimWidth);
    };
  }, [children]);

  return (
    <div className={`table-shell ${className}`}>
      <div className="table-top-scroll" ref={topRef}>
        <div ref={shimRef} style={{ height: 1 }} />
      </div>
      <div className="table-bottom-scroll" ref={bottomRef}>
        {children}
      </div>
    </div>
  );
}

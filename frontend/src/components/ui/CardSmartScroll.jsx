import SmartScroll from "./SmartScroll";

/**
 * CardSmartScroll: igual que SmartScroll, pero pensado para usarse
 * DENTRO de un <div class="card-body">. Mantiene el scroll horizontal
 * arriba, sin que se salga del marco del card.
 */
export default function CardSmartScroll({ children, className = "" }) {
  return (
    <SmartScroll className={`card-scroll ${className}`}>
      {children}
    </SmartScroll>
  );
}

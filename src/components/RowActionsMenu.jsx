import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const MENU_ITEM_H = 40;
const MENU_PADDING = 8;
const MENU_W      = 164;

const RowActionsMenu = ({ items }) => {
  const [open, setOpen]       = useState(false);
  const [menuStyle, setStyle] = useState({});
  const triggerRef            = useRef();

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const r         = triggerRef.current.getBoundingClientRect();
    const menuH     = items.length * MENU_ITEM_H + MENU_PADDING;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp     = spaceBelow < menuH + 8;

    const rawRight = window.innerWidth - r.right;
    const right     = Math.max(4, Math.min(rawRight, window.innerWidth - MENU_W - 4));

    setStyle({
      position: 'fixed',
      right:    `${right}px`,
      zIndex:   9999,
      ...(openUp
        ? { bottom: `${window.innerHeight - r.top + 4}px`, top: 'auto' }
        : { top:    `${r.bottom + 4}px`,                   bottom: 'auto' }),
    });
  }, [items.length]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) calcPosition();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="row-actions">
      <button
        ref={triggerRef}
        className="row-actions__trigger"
        onClick={handleToggle}
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && createPortal(
        <div
          className="row-actions__menu"
          style={menuStyle}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              className={`row-actions__item${item.variant ? ` row-actions__item--${item.variant}` : ''}`}
              onClick={() => { item.onClick(); setOpen(false); }}
              disabled={item.disabled}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default RowActionsMenu;

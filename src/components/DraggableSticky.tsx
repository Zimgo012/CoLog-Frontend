import { useRef, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface StickyImage {
  id: string
  src: string
  x: number       // viewport-relative px
  y: number
  rotation: number
}

export function randomRotation() {
  return Math.round((Math.random() - 0.5) * 10)
}

interface Props {
  sticky: StickyImage
  onMove: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
}

export default function DraggableSticky({ sticky, onMove, onRemove }: Props) {
  const ref        = useRef<HTMLDivElement>(null)
  const offset     = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    isDragging.current = true
    offset.current = { x: e.clientX - sticky.x, y: e.clientY - sticky.y }
    ref.current?.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [sticky.x, sticky.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    onMove(sticky.id, e.clientX - offset.current.x, e.clientY - offset.current.y)
  }, [sticky.id, onMove])

  const onPointerUp = useCallback(() => { isDragging.current = false }, [])

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="fixed select-none touch-none group"
      style={{
        left: sticky.x,
        top: sticky.y,
        transform: `rotate(${sticky.rotation}deg)`,
        zIndex: 40,
        cursor: 'grab',
        width: 160,
      }}
    >
      <div className="relative shadow-xl bg-white p-1.5 pb-6 rounded-sm">
        {/* Tape strip */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-5 bg-yellow-100/80 border border-yellow-200/60 rounded-sm opacity-80 pointer-events-none" />
        <img
          src={sticky.src}
          alt="sticky"
          className="w-full object-cover rounded-sm pointer-events-none"
          draggable={false}
        />
        <button
          onClick={() => onRemove(sticky.id)}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

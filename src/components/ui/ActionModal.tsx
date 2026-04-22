import { useEffect, useRef, type ReactNode } from 'react'

type ActionModalProps = {
  isOpen: boolean
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}

export function ActionModal({ isOpen, title, description, children, onClose }: ActionModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (modalRef.current?.contains(event.target as Node)) {
        return
      }

      onClose()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="action-modal-layer">
      <section className="action-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="action-modal-title">
        <header className="action-modal-header">
          <div>
            <span className="eyebrow">Accion</span>
            <h2 id="action-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className="modal-close" type="button" aria-label="Cerrar modal" onClick={onClose}>
            x
          </button>
        </header>

        <div className="action-modal-body">{children}</div>
      </section>
    </div>
  )
}

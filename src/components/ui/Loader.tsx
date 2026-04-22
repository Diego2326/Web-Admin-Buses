type LoaderProps = {
  label?: string
}

export function Loader({ label = 'Cargando informacion...' }: LoaderProps) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-dot" />
      {label}
    </div>
  )
}

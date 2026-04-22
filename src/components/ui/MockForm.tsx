type Field = {
  label: string
  placeholder?: string
  type?: 'text' | 'email' | 'number' | 'date'
}

type MockFormProps = {
  fields: Field[]
  submitLabel: string
  onSubmit: () => void
}

export function MockForm({ fields, submitLabel, onSubmit }: MockFormProps) {
  return (
    <form
      className="modal-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="modal-form-grid">
        {fields.map((field) => (
          <label key={field.label}>
            <span>{field.label}</span>
            <input type={field.type ?? 'text'} placeholder={field.placeholder} />
          </label>
        ))}
      </div>

      <div className="modal-form-actions">
        <button className="button button-primary" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

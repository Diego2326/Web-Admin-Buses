import { useEffect, useState, type FormEvent } from 'react'
import { api, type PageResponse, type StaffUser, type UserRole, type UserStatus } from '../api'
import { CrudActionButtons, EmptyState, EnumAction, ErrorBanner, PageLayout, PaginationBar, PasswordResetAction } from './shared'
import {
  USER_ROLES,
  USER_STATUSES,
  askText,
  askUserRole,
  askUserStatus,
  formatEnumLabel,
  getErrorMessage,
  getStatusTone,
} from './utils'

type UsersPageProps = {
  token: string
  currentUserId: string
  canManage: boolean
}

export function UsersPage({ token, currentUserId, canManage }: UsersPageProps) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [query, setQuery] = useState({
    search: '',
    role: '' as UserRole | '',
    status: '' as UserStatus | '',
    page: 0,
    size: 12,
    sort: 'name,asc',
  })
  const [data, setData] = useState<PageResponse<StaffUser> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setError('')

      try {
        const response = await api.getUsers(token, query, controller.signal)
        setData(response)
      } catch (error) {
        const message = getErrorMessage(error)
        if (message) {
          setError(message)
        }
      }
    })()

    return () => controller.abort()
  }, [query, token])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery((current) => ({
      ...current,
      search: search.trim(),
      role,
      status,
      page: 0,
    }))
  }

  async function handleStatusChange(user: StaffUser, nextStatus: UserStatus) {
    await api.patchUserStatus(token, user.id, nextStatus)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)),
          }
        : current,
    )
  }

  async function handleRoleChange(user: StaffUser, nextRole: UserRole) {
    await api.patchUserRole(token, user.id, nextRole)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? { ...item, role: nextRole } : item)),
          }
        : current,
    )
  }

  async function handlePasswordReset(user: StaffUser, password: string) {
    await api.resetUserPassword(token, user.id, password)
  }

  async function handleCreateUser() {
    const name = askText('Nombre del usuario')
    if (!name) return
    const email = askText('Correo del usuario')
    if (!email) return
    const roleValue = askUserRole('OPERATOR')
    if (!roleValue) return
    const statusValue = askUserStatus('ACTIVE')
    if (!statusValue) return
    const password = askText('Contraseña temporal')
    if (!password) return

    await api.createUser(token, { name, email, role: roleValue, status: statusValue, password })
    setQuery((current) => ({ ...current }))
  }

  async function handleEditUser(user: StaffUser) {
    const name = askText('Nombre del usuario', user.name)
    if (!name) return
    const email = askText('Correo del usuario', user.email)
    if (!email) return
    const roleValue = askUserRole(user.role)
    if (!roleValue) return
    const statusValue = askUserStatus(user.status)
    if (!statusValue) return

    const updated = await api.updateUser(token, user.id, { name, email, role: roleValue, status: statusValue })
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? updated : item)),
          }
        : current,
    )
  }

  async function handleDeleteUser(user: StaffUser) {
    if (!window.confirm(`Eliminar al usuario ${user.name}?`)) return
    const updated = await api.deleteUser(token, user.id)
    setData((current) =>
      current
        ? {
            ...current,
            content: current.content.map((item) => (item.id === user.id ? updated : item)),
          }
        : current,
    )
  }

  return (
    <PageLayout
      title="Usuarios"
      copy="Búsqueda por nombre, correo, rol y estado con acciones rápidas de soporte administrativo."
      toolbar={
        <div className="page-toolbar">
          <form className="filters-grid compact" onSubmit={handleSubmit}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario" />
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole | '')}>
              <option value="">Todos los roles</option>
              {USER_ROLES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as UserStatus | '')}>
              <option value="">Todos los estados</option>
              {USER_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Filtrar
            </button>
          </form>

          <CrudActionButtons
            actions={[
              { label: 'Crear usuario', disabled: !canManage, variant: 'primary-button', onClick: handleCreateUser },
            ]}
          />
        </div>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <article className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Directorio</p>
            <h3>Usuarios del sistema</h3>
          </div>
          <span className="soft-pill">{data?.totalElements ?? 0} registros</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                {canManage ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {data?.content.map((user) => {
                const isCurrentUser = user.id === currentUserId
                const rowDisabled = isCurrentUser || !canManage

                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <span className="cell-subtitle">{isCurrentUser ? 'Sesión actual' : user.id}</span>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${getStatusTone(user.role === 'PASSENGER' ? 'INACTIVE' : 'ACTIVE')}`}>
                        {formatEnumLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusTone(user.status)}`}>{formatEnumLabel(user.status)}</span>
                    </td>
                    {canManage ? (
                      <td className="actions-cell">
                        <EnumAction
                          key={`user-role-${user.id}-${user.role}`}
                          value={user.role}
                          options={USER_ROLES}
                          actionLabel="Rol"
                          disabled={rowDisabled}
                          onSubmit={(nextRole) => handleRoleChange(user, nextRole)}
                        />
                        <EnumAction
                          key={`user-status-${user.id}-${user.status}`}
                          value={user.status}
                          options={USER_STATUSES}
                          actionLabel="Estado"
                          disabled={rowDisabled}
                          onSubmit={(nextStatus) => handleStatusChange(user, nextStatus)}
                        />
                        <PasswordResetAction disabled={rowDisabled} onSubmit={(password) => handlePasswordReset(user, password)} />
                        <CrudActionButtons
                          actions={[
                            { label: 'Editar', disabled: rowDisabled, onClick: () => void handleEditUser(user) },
                            { label: 'Eliminar', disabled: rowDisabled, onClick: () => void handleDeleteUser(user) },
                          ]}
                        />
                      </td>
                    ) : null}
                  </tr>
                )
              }) ?? null}
            </tbody>
          </table>
        </div>

        {!data?.content.length ? <EmptyState title="Sin usuarios" copy="No hubo coincidencias para esta consulta." /> : null}

        <PaginationBar
          page={data?.page ?? 0}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          size={data?.size ?? query.size}
          onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
      </article>
    </PageLayout>
  )
}

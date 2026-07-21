import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import './App.css'

const API = 'http://localhost:5000/api'

const SEVERITY_COLORS = {
  CRITICAL: { bg: '#fde8ef', color: '#8b1a3a' },
  HIGH: { bg: '#fdeaea', color: '#8b2020' },
  MEDIUM: { bg: '#fef3e2', color: '#7a4500' },
  LOW: { bg: '#eafaf1', color: '#1a6b3a' },
}

const STATUS_COLORS = {
  Unresolved: { bg: '#fdeaea', color: '#8b2020' },
  Resolved: { bg: '#eafaf1', color: '#1a6b3a' },
}

export default function App() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [stats, setStats] = useState({ total: 0, bySeverity: [], byStatus: [] })
  const [filters, setFilters] = useState({ search: '', severity: '', status: '', region: '', role: '' })
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [uploading, setUploading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15, sortBy, sortOrder, ...filters }
      const res = await axios.get(`${API}/logs`, { params })
      setLogs(res.data.logs)
      setPagination(res.data.pagination)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [page, sortBy, sortOrder, filters])

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/logs/stats`)
      setStats(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchLogs(); fetchStats() }, [fetchLogs])

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortOrder('desc') }
    setPage(1)
  }

  const handleFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Unresolved' ? 'Resolved' : 'Unresolved'
    await axios.patch(`${API}/logs/${id}`, { status: newStatus })
    fetchLogs(); fetchStats()
    setSelected(null)
  }

  const generateAndUpload = async () => {
    setUploading(true)
    const ACTIONS = ['DELETE_USER','CREATE_USER','UPDATE_ROLE','LOGIN','LOGOUT','EXPORT_DATA','MODIFY_CONFIG','REVOKE_TOKEN']
    const ROLES = ['admin','viewer','editor','superuser','auditor']
    const REGIONS = ['ap-south-1','us-east-1','eu-west-1','ap-southeast-2','us-west-2']
    const SEVERITIES = ['CRITICAL','HIGH','MEDIUM','LOW']
    const ACTORS = ['priya.nair','arjun.sharma','meena.patel','rahul.verma','anita.krishnan','deepak.iyer']
    const rnd = arr => arr[Math.floor(Math.random() * arr.length)]
    const logs = Array.from({ length: 10000 }, () => ({
      actor: rnd(ACTORS) + '@company.com',
      role: rnd(ROLES),
      action: rnd(ACTIONS),
      resource: '/api/' + rnd(['users','roles','configs']) + '/' + Math.floor(Math.random()*900+100),
      resourceType: rnd(['USER','ROLE','CONFIG','DATA']),
      ipAddress: '192.168.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255),
      region: rnd(REGIONS),
      severity: rnd(SEVERITIES),
      status: rnd(['Unresolved','Resolved']),
      timestamp: new Date(Date.now() - Math.random() * 30 * 864e5).toISOString()
    }))
    try {
      await axios.post(`${API}/logs/bulk`, { logs })
      alert('10,000 logs uploaded successfully!')
      fetchLogs(); fetchStats()
    } catch (e) { alert('Upload failed: ' + e.message) }
    setUploading(false)
  }

  const sortIcon = (field) => sortBy === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''

  const getStat = (arr, key) => arr.find(x => x._id === key)?.count || 0

  return (
    <div style={{ fontFamily: 'system-ui', minHeight: '100vh', background: '#f8f9fa', color: '#1a1a1a' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600 }}>🛡️ Audit Log Dashboard</h1>
        <button onClick={generateAndUpload} disabled={uploading}
          style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          {uploading ? 'Uploading...' : '⬆ Bulk Upload 10,000 Logs'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', padding: '1rem 1.5rem' }}>
        {[
          { label: 'Total Logs', value: stats.total, color: '#4f46e5' },
          { label: 'Critical', value: getStat(stats.bySeverity, 'CRITICAL'), color: '#8b1a3a' },
          { label: 'High', value: getStat(stats.bySeverity, 'HIGH'), color: '#8b2020' },
          { label: 'Unresolved', value: getStat(stats.byStatus, 'Unresolved'), color: '#c0392b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: s.color }}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input placeholder="Search actor, action, resource, IP..." value={filters.search}
          onChange={e => handleFilter('search', e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', width: '260px' }} />
        {[
          { key: 'severity', options: ['CRITICAL','HIGH','MEDIUM','LOW'], placeholder: 'All severities' },
          { key: 'status', options: ['Unresolved','Resolved'], placeholder: 'All statuses' },
          { key: 'region', options: ['ap-south-1','us-east-1','eu-west-1','ap-southeast-2','us-west-2'], placeholder: 'All regions' },
          { key: 'role', options: ['admin','viewer','editor','superuser','auditor'], placeholder: 'All roles' },
        ].map(f => (
          <select key={f.key} value={filters[f.key]} onChange={e => handleFilter(f.key, e.target.value)}
            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
            <option value="">{f.placeholder}</option>
            {f.options.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div style={{ padding: '0 1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {[['timestamp','Timestamp'],['actor','Actor'],['action','Action'],['severity','Severity'],['status','Status'],['region','Region']].map(([f,l]) => (
                <th key={f} onClick={() => handleSort(f)}
                  style={{ padding: '10px 12px', textAlign: 'left', color: '#666', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  {l}{sortIcon(f)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No logs found. Click "Bulk Upload" to add logs!</td></tr>
            ) : logs.map(log => (
              <tr key={log._id} onClick={() => setSelected(log)}
                style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '9px 12px' }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td style={{ padding: '9px 12px' }}>{log.actor}</td>
                <td style={{ padding: '9px 12px' }}><code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{log.action}</code></td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ ...SEVERITY_COLORS[log.severity], padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500 }}>{log.severity}</span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ ...STATUS_COLORS[log.status], padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500 }}>{log.status}</span>
                </td>
                <td style={{ padding: '9px 12px' }}>{log.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>
          Showing {pagination.total === 0 ? 0 : (page-1)*15+1}–{Math.min(page*15, pagination.total)} of {pagination.total.toLocaleString()} logs
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setPage(p => p-1)} disabled={page === 1}
            style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>‹</button>
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page-2, pagination.totalPages-4)) + i
            return p <= pagination.totalPages ? (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', background: p === page ? '#4f46e5' : 'white', color: p === page ? 'white' : '#333', cursor: 'pointer', fontSize: '12px' }}>{p}</button>
            ) : null
          })}
          <button onClick={() => setPage(p => p+1)} disabled={page === pagination.totalPages}
            style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>›</button>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '480px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Log Detail</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>×</button>
            </div>
            {[['Actor', selected.actor],['Role', selected.role],['Action', selected.action],['Resource', selected.resource],['Resource Type', selected.resourceType],['IP Address', selected.ipAddress],['Region', selected.region],['Timestamp', new Date(selected.timestamp).toLocaleString()]].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
              <button onClick={() => toggleStatus(selected._id, selected.status)}
                style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                {selected.status === 'Unresolved' ? '✓ Mark Resolved' : '↩ Mark Unresolved'}
              </button>
              <button onClick={() => setSelected(null)}
                style={{ background: '#f0f0f0', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Trade = 'Concrete' | 'Electrical' | 'Framing' | 'Plumbing' | 'HVAC' | 'Other'
type Photo = { name: string; size: number; url: string; timestamp: string }
type CrewReport = { id: string; foreman: string; trade: Trade; date: string; accomplished: string; blockers: string; crewCount: string; materials: string; photos: Photo[]; submittedAt: string; acknowledged?: boolean }

const trades: Trade[] = ['Concrete', 'Electrical', 'Framing', 'Plumbing', 'HVAC', 'Other']
const today = '2026-08-25'
const seedReports: CrewReport[] = [
  { id: 'concrete-0825', foreman: 'Marcus Bell', trade: 'Concrete', date: today, accomplished: 'Poured footing line B, grids 4 through 8. Stripped west retaining wall forms and cleaned the pour area.', blockers: 'Revised anchor detail must be confirmed before embeds are set tomorrow.', crewCount: '8', materials: '240 cubic yards concrete; anchor bolts staged.', photos: [], submittedAt: '4:18 PM' },
  { id: 'electrical-0825', foreman: 'Elena Cruz', trade: 'Electrical', date: today, accomplished: 'Pulled conduit for the level 2 east wing and completed rough-in at the mechanical room.', blockers: 'Panel delivery is expected Wednesday, but supplier has not confirmed truck time.', crewCount: '5', materials: '1 inch conduit and couplings.', photos: [], submittedAt: '3:46 PM' },
  { id: 'framing-0825', foreman: 'Dylan Nguyen', trade: 'Framing', date: today, accomplished: 'Set level 2 north corridor partitions and installed door headers at rooms 217 through 221.', blockers: '', crewCount: '7', materials: 'Studs and track on hand for tomorrow.', photos: [], submittedAt: '2:57 PM' },
]

const formatTime = () => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date())
const reportDraft = (reports: CrewReport[], project: string, date: string) => {
  const accomplishments = reports.map((report) => `${report.trade}: ${report.accomplished}`).join('\n\n')
  const blockers = reports.filter((report) => report.blockers).map((report) => `${report.trade}: ${report.blockers}`).join('\n') || 'No blockers were reported.'
  const materials = reports.filter((report) => report.materials).map((report) => `${report.trade}: ${report.materials}`).join('\n') || 'No material updates reported.'
  return `DAILY FIELD REPORT\n${project} | ${date}\n\nPROGRESS\n${accomplishments || 'No crew reports received.'}\n\nBLOCKERS / ITEMS REQUIRING ACTION\n${blockers}\n\nMATERIALS & LOGISTICS\n${materials}\n\nSAFETY\nNo recordable incidents reported. Reinforce PPE checks during the morning huddle.\n\nNEXT STEPS\nConfirm open approvals and delivery times before crews mobilize. Coordinate work areas at the morning planning meeting.`
}

function App() {
  const [view, setView] = useState<'crew' | 'super'>('crew')
  const [project] = useState('Riverside Medical Pavilion')
  const [reports, setReports] = useState<CrewReport[]>(() => {
    const saved = localStorage.getItem('siteflow-reports')
    return saved ? JSON.parse(saved) : seedReports
  })
  const [form, setForm] = useState({ foreman: '', trade: 'Concrete' as Trade, date: today, accomplished: '', blockers: '', crewCount: '', materials: '' })
  const [photos, setPhotos] = useState<Photo[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<'All' | Trade>('All')
  const [blockersOnly, setBlockersOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? '')
  const [draft, setDraft] = useState(() => reportDraft(seedReports, project, today))
  const [generated, setGenerated] = useState(true)
  const [published, setPublished] = useState(false)

  useEffect(() => localStorage.setItem('siteflow-reports', JSON.stringify(reports)), [reports])
  useEffect(() => setDraft(reportDraft(reports.filter((report) => report.date === today), project, today)), [reports, project])
  useEffect(() => { if (notice) { const timeout = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timeout) } }, [notice])

  const formValid = form.foreman.trim().length > 1 && form.accomplished.trim().length >= 10 && form.accomplished.length <= 500
  const selected = reports.find((report) => report.id === selectedId)
  const visibleReports = useMemo(() => reports.filter((report) => report.date === today && (filter === 'All' || report.trade === filter) && (!blockersOnly || report.blockers) && `${report.foreman} ${report.trade} ${report.accomplished} ${report.blockers}`.toLowerCase().includes(search.toLowerCase())), [reports, filter, blockersOnly, search])

  function updateForm(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })) }
  function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    const accepted = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 2 * 1024 * 1024)
    const remaining = 5 - photos.length
    if (accepted.length !== files.length) setNotice('Only JPG, PNG, or WebP images under 2 MB can be added.')
    setPhotos((current) => [...current, ...accepted.slice(0, remaining).map((file) => ({ name: file.name, size: file.size, url: URL.createObjectURL(file), timestamp: formatTime() }))])
    event.target.value = ''
  }
  function submitReport(event: React.FormEvent) {
    event.preventDefault()
    if (!formValid) return
    const report: CrewReport = { id: crypto.randomUUID(), ...form, photos, submittedAt: formatTime() }
    setReports((current) => [report, ...current])
    setSelectedId(report.id)
    if (form.blockers.trim()) setNotice(`Blocker alert sent to Sam Patel: ${form.trade} reported an issue.`)
    setSubmitted(true)
  }
  function resetForm() { setForm({ foreman: '', trade: 'Concrete', date: today, accomplished: '', blockers: '', crewCount: '', materials: '' }); setPhotos([]); setSubmitted(false) }
  function acknowledge() { if (!selected) return; setReports((current) => current.map((report) => report.id === selected.id ? { ...report, acknowledged: true } : report)); setNotice('Blocker acknowledged and logged.') }
  function publish() { setPublished(true); setNotice('Daily report published. PDF is ready to download and archive.') }
  function downloadText() { const blob = new Blob([draft], { type: 'text/plain' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${today}-daily-field-report.txt`; link.click(); URL.revokeObjectURL(link.href) }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">SF</span><span>Siteflow</span></div><p className="topbar-context">Riverside Medical Pavilion</p><nav aria-label="Application views"><button className={view === 'crew' ? 'nav-active' : ''} onClick={() => setView('crew')}>Crew check-in</button><button className={view === 'super' ? 'nav-active' : ''} onClick={() => setView('super')}>Super dashboard</button></nav><span className="profile">SP <span>Sam Patel</span></span></header>
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
    {view === 'crew' ? <section className="crew-layout">
      {submitted ? <article className="success-card"><span className="success-mark">✓</span><p className="eyebrow">Report received</p><h1>Your report is sent.</h1><p>Sam Patel will review it in the morning. Your submission was recorded at {formatTime()}.</p><button className="primary-button" onClick={resetForm}>Submit another report</button><button className="text-button" onClick={() => setView('super')}>View project reports</button></article> : <>
        <header className="crew-heading"><p className="eyebrow">Daily field report</p><h1>What did your crew accomplish?</h1><p>Complete this check-in before you leave site. It takes about 90 seconds.</p></header>
        <form className="crew-form" onSubmit={submitReport}>
          <div className="form-grid"><label>Foreman name<span className="required">Required</span><input value={form.foreman} onChange={(event) => updateForm('foreman', event.target.value)} placeholder="Your name" autoComplete="name" /></label><label>Trade type<span className="required">Required</span><select value={form.trade} onChange={(event) => updateForm('trade', event.target.value)}>{trades.map((trade) => <option key={trade}>{trade}</option>)}</select></label><label>Date<input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} /></label><label>Crew count<input type="number" min="0" inputMode="numeric" value={form.crewCount} onChange={(event) => updateForm('crewCount', event.target.value)} placeholder="Optional" /></label></div>
          <label className="full-field">What accomplished <span className="required">Required</span><textarea value={form.accomplished} onChange={(event) => updateForm('accomplished', event.target.value)} maxLength={500} placeholder="e.g., Foundation pour completed, 240 cubic yards tested" /><small>{form.accomplished.length}/500 characters · minimum 10</small></label>
          <label className="full-field">Any blockers <span className="optional">Optional · alerts superintendent</span><textarea value={form.blockers} onChange={(event) => updateForm('blockers', event.target.value)} maxLength={500} placeholder="e.g., Materials delayed, weather impact, approval pending" /></label>
          <label className="full-field">Materials used <span className="optional">Optional</span><input value={form.materials} onChange={(event) => updateForm('materials', event.target.value)} placeholder="Materials, equipment, or delivery notes" /></label>
          <section className="photo-section"><div><strong>Site photos</strong><span>Up to 5 images · JPG, PNG, WebP · 2 MB each</span></div><label className="upload-button">+ Add photo<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} /></label><div className="photo-grid">{photos.map((photo, index) => <figure key={photo.url}><img src={photo.url} alt={`Selected job site photo ${index + 1}`} /><button type="button" onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`Remove ${photo.name}`}>×</button><figcaption>{photo.timestamp}</figcaption></figure>)}</div></section>
          <button className="primary-button submit-button" type="submit" disabled={!formValid}>Submit daily report</button>
        </form>
      </>}
    </section> : <section className="super-layout">
      <header className="super-heading"><div><p className="eyebrow">Superintendent workspace</p><h1>Daily report inbox</h1><p>{today} · {visibleReports.length} crew reports received</p></div><div className="super-actions"><button className="secondary-button" onClick={() => { setDraft(reportDraft(reports.filter((report) => report.date === today), project, today)); setGenerated(true); setNotice('Draft generated from today’s crew reports.') }}>Generate AI draft</button><button className="primary-button" disabled={!reports.length || !draft.trim() || published} onClick={publish}>{published ? 'Published' : 'Publish report'}</button></div></header>
      <div className="filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search crew reports" aria-label="Search crew reports" /><select value={filter} onChange={(event) => setFilter(event.target.value as 'All' | Trade)}><option>All</option>{trades.map((trade) => <option key={trade}>{trade}</option>)}</select><label className="check-label"><input type="checkbox" checked={blockersOnly} onChange={(event) => setBlockersOnly(event.target.checked)} /> Blockers only</label><span>{reports.filter((report) => report.date === today && report.blockers && !report.acknowledged).length} open alerts</span></div>
      <div className="super-grid"><aside className="inbox-panel"><div className="panel-header"><h2>Crew reports</h2><span>Newest first</span></div><div className="report-list">{visibleReports.map((report) => <button key={report.id} className={`report-card ${selectedId === report.id ? 'selected' : ''}`} onClick={() => setSelectedId(report.id)}><span className={`trade-badge ${report.trade.toLowerCase()}`}>{report.trade}</span>{report.blockers && !report.acknowledged && <span className="alert-badge">Blocker</span>}<strong>{report.foreman}</strong><small>{report.submittedAt} · {report.crewCount || '—'} crew</small><p>{report.accomplished.slice(0, 92)}{report.accomplished.length > 92 ? '…' : ''}</p></button>)}</div></aside>
        <section className="detail-panel">{selected ? <><div className="panel-header"><div><span className={`trade-badge ${selected.trade.toLowerCase()}`}>{selected.trade}</span><h2>{selected.foreman}</h2></div><span>{selected.submittedAt}</span></div><div className="report-detail"><h3>Accomplished</h3><p>{selected.accomplished}</p>{selected.blockers && <><h3 className="blocker-heading">Blocker</h3><p className="blocker-copy">{selected.blockers}</p>{!selected.acknowledged && <button className="secondary-button" onClick={acknowledge}>Acknowledge blocker</button>}</>}<h3>Materials & crew</h3><p>{selected.materials || 'No materials noted.'}<br />Crew count: {selected.crewCount || 'Not reported'}</p>{selected.photos.length > 0 && <div className="report-photos">{selected.photos.map((photo) => <img key={photo.url} src={photo.url} alt={photo.name} />)}</div>}</div></> : <p className="empty-state">Select a report to review its details.</p>}</section>
        <section className="draft-panel"><div className="panel-header"><div><p className="eyebrow">AI draft · local demo</p><h2>Daily field report</h2></div><span>{draft.trim().split(/\s+/).filter(Boolean).length} words</span></div>{generated ? <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setPublished(false) }} aria-label="Editable daily report draft" /> : <p className="empty-state">Generate a draft after crew reports arrive.</p>}<footer><span>Auto-saved locally</span><div><button className="text-button" onClick={() => { setDraft(''); setPublished(false) }}>Clear draft</button><button className="secondary-button" onClick={downloadText}>Download report</button></div></footer></section>
      </div>
    </section>}
  </main>
}

export default App

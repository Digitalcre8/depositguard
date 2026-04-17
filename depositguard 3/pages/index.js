import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fmt(n) {
  return '£' + Number(n || 0).toLocaleString('en-GB')
}

function scoreClass(s) {
  return s >= 75 ? 'sc-good' : s >= 50 ? 'sc-fair' : 'sc-poor'
}
function condClass(c) {
  return c === 'Good' ? 'cond-good' : c === 'Fair' ? 'cond-fair' : 'cond-poor'
}
function sevClass(s) {
  return s === 'high' ? 'sev-high' : s === 'medium' || s === 'med' ? 'sev-med' : 'sev-low'
}

const LOAD_STEPS = [
  'Scanning images for damage & wear',
  'Identifying issues by room',
  'Estimating fair deduction costs',
  'Drafting dispute-ready statement',
]

export default function Home() {
  const [step, setStep] = useState(1) // 1=upload, 2=loading, 3=report
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [address, setAddress] = useState('')
  const [inspType, setInspType] = useState('Check-out (end of tenancy)')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loadStep, setLoadStep] = useState(0)
  const [report, setReport] = useState(null)
  const [reportMeta, setReportMeta] = useState({})
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef()

  const addFiles = useCallback((newFiles) => {
    const imgs = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    setFiles(prev => {
      const combined = [...prev, ...imgs].slice(0, 8)
      const urls = combined.map(f => URL.createObjectURL(f))
      setPreviews(urls)
      return combined
    })
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const analyse = async () => {
    setError('')
    if (!files.length) { setError('Please upload at least one photo.'); return }

    const addr = address.trim() || 'The property'
    const meta = {
      address: addr, inspType, deposit, notes,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    setReportMeta(meta)
    setStep(2)
    setLoadStep(0)

    // animate load steps
    let s = 0
    const ticker = setInterval(() => {
      s++
      setLoadStep(s)
      if (s >= LOAD_STEPS.length) clearInterval(ticker)
    }, 2200)

    try {
      const images = await Promise.all(
        files.map(async f => ({ data: await fileToBase64(f), mediaType: f.type }))
      )

      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, address: addr, inspType, deposit, notes }),
      })

      clearInterval(ticker)

      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Analysis failed')
      }

      const { report: r } = await res.json()
      setReport(r)
      setStep(3)
    } catch (e) {
      clearInterval(ticker)
      setStep(1)
      setError(e.message || 'Something went wrong. Please try again.')
    }
  }

  const copyReport = () => {
    if (!report) return
    const m = reportMeta
    let out = `DEPOSIT INSPECTION REPORT\n${m.address}\n${m.inspType} · ${m.date}\n${'─'.repeat(50)}\n\nCONDITION: ${report.overallCondition} (${report.overallScore}/100)\n${report.summary}\n\nTOTAL DEDUCTION: ${fmt(report.totalDeduction)}\n\nITEMISED DEDUCTIONS:\n`
    ;(report.deductions || []).forEach(x => {
      out += `  • ${x.item} (${x.room}) — ${fmt(x.cost)}\n    ${x.reason}\n`
    })
    out += `\nROOM FINDINGS:\n`
    ;(report.rooms || []).forEach(r => {
      out += `\n${r.name.toUpperCase()} — ${r.condition}\n`
      ;(r.findings || []).forEach(f => { out += `  ${f.type === 'issue' ? '!' : '–'} ${f.text}\n` })
    })
    out += `\nDISPUTE STATEMENT:\n${report.dispute}`
    navigator.clipboard.writeText(out)
  }

  const reset = () => {
    setStep(1); setFiles([]); setPreviews([]); setReport(null)
    setAddress(''); setDeposit(''); setNotes(''); setError('')
    setLoadStep(0)
  }

  return (
    <>
      <Head>
        <title>DepositGuard — AI Inventory Assistant</title>
        <meta name="description" content="Upload property photos to get an AI-powered deposit inspection report with itemised deductions and a dispute-ready statement." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div className="logo">Deposit<span>Guard</span></div>
          <span className="logo-sub">AI Inventory</span>
        </div>
        <div className="pills">
          <div className={`pill ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>1. Upload</div>
          <div className={`pill ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>2. Analyse</div>
          <div className={`pill ${step === 3 ? 'active' : ''}`}>3. Report</div>
        </div>
      </div>

      <div className="page">

        {/* ── UPLOAD ── */}
        {step === 1 && (
          <>
            <div className="hero-lbl">AI-powered deposit protection</div>
            <h1 className="hero-h">Photos → <em>dispute-ready</em> report</h1>
            <p className="hero-p">Upload check-out photos. AI detects every issue, suggests fair deposit deductions, and writes a dispute-ready statement for TDS, mydeposits, or DPS.</p>

            <div className="flow">
              <div className="fs"><div className="fn">01</div><div className="ft">Upload photos</div><div className="fd">Any room, any angle</div></div>
              <div className="fs"><div className="fn">02</div><div className="ft">AI detects issues</div><div className="fd">Damage, wear & stains</div></div>
              <div className="fs"><div className="fn">03</div><div className="ft">Deductions suggested</div><div className="fd">Fair £ cost estimates</div></div>
              <div className="fs"><div className="fn">04</div><div className="ft">Dispute statement</div><div className="fd">Ready to send or print</div></div>
            </div>

            <div
              className={`drop ${dragging ? 'drag' : ''} ${files.length ? 'loaded' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="drop-ico">📸</div>
              <h3>{files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} ready` : 'Drop property photos here'}</h3>
              <p>{files.length ? 'Click to add more (max 8 images)' : 'JPG or PNG · up to 8 images · drag & drop or click'}</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {previews.length > 0 && (
              <div className="preview-grid">
                {previews.map((src, i) => <img key={i} src={src} alt={`Photo ${i + 1}`} />)}
              </div>
            )}

            <div className="fields">
              <div className="field">
                <label>Property address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="14 Maple St, London E1" />
              </div>
              <div className="field">
                <label>Inspection type</label>
                <select value={inspType} onChange={e => setInspType(e.target.value)}>
                  <option>Check-out (end of tenancy)</option>
                  <option>Check-in (start of tenancy)</option>
                  <option>Mid-tenancy</option>
                  <option>Pre-sale survey</option>
                </select>
              </div>
              <div className="field">
                <label>Deposit held (£)</label>
                <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="1500" min="0" step="50" />
              </div>
              <div className="field full">
                <label>Context for AI (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. newly decorated before tenancy, carpets were new, tenant had a dog, focus on kitchen & bathroom..." />
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}
            <button className="btn-go" onClick={analyse}>Analyse photos & generate report →</button>
          </>
        )}

        {/* ── LOADING ── */}
        {step === 2 && (
          <div className="loading-wrap">
            <div className="load-icon">🔍</div>
            <h2 className="load-title">Analysing your property</h2>
            <p className="load-sub">Processing {files.length} image{files.length > 1 ? 's' : ''} with AI vision...</p>
            <div className="load-bar"><div className="load-fill" /></div>
            <div className="load-steps">
              {LOAD_STEPS.map((s, i) => (
                <div key={i} className={`load-step ${loadStep > i ? 'done' : loadStep === i ? 'cur' : ''}`}>{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── REPORT ── */}
        {step === 3 && report && (
          <>
            <div className="report-topbar">
              <div className="report-title">
                <h1>{reportMeta.address}</h1>
                <p>{reportMeta.inspType} · {reportMeta.date}{reportMeta.deposit ? ` · Deposit: £${reportMeta.deposit}` : ''}</p>
              </div>
              <div className="report-btns">
                <button className="btn-outline" onClick={copyReport}>📋 Copy report</button>
                <button className="btn-outline" onClick={() => navigator.clipboard.writeText(report.dispute || '')}>📄 Copy statement</button>
                <button className="btn-primary" onClick={() => window.print()}>🖨 Print / PDF</button>
              </div>
            </div>

            {/* Score strip */}
            <div className="score-strip">
              <div className={`score-circle ${scoreClass(report.overallScore)}`}>{report.overallScore}</div>
              <div className="score-mid">
                <h2>Overall condition: {report.overallCondition}</h2>
                <p>{report.summary}</p>
              </div>
              <div className="deduction-total">
                <div className="dt-label">Suggested deduction</div>
                <div className="dt-amount">{fmt(report.totalDeduction)}</div>
                <div className="dt-sub">from deposit{reportMeta.deposit ? ` of £${reportMeta.deposit}` : ''}</div>
              </div>
            </div>

            {/* Metrics */}
            <div className="metric-row">
              <div className="metric-card"><div className="mc-label">Damage items</div><div className={`mc-val ${report.urgentItems > 0 ? 'mv-red' : 'mv-green'}`}>{report.urgentItems}</div></div>
              <div className="metric-card"><div className="mc-label">Advisory</div><div className="mc-val mv-amber">{report.advisoryItems}</div></div>
              <div className="metric-card"><div className="mc-label">Wear & tear</div><div className="mc-val mv-blue">{report.wearItems}</div></div>
              <div className="metric-card"><div className="mc-label">Total deduction</div><div className="mc-val mv-red">{fmt(report.totalDeduction)}</div></div>
            </div>

            {/* Deductions table */}
            <div className="section-label">Suggested deposit deductions</div>
            <div className="deductions-wrap">
              {(report.deductions || []).length > 0 ? (
                <table className="ded-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Severity</th>
                      <th>Justification</th>
                      <th>Est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.deductions || []).map((d, i) => (
                      <tr key={i}>
                        <td><strong>{d.item}</strong><br /><span style={{ color: 'var(--ink3)', fontSize: '11px' }}>{d.room}</span></td>
                        <td><span className={`sev-pill ${sevClass(d.severity)}`}>{d.severity}</span></td>
                        <td style={{ color: 'var(--ink2)' }}>{d.reason}</td>
                        <td>{fmt(d.cost)}</td>
                      </tr>
                    ))}
                    <tr className="ded-total-row">
                      <td colSpan={3}><strong>Total suggested deduction</strong></td>
                      <td>{fmt(report.totalDeduction)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '1.5rem', fontSize: '13px', color: 'var(--ink3)', textAlign: 'center' }}>
                  No deductible damage identified — property appears to be in good order.
                </div>
              )}
            </div>

            {/* Rooms */}
            <div className="section-label">Room-by-room findings</div>
            <div className="rooms-grid">
              {(report.rooms || []).map((r, i) => (
                <div key={i} className="room-card">
                  <div className="room-header">
                    <span className="room-name">{r.name}</span>
                    <span className={`cond-pill ${condClass(r.condition)}`}>{r.condition}</span>
                  </div>
                  <ul className="findings-list">
                    {(r.findings || []).map((f, j) => (
                      <li key={j} className={f.type === 'issue' ? 'issue' : f.type === 'advisory' ? 'advisory' : ''}>{f.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Dispute statement */}
            <div className="section-label">Dispute-ready statement</div>
            <div className="dispute-box">
              <div className="dispute-header">
                <h3>📄 Dispute-ready statement</h3>
                <p>Structured for TDS, mydeposits, or DPS adjudication</p>
              </div>
              <div className="dispute-body">{report.dispute}</div>
              <div className="dispute-actions">
                <button className="btn-outline" onClick={() => navigator.clipboard.writeText(report.dispute || '')}>Copy statement</button>
                <button className="btn-outline" onClick={() => window.print()}>Print / Save PDF</button>
              </div>
            </div>

            <div className="footer-note">
              ⚠️ This report is AI-generated and intended as a starting point. Deduction amounts are estimates based on typical costs and may vary. Always cross-reference with your tenancy agreement and seek professional advice for formal dispute proceedings.
            </div>

            <button className="restart-btn" onClick={reset}>← Start a new inspection</button>
          </>
        )}
      </div>
    </>
  )
}

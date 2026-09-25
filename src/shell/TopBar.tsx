import { Check, ChevronDown, DatabaseBackup, Download, FileJson, Globe, Layers, RefreshCcw, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useMatch, useNavigate } from 'react-router'
import { exportBackup, importBackup, storageEstimate, type ImportMode } from '../db/backup'
import { useWorld, useWorlds } from '../db/hooks'
import { cx, formatBytes } from '../lib/utils'
import { Button } from '../ui/controls'
import { useFeedback } from '../ui/feedback-context'
import { useSticky } from '../ui/layers'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import { Menu } from '../ui/Menu'
import s from './TopBar.module.css'

export function TopBar() {
  const match = useMatch('/w/:worldId/*')
  const worldId = match?.params.worldId
  const world = useWorld(worldId)
  const worlds = useWorlds()
  const navigate = useNavigate()

  return (
    <header className={s.bar}>
      <div className={cx('page', s.inner)}>
        <Link to="/" className={s.brand} aria-label="Roster – all worlds">
          <Sigil />
          <span className={cx('display', s.wordmark)}>Roster</span>
        </Link>

        {world && (
          <>
            <span className={s.slash} aria-hidden>
              /
            </span>
            <Menu
              align="start"
              items={[
                { heading: 'Switch world' },
                ...(worlds ?? []).map((w) => ({
                  label: w.name,
                  icon: w.id === world.id ? <Check /> : <span className={s.swatch} style={{ background: w.accent }} />,
                  active: w.id === world.id,
                  onSelect: () => navigate(`/w/${w.id}`),
                })),
                { divider: true },
                { label: 'All worlds', icon: <Globe />, onSelect: () => navigate('/') },
              ]}
              renderTrigger={(p) => (
                <button {...p} className={s.crumb}>
                  <span className={s.crumbDot} style={{ background: world.accent }} />
                  <span className={s.crumbName}>{world.name}</span>
                  <ChevronDown size={14} />
                </button>
              )}
            />
          </>
        )}

        <div className={s.spacer} />
        <BackupMenu />
      </div>
    </header>
  )
}

function BackupMenu() {
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const file = useRef<HTMLInputElement>(null)
  const [usage, setUsage] = useState<number>()
  const [open, setOpen] = useState(0)
  const [pending, setPending] = useState<File | null>(null)
  const shownFile = useSticky(pending)

  useEffect(() => {
    if (open) storageEstimate().then(setUsage)
  }, [open])

  return (
    <>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setPending(f)
          e.target.value = ''
        }}
      />
      <Menu
        items={[
          { label: 'Export backup', icon: <Download />, hint: '.json', onSelect: () => exportBackup().then(() => toast({ message: 'Backup downloaded' })) },
          { label: 'Import backup…', icon: <Upload />, onSelect: () => file.current?.click() },
        ]}
        footer={usage !== undefined ? `Using ${formatBytes(usage)} in this browser` : 'Stored locally in IndexedDB'}
        renderTrigger={(p) => (
          <button
            {...p}
            className={s.backup}
            onClick={(e) => {
              setOpen((n) => n + 1)
              p.onClick(e)
            }}
          >
            <DatabaseBackup size={15} />
            <span className={s.backupLabel}>Backup</span>
          </button>
        )}
      />
      <Modal open={!!pending} onClose={() => setPending(null)} label="Import backup" size="md">
        {shownFile && (
          <ImportDialog
            file={shownFile}
            onClose={() => setPending(null)}
            onDone={(mode) => {
              setPending(null)
              toast({ message: mode === 'merge' ? 'Backup imported alongside your worlds' : 'Backup restored' })
              navigate('/')
            }}
          />
        )}
      </Modal>
    </>
  )
}

function ImportDialog({ file, onClose, onDone }: { file: File; onClose: () => void; onDone: (mode: ImportMode) => void }) {
  const { toast } = useFeedback()
  const [mode, setMode] = useState<ImportMode>('merge')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await importBackup(file, mode)
      onDone(mode)
    } catch (err) {
      console.error(err)
      toast({ message: 'That file isn’t a valid Roster backup', tone: 'danger' })
      setBusy(false)
    }
  }

  const options: Array<{ value: ImportMode; icon: ReactNode; title: string; body: string }> = [
    {
      value: 'merge',
      icon: <Layers size={18} />,
      title: 'Add to my worlds',
      body: 'Keeps everything you have. Anything already imported from this backup is updated rather than duplicated.',
    },
    {
      value: 'replace',
      icon: <RefreshCcw size={18} />,
      title: 'Replace everything',
      body: 'Deletes every world in this browser first, then restores the backup exactly.',
    },
  ]

  return (
    <>
      <ModalHeader eyebrow="Import backup" title="Bring a backup in" onClose={onClose} />
      <ModalBody>
        <div className={s.importFile}>
          <FileJson size={18} />
          <span className={s.importName}>{file.name}</span>
          <span className={s.importSize}>{formatBytes(file.size)}</span>
        </div>
        <div className={s.importOptions} role="radiogroup">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={mode === o.value}
              className={cx(s.importOption, o.value === 'replace' && s.importDanger)}
              onClick={() => setMode(o.value)}
              data-autofocus={o.value === 'merge' ? true : undefined}
            >
              <span className={s.importIcon}>{o.icon}</span>
              <span>
                <span className={s.importTitle}>{o.title}</span>
                <span className={s.importBody}>{o.body}</span>
              </span>
            </button>
          ))}
        </div>
      </ModalBody>
      <ModalFooter start={busy ? 'Reading images…' : undefined}>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant={mode === 'replace' ? 'danger' : 'primary'} onClick={run} disabled={busy}>
          {busy ? 'Importing…' : mode === 'replace' ? 'Replace my data' : 'Import'}
        </Button>
      </ModalFooter>
    </>
  )
}

/** Brand mark: a faceted diamond, like a card suit from an old deck. */
function Sigil() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden className="sigil">
      <path d="M16 2 L28 16 L16 30 L4 16 Z" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M16 8 L22.5 16 L16 24 L9.5 16 Z" fill="var(--accent)" opacity="0.9" />
      <path d="M16 2 V8 M16 24 V30 M4 16 H9.5 M22.5 16 H28" stroke="var(--accent)" strokeWidth="1" opacity="0.6" />
    </svg>
  )
}

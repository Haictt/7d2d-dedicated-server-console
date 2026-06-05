"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Terminal, FileCode2, Save, Download, Play, Square, RefreshCcw,
  HardDrive, Info, Search, Copy, Check, Eye, EyeOff,
  Server, Wifi, AlertCircle, CheckCircle2, ChevronDown, ChevronRight,
  Puzzle, Upload, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  executeCommand, getConfigProperties, saveConfigProperties,
  listSaveDir, getServerInfo, downloadFileZip, getServerLogs,
  getMods, toggleMod, deleteMod,
} from './actions';
import { CONFIG_GROUPS, type ConfigField } from './lib/config-schema';

// ─── Root ────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState<'commands' | 'editor' | 'logs' | 'mods'>('commands');
  const [addr, setAddr] = useState('...');
  useEffect(() => { getServerInfo().then((i) => setAddr(i.address)); }, []);

  return (
    <div className="admin-bg h-screen overflow-hidden flex flex-col text-[#e8e4f0]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0e0e16]/90 backdrop-blur border-b border-[#26263a] px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#7a1f2e]/20 border border-[#7a1f2e]/40 p-2 rounded-lg">
            <Terminal size={18} className="text-[#e8707e]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">
              7D2D <span className="text-[#e8707e]">Admin</span>
            </h1>
            <div className="flex items-center gap-1 mt-0.5">
              <Wifi size={9} className="text-[#6ddba4]" />
              <span className="text-[10px] text-[#9090a8]">
                Tailscale: <span className="font-mono text-[#7ecba0]">{addr}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex bg-[#0a0a0f] border border-[#26263a] rounded-xl p-1 gap-0.5">
          {([
            ['commands', 'Commands',   <Terminal key="t" size={13}/>],
            ['editor',   'XML Editor', <FileCode2 key="f" size={13}/>],
            ['logs',     'Info & Logs',<Info key="i" size={13}/>],
            ['mods',     'Mods',       <Puzzle key="m" size={13}/>],
          ] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === id
                  ? 'bg-[#7a1f2e] text-white shadow-sm'
                  : 'text-[#8a8698] hover:text-[#e8e4f0] hover:bg-[#1a1a25]'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-h-0 flex flex-col p-5 w-full max-w-7xl mx-auto">
        {tab === 'commands' && <div className="flex-1 overflow-y-auto"><CommandsTab addr={addr} /></div>}
        {tab === 'editor'   && <div className="flex-1 overflow-y-auto"><EditorTab /></div>}
        {tab === 'logs'     && <LogsTab />}
        {tab === 'mods'     && <ModsTab />}
      </main>
    </div>
  );
}

// ─── COMMANDS ────────────────────────────────────────────────────
function CommandsTab({ addr }: { addr: string }) {
  const [msg, setMsg]   = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (cmd: 'start' | 'stop' | 'restart') => {
    setBusy(cmd);
    setMsg({ text: `Running ${cmd}…`, ok: true });
    const r = await executeCommand(cmd);
    setMsg({ text: r.msg, ok: r.success });
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      {/* Server address */}
      <div className="bg-[#13131b] border border-[#26263a] rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#6ddba4]/10 border border-[#6ddba4]/20 p-2 rounded-lg">
            <Server size={16} className="text-[#6ddba4]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#9090a8]">Game Server (Tailscale)</p>
            <p className="font-mono text-[#7ecba0] text-sm font-medium mt-0.5">{addr}</p>
          </div>
        </div>
        <CopyBtn text={addr} />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CmdCard
          title="Start Server" desc="Launch the 7D2D dedicated server"
          icon={<Play size={15} />}
          badge="START" badgeColor="text-[#6ddba4] bg-[#6ddba4]/10 border-[#6ddba4]/20"
          btnColor="bg-[#3a9e6a] hover:bg-[#4ab87c]"
          loading={busy === 'start'} onClick={() => run('start')}
        />
        <CmdCard
          title="Stop Server" desc="Force stop — unsaved data may be lost"
          icon={<Square size={15} />}
          badge="STOP" badgeColor="text-[#e88080] bg-[#e88080]/10 border-[#e88080]/20"
          btnColor="bg-[#9e3a3a] hover:bg-[#b84848]"
          loading={busy === 'stop'} onClick={() => run('stop')}
        />
        <CmdCard
          title="Restart Server" desc="Stop, wait 2s, then start again"
          icon={<RefreshCcw size={15} />}
          badge="RESTART" badgeColor="text-[#e8c06a] bg-[#e8c06a]/10 border-[#e8c06a]/20"
          btnColor="bg-[#9e7a2a] hover:bg-[#b88a35]"
          loading={busy === 'restart'} onClick={() => run('restart')}
        />
      </div>

      {/* Status */}
      {msg && (
        <div className={`bg-[#13131b] border rounded-xl p-4 flex items-center gap-3 ${
          msg.ok ? 'border-[#3a9e6a]/50' : 'border-[#9e3a3a]/50'
        }`}>
          {msg.ok
            ? <CheckCircle2 size={15} className="text-[#6ddba4] shrink-0" />
            : <AlertCircle  size={15} className="text-[#e88080] shrink-0" />}
          <span className="font-mono text-xs text-[#c0bccc]">{msg.text}</span>
        </div>
      )}
    </div>
  );
}

function CmdCard({ title, desc, icon, badge, badgeColor, btnColor, loading, onClick }: {
  title: string; desc: string; icon: React.ReactNode;
  badge: string; badgeColor: string; btnColor: string;
  loading: boolean; onClick: () => void;
}) {
  return (
    <div className="bg-[#13131b] border border-[#26263a] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-[#8a8698] mt-1 leading-relaxed">{desc}</p>
        </div>
        <span className={`shrink-0 text-[9px] font-bold tracking-widest border rounded px-2 py-0.5 ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <button
        onClick={onClick} disabled={loading}
        className={`mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${btnColor}`}
      >
        {loading
          ? <RefreshCcw size={14} className="animate-spin" />
          : icon}
        {loading ? 'Running…' : title}
      </button>
    </div>
  );
}

// ─── XML EDITOR ──────────────────────────────────────────────────
function EditorTab() {
  const [props, setProps]       = useState<Record<string, string>>({});
  const [other, setOther]       = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [showOther, setShowOther] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getConfigProperties();
    setProps(d.properties);
    setOther(d.otherProperties);
    if (d.error) setMsg({ text: d.error, ok: false });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    const r = await saveConfigProperties({ ...props, ...other });
    setMsg({ text: r.msg, ok: r.success });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-[#13131b] border border-[#26263a] rounded-xl p-16 flex flex-col items-center gap-3 text-[#6b677a]">
        <RefreshCcw size={20} className="animate-spin" />
        <span className="text-sm">Loading serverconfig.xml…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">serverconfig.xml</h2>
          <p className="text-xs text-[#8a8698] mt-0.5">Edit server settings — saved directly to game folder</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#c0bccc] border border-[#36364e] rounded-lg hover:bg-[#26263a] hover:text-white transition-colors"
          >
            <RefreshCcw size={12} /> Reload
          </button>
          <button
            onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#7a1f2e] hover:bg-[#9c2a3c] rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={13} /> {saving ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>

      {/* Status */}
      {msg && (
        <div className={`flex items-center gap-2.5 p-3.5 rounded-lg border text-xs ${
          msg.ok ? 'border-[#3a9e6a]/40 text-[#6ddba4]' : 'border-[#9e3a3a]/40 text-[#e88080]'
        } bg-[#13131b]`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CONFIG_GROUPS.map((g) => (
          <div key={g.title} className="bg-[#13131b] border border-[#26263a] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1e1e2c] bg-[#191924]">
              <p className="text-xs font-semibold text-white">{g.title}</p>
              {g.description && <p className="text-[10px] text-[#8a8698] mt-0.5">{g.description}</p>}
            </div>
            <div className="p-5 space-y-4">
              {g.fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={props[f.name] ?? ''}
                  onChange={(v) => setProps((p) => ({ ...p, [f.name]: v }))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Advanced */}
      {Object.keys(other).length > 0 && (
        <div className="bg-[#13131b] border border-[#26263a] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowOther(!showOther)}
            className="w-full flex items-center gap-2 px-5 py-3.5 text-xs text-[#8a8698] hover:text-[#e8e4f0] transition-colors"
          >
            {showOther ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Advanced — {Object.keys(other).length} more properties
          </button>
          {showOther && (
            <div className="px-5 pb-5 pt-4 border-t border-[#1e1e2c] grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(other).sort().map(([k, v]) => (
                <div key={k}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] mb-1.5">{k}</label>
                  <input
                    className="w-full bg-[#0e0e16] border border-[#36364e] rounded-lg px-3 py-2 text-xs font-mono text-[#e8e4f0] caret-white outline-none focus:border-[#c45c6a] focus:shadow-[0_0_0_2px_rgba(196,92,106,0.18)] transition-all"
                    value={v}
                    onChange={(e) => setOther((o) => ({ ...o, [k]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }: {
  field: ConfigField; value: string; onChange: (v: string) => void;
}) {
  const [showPw, setShowPw] = useState(false);

  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] mb-1.5";
  const inputCls = "w-full bg-[#0e0e16] border border-[#36364e] rounded-lg px-3 py-2 text-sm text-[#e8e4f0] caret-white outline-none focus:border-[#c45c6a] focus:shadow-[0_0_0_2px_rgba(196,92,106,0.18)] transition-all";
  const hintCls  = "text-[10px] text-[#6b677a] mt-1.5";

  // Boolean toggle
  if (field.type === 'boolean') {
    const on = value === 'true';
    return (
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div>
          <span className="text-sm text-[#e8e4f0] font-medium">{field.label}</span>
          {field.hint && <p className={hintCls}>{field.hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => onChange(on ? 'false' : 'true')}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${
            on ? 'bg-[#3a9e6a] border-[#3a9e6a]' : 'bg-[#26263a] border-[#26263a]'
          }`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
    );
  }

  // Select
  if (field.type === 'select' && field.options) {
    return (
      <div>
        <label className={labelCls}>{field.label}</label>
        <select
          className={inputCls + ' appearance-none cursor-pointer'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b677a' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2.25rem' }}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#13131b' }}>{o.label}</option>
          ))}
        </select>
        {field.hint && <p className={hintCls}>{field.hint}</p>}
      </div>
    );
  }

  // Password with show/hide
  if (field.type === 'password') {
    return (
      <div>
        <label className={labelCls}>{field.label}</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            className={inputCls}
            style={{ paddingRight: '2.5rem' }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="(empty = no password)"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b677a] hover:text-[#c8c4d4] transition-colors p-0.5"
            aria-label={showPw ? 'Hide' : 'Show'}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {field.hint && <p className={hintCls}>{field.hint}</p>}
      </div>
    );
  }

  // Text / number
  return (
    <div>
      <label className={labelCls}>{field.label}</label>
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.hint && <p className={hintCls}>{field.hint}</p>}
    </div>
  );
}

// ─── INFO & LOGS ─────────────────────────────────────────────────
function LogsTab() {
  type FileEntry = Awaited<ReturnType<typeof listSaveDir>>['entries'][number];
  type LogData   = Awaited<ReturnType<typeof getServerLogs>>;

  const [entries, setEntries]   = useState<FileEntry[]>([]);
  const [curPath, setCurPath]   = useState('');   // relative to SAVE_DIR
  const [dirError, setDirError] = useState<string | null>(null);
  const [logs, setLogs]         = useState<LogData | null>(null);
  const [search, setSearch]     = useState('');
  const [ldDir, setLdDir]       = useState(false);
  const [ldLogs, setLdLogs]     = useState(false);
  const [dl, setDl]             = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEnd = useRef<HTMLDivElement>(null);

  const loadDir = useCallback(async (subPath: string) => {
    setLdDir(true);
    setDirError(null);
    const r = await listSaveDir(subPath);
    setEntries(r.entries);
    setDirError(r.error);
    setCurPath(subPath);
    setLdDir(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLdLogs(true);
    setLogs(await getServerLogs(search));
    setLdLogs(false);
  }, [search]);

  useEffect(() => { loadDir(''); loadLogs(); }, []);
  useEffect(() => {
    const t = setInterval(loadLogs, 8000);
    return () => clearInterval(t);
  }, [loadLogs]);
  useEffect(() => {
    if (autoScroll) logEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const download = async (rel: string) => {
    setDl(rel);
    const r = await downloadFileZip(rel);
    if (r.success && r.data && r.filename) {
      const bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
      const url   = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
      Object.assign(document.createElement('a'), { href: url, download: r.filename }).click();
      URL.revokeObjectURL(url);
    } else {
      alert(r.msg ?? 'Download failed');
    }
    setDl(null);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  const lineColor = (t: string) =>
    /error|exception|fail/i.test(t) ? 'text-[#f08080]' :
    /warn/i.test(t)                 ? 'text-[#f0c870]' :
    /\bOK\b|saved|success/i.test(t) ? 'text-[#6ddba4]' :
    'text-[#9090a8]';

  // Breadcrumb segments from curPath
  const segments = curPath ? curPath.split('/') : [];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* ── File Browser ── */}
      <div className="flex flex-col flex-[4] min-h-0 bg-[#13131b] border border-[#26263a] rounded-xl overflow-hidden">

        {/* Header + breadcrumb */}
        <div className="px-5 py-3 border-b border-[#1e1e2c] bg-[#191924] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap text-xs min-w-0">
            <HardDrive size={13} className="text-[#6ddba4] shrink-0" />
            {/* Root */}
            <button
              onClick={() => loadDir('')}
              className={`font-medium transition-colors px-1 rounded ${
                segments.length === 0
                  ? 'text-white cursor-default'
                  : 'text-[#6ddba4] hover:text-white hover:bg-[#26263a]'
              }`}
            >
              Saves
            </button>
            {segments.map((seg, i) => {
              const segPath = segments.slice(0, i + 1).join('/');
              const isLast  = i === segments.length - 1;
              return (
                <span key={segPath} className="flex items-center gap-1">
                  <span className="text-[#4a4760]">/</span>
                  <button
                    onClick={() => !isLast && loadDir(segPath)}
                    className={`font-medium transition-colors px-1 rounded ${
                      isLast
                        ? 'text-white cursor-default'
                        : 'text-[#6ddba4] hover:text-white hover:bg-[#26263a]'
                    }`}
                  >
                    {seg}
                  </button>
                </span>
              );
            })}
            <span className="text-[#a0a0bc] bg-[#2e2e44] px-1.5 py-0.5 rounded-full text-[10px] ml-1">
              {entries.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Up button */}
            {segments.length > 0 && (
              <button
                onClick={() => loadDir(segments.slice(0, -1).join('/'))}
                className="flex items-center gap-1 text-[11px] text-[#8a8698] hover:text-[#e8e4f0] px-2 py-1 rounded hover:bg-[#26263a] transition-colors"
              >
                <ChevronRight size={12} className="rotate-180" /> Up
              </button>
            )}
            <button
              onClick={() => loadDir(curPath)} disabled={ldDir}
              className="flex items-center gap-1.5 text-[11px] text-[#8a8698] hover:text-[#e8e4f0] px-2.5 py-1.5 rounded-lg hover:bg-[#1a1a25] transition-colors"
            >
              <RefreshCcw size={12} className={ldDir ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {dirError && (
          <div className="px-5 py-3 text-xs text-[#f08080] border-b border-[#1e1e2c] flex items-center gap-2">
            <AlertCircle size={13} /> {dirError}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left min-w-[500px]">
            <thead className="sticky top-0 bg-[#13131b] z-10 border-b border-[#1e1e2c]">
              <tr>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8]">Name</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] text-right w-28">Size</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] w-44">Modified</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] text-right w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {ldDir && entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs text-[#6b677a]">
                    <RefreshCcw size={14} className="animate-spin inline mr-2" />Loading…
                  </td>
                </tr>
              )}
              {!ldDir && entries.length === 0 && !dirError && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#6b677a]">
                    Empty folder
                  </td>
                </tr>
              )}
              {entries.map((e) => (
                <tr key={e.relativePath} className="border-t border-[#1a1a25] hover:bg-[#1a1a25]/60 transition-colors">
                  <td className="px-4 py-2.5">
                    {e.isDir ? (
                      <button
                        onClick={() => loadDir(e.relativePath)}
                        className="flex items-center gap-2 text-xs text-[#6ddba4] hover:text-white font-medium transition-colors group"
                      >
                        {/* folder icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-80 group-hover:opacity-100">
                          <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z"/>
                        </svg>
                        {e.name}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 text-xs text-[#e8e4f0] font-mono">
                        {/* file icon */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#4a4760]">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {e.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#8a8698] text-right tabular-nums whitespace-nowrap">{e.size}</td>
                  <td className="px-4 py-2.5 text-xs text-[#8a8698] whitespace-nowrap">{fmtDate(e.modified)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => download(e.relativePath)}
                      disabled={dl === e.relativePath}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#c0bccc] border border-[#36364e] rounded-lg hover:bg-[#26263a] hover:text-white disabled:opacity-50 transition-colors"
                    >
                      <Download size={11} />
                      {dl === e.relativePath ? 'Zipping…' : e.isDir ? 'Zip all' : 'Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Logs ── */}
      <div className="flex flex-col flex-[6] min-h-0 bg-[#13131b] border border-[#26263a] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-[#1e1e2c] bg-[#191924]">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-[#0b0b10] border border-[#26263a] rounded-lg px-3 py-1.5 min-w-[180px]">
            <Search size={12} className="text-[#6b677a] shrink-0" />
            <input
              className="flex-1 bg-transparent text-xs text-[#e8e4f0] caret-white placeholder:text-[#4a4760] outline-none"
              placeholder="Filter… (e.g. ERROR, Saving)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#6b677a] hover:text-white text-xs leading-none">✕</button>
            )}
          </div>

          <button
            onClick={loadLogs} disabled={ldLogs}
            className="flex items-center gap-1.5 text-[11px] text-[#8a8698] hover:text-[#e8e4f0] px-2.5 py-1.5 rounded-lg hover:bg-[#1a1a25] transition-colors"
          >
            <RefreshCcw size={12} className={ldLogs ? 'animate-spin' : ''} /> Refresh
          </button>

          <label className="flex items-center gap-1.5 text-[11px] text-[#9090a8] cursor-pointer select-none">
            <input
              type="checkbox" checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3 h-3 accent-[#7a1f2e]"
            />
            Auto-scroll
          </label>

          {logs && (
            <div className="flex items-center gap-2 ml-auto">
              {logs.file && (
                <span className="text-[10px] font-mono text-[#6aaae8] bg-[#6aaae8]/10 border border-[#6aaae8]/20 px-2 py-0.5 rounded">
                  {logs.file}
                </span>
              )}
              <span className="text-[10px] text-[#8a8698]">
                {logs.lines.length.toLocaleString()} / {logs.total.toLocaleString()} lines
              </span>
            </div>
          )}
        </div>

        {/* Log output */}
        <div className="flex-1 min-h-0 bg-[#08080e] font-mono text-xs leading-5 overflow-y-auto">
          {!logs && (
            <div className="flex items-center justify-center gap-2 h-full text-[#6b677a]">
              <RefreshCcw size={14} className="animate-spin" /> Loading…
            </div>
          )}
          {logs && logs.lines.length === 0 && (
            <p className="p-8 text-center text-[#6b677a]">
              {search ? 'No lines match your filter.' : 'No log file found — start the server first.'}
            </p>
          )}
          {logs?.lines.map((line) => (
            <div key={line.num} className="flex hover:bg-white/[0.015]">
              <span className="w-12 shrink-0 text-right pr-3 py-0.5 text-[#4a4760] select-none border-r border-[#26263a]">
                {line.num}
              </span>
              <span className={`px-3 py-0.5 flex-1 break-all ${lineColor(line.text)}`}>
                {line.text}
              </span>
            </div>
          ))}
          <div ref={logEnd} />
        </div>
      </div>
    </div>
  );
}

// ─── MODS ────────────────────────────────────────────────────────
function ModsTab() {
  type ModEntry = Awaited<ReturnType<typeof getMods>>['mods'][number];

  const [mods, setMods]         = useState<ModEntry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy]         = useState<string | null>(null); // folderName being toggled/deleted
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getMods();
    setMods(r.mods);
    setError(r.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const handleToggle = async (mod: ModEntry) => {
    setBusy(mod.folderName);
    await toggleMod(mod.folderName, !mod.enabled);
    await load();
    setBusy(null);
  };

  const handleDelete = async (mod: ModEntry) => {
    if (!confirm(`Delete mod "${mod.name}"? This cannot be undone.`)) return;
    setBusy(mod.folderName);
    const r = await deleteMod(mod.folderName);
    if (!r.success) alert(r.error ?? 'Delete failed');
    await load();
    setBusy(null);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadMsg({ text: 'Only .zip files are supported.', ok: false });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res  = await fetch('/api/install-mod', { method: 'POST', body: form });
      const r    = await res.json();
      if (r.success) {
        setUploadMsg({ text: `Installed: ${r.modName}`, ok: true });
        await load();
      } else {
        setUploadMsg({ text: r.error ?? 'Install failed', ok: false });
      }
    } catch (e: any) {
      setUploadMsg({ text: e.message, ok: false });
    }
    setUploading(false);
  };

  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleUpload(file);
        }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl px-6 py-5 flex flex-col items-center gap-2 transition-colors ${
          dragOver
            ? 'border-[#c45c6a] bg-[#7a1f2e]/10'
            : 'border-[#36364e] hover:border-[#c45c6a]/60 hover:bg-[#1a1a25]/50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
        />
        {uploading ? (
          <RefreshCcw size={22} className="animate-spin text-[#c45c6a]" />
        ) : (
          <Upload size={22} className={dragOver ? 'text-[#c45c6a]' : 'text-[#6b677a]'} />
        )}
        <p className="text-xs text-[#9090a8]">
          {uploading ? 'Installing mod…' : 'Drop .zip mod here or click to browse'}
        </p>
        {uploadMsg && (
          <p className={`text-xs font-medium ${uploadMsg.ok ? 'text-[#6ddba4]' : 'text-[#f08080]'}`}>
            {uploadMsg.ok ? <CheckCircle2 size={12} className="inline mr-1" /> : <AlertCircle size={12} className="inline mr-1" />}
            {uploadMsg.text}
          </p>
        )}
      </div>

      {/* Mod list */}
      <div className="flex flex-col flex-1 min-h-0 bg-[#13131b] border border-[#26263a] rounded-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e2c] bg-[#191924] shrink-0">
          <div className="flex items-center gap-2">
            <Puzzle size={13} className="text-[#c45c6a]" />
            <span className="text-xs font-semibold text-white">Installed Mods</span>
            <span className="text-[10px] font-semibold text-[#a0a0bc] bg-[#2e2e44] px-1.5 py-0.5 rounded-full">{mods.length}</span>
          </div>
          <button
            onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-[11px] text-[#8a8698] hover:text-[#e8e4f0] px-2.5 py-1.5 rounded-lg hover:bg-[#1a1a25] transition-colors"
          >
            <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="px-5 py-2 text-xs text-[#f08080] flex items-center gap-2 border-b border-[#1e1e2c] shrink-0">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left min-w-[480px]">
            <thead className="sticky top-0 bg-[#13131b] z-10 border-b border-[#1e1e2c]">
              <tr>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8]">Mod Name</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] w-24 text-right">Size</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] w-24 text-center">Status</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9090a8] w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && mods.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-xs text-[#6b677a]">
                  <RefreshCcw size={13} className="animate-spin inline mr-2" />Loading…
                </td></tr>
              )}
              {!loading && mods.length === 0 && !error && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-[#6b677a]">
                  No mods installed. Drop a .zip above to install one.
                </td></tr>
              )}
              {mods.map((mod) => (
                <tr key={mod.folderName} className="border-t border-[#1a1a25] hover:bg-[#1a1a25]/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Puzzle size={12} className={mod.enabled ? 'text-[#6ddba4]' : 'text-[#4a4760]'} />
                      <span className={`text-xs font-medium ${mod.enabled ? 'text-[#e8e4f0]' : 'text-[#6b677a] line-through'}`}>
                        {mod.name}
                      </span>
                      {mod.hasModInfo && (
                        <span className="text-[9px] font-semibold text-[#6aaae8] bg-[#6aaae8]/10 border border-[#6aaae8]/20 px-1.5 py-0.5 rounded">
                          ModInfo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#8a8698] text-right tabular-nums">
                    {mod.sizeKb > 1024 ? `${(mod.sizeKb / 1024).toFixed(1)} MB` : `${mod.sizeKb} KB`}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      mod.enabled
                        ? 'text-[#6ddba4] bg-[#6ddba4]/10 border border-[#6ddba4]/20'
                        : 'text-[#6b677a] bg-[#26263a] border border-[#36364e]'
                    }`}>
                      {mod.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggle(mod)}
                        disabled={busy === mod.folderName}
                        title={mod.enabled ? 'Disable mod' : 'Enable mod'}
                        className="p-1.5 rounded-lg border border-[#36364e] text-[#9090a8] hover:text-white hover:bg-[#26263a] disabled:opacity-40 transition-colors"
                      >
                        {mod.enabled
                          ? <ToggleRight size={14} className="text-[#6ddba4]" />
                          : <ToggleLeft size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(mod)}
                        disabled={busy === mod.folderName}
                        title="Delete mod"
                        className="p-1.5 rounded-lg border border-[#36364e] text-[#9090a8] hover:text-[#f08080] hover:border-[#f08080]/40 hover:bg-[#f08080]/5 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="px-5 py-2 border-t border-[#1e1e2c] shrink-0">
          <p className="text-[10px] text-[#4a4760]">
            Mods folder: <span className="font-mono text-[#6b677a]">…\7 Days to Die Dedicated Server\Mods</span>
            &nbsp;·&nbsp;Restart server after changes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 text-xs text-[#a0a0bc] hover:text-white border border-[#36364e] rounded-lg px-3 py-1.5 hover:bg-[#26263a] transition-colors"
    >
      {copied ? <Check size={12} className="text-[#6ddba4]" /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft, ChevronRight, Folder, Upload, FileText, Image as ImageIcon,
  Search, Trash2, Download, Eye, Loader2, ArrowLeft, Plus, MoreVertical,
  File, ExternalLink, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

const PLACEHOLDER = '.emptyFolderPlaceholder';

/** Sanitize a name so it only contains ASCII-safe characters for Supabase Storage keys */
const sanitizeName = (raw: string): string =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ._\-()]/g, '')
    .trim();

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// April 2026 = first month of the new system
const SYSTEM_START = { year: 2026, month: 3 }; // 0-indexed (3 = April)

interface StorageItem {
  name: string;
  id?: string | null;
  metadata?: { size?: number; mimetype?: string };
}

export interface DocumentManagerConfig {
  pageTitle: string;
  pageSubtitle: string;
  bucket: string;
  pathPrefix: string;
  defaultSubfolder: string;
  breadcrumbRoot: string;
  driveLink?: string;
}

export default function DocumentManager({ config }: { config: DocumentManagerConfig }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [path, setPath] = useState<string[]>([]);
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameFileTarget, setRenameFileTarget] = useState<string | null>(null);
  const [renameFileName, setRenameFileName] = useState('');

  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBeforeSystem = config.driveLink
    ? (year < SYSTEM_START.year || (year === SYSTEM_START.year && month < SYSTEM_START.month))
    : false;
  const monthLabel = `${MONTHS[month]} ${year}`;

  const fullPath = config.pathPrefix
    ? (path.length > 0 ? `${config.pathPrefix}/${path.join('/')}` : config.pathPrefix)
    : path.join('/');

  /* ── Fetch items at current path ── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.storage.from(config.bucket).list(fullPath || '', {
      sortBy: { column: 'name', order: 'asc' },
    });
    setItems((data || []).filter(i => i.name !== PLACEHOLDER));
    setLoading(false);
  }, [fullPath, config.bucket]);

  useEffect(() => {
    if (!isBeforeSystem) fetchItems();
  }, [fetchItems, isBeforeSystem]);

  /* ── Month navigation ── */
  const prevMonth = () => {
    setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11; } return m - 1; });
    setPath([]);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0; } return m + 1; });
    setPath([]);
  };

  /* ── Folder navigation ── */
  const openFolder = (name: string) => { setPath(p => [...p, name]); setSearch(''); };
  const goBack = () => { setPath(p => p.slice(0, -1)); setSearch(''); };
  const goToBreadcrumb = (index: number) => { setPath(p => p.slice(0, index)); setSearch(''); };

  /* ── Create new client folder ── */
  const handleCreateFolder = async () => {
    const name = sanitizeName(newFolderName);
    if (!name) return;

    setCreating(true);
    const basePath = path.length > 0 ? `${fullPath}/${name}` : (config.pathPrefix ? `${config.pathPrefix}/${name}` : name);

    try {
      const placeholder = new Blob([''], { type: 'text/plain' });

      const { error: e1 } = await supabase.storage
        .from(config.bucket)
        .upload(`${basePath}/${PLACEHOLDER}`, placeholder, { upsert: true });
      if (e1) throw e1;

      // If at root level, also create default subfolder
      if (path.length === 0) {
        const { error: e2 } = await supabase.storage
          .from(config.bucket)
          .upload(
            `${basePath}/${sanitizeName(config.defaultSubfolder)}/${PLACEHOLDER}`,
            placeholder,
            { upsert: true },
          );
        if (e2) {
          console.error('[DocumentManager] default subfolder upload failed', e2);
          toast.error(`Pasta criada, mas falhou ao criar "${config.defaultSubfolder}": ${e2.message}`);
        }
      }

      toast.success(`Pasta "${name}" criada`);
      setNewFolderOpen(false);
      setNewFolderName('');
      fetchItems();
    } catch (err: any) {
      console.error('[DocumentManager] create folder failed', err);
      toast.error(`Erro ao criar pasta: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setCreating(false);
    }
  };

  /* ── Upload files ── */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let ok = 0;

    for (const file of Array.from(files)) {
      const safeName = sanitizeName(file.name);
      const filePath = fullPath ? `${fullPath}/${safeName}` : safeName;
      const { error } = await supabase.storage.from(config.bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) toast.error(`Erro: ${file.name} — ${error.message}`);
      else ok++;
    }

    if (ok > 0) toast.success(`${ok} arquivo(s) enviado(s)`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchItems();
  };

  /* ── Drag & drop upload ── */
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (path.length === 0) return; // only allow upload inside a client folder
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploading(true);
    let ok = 0;
    for (const file of files) {
      const safeName = sanitizeName(file.name);
      const filePath = fullPath ? `${fullPath}/${safeName}` : safeName;
      const { error } = await supabase.storage.from(config.bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) toast.error(`Erro: ${file.name} — ${error.message}`);
      else ok++;
    }
    if (ok > 0) toast.success(`${ok} arquivo(s) enviado(s)`);
    setUploading(false);
    fetchItems();
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  };

  /* ── Delete ── */
  const handleDeleteFile = async (name: string) => {
    const filePath = fullPath ? `${fullPath}/${name}` : name;
    const { error } = await supabase.storage.from(config.bucket).remove([filePath]);
    if (error) toast.error(`Erro ao excluir: ${error.message}`);
    else { toast.success('Arquivo excluído'); fetchItems(); }
  };

  const handleDeleteFolder = async (name: string) => {
    const folderPath = fullPath ? `${fullPath}/${name}` : name;

    // Recursively collect all file paths inside the folder
    const collectAll = async (prefix: string): Promise<string[]> => {
      const { data } = await supabase.storage.from(config.bucket).list(prefix);
      if (!data || data.length === 0) return [];
      const paths: string[] = [];
      for (const item of data) {
        const itemPath = `${prefix}/${item.name}`;
        if (!item.id) {
          // subfolder — recurse
          paths.push(...await collectAll(itemPath));
        } else {
          paths.push(itemPath);
        }
      }
      return paths;
    };

    try {
      const allPaths = await collectAll(folderPath);
      // Also include the placeholder at root of folder
      allPaths.push(`${folderPath}/${PLACEHOLDER}`);

      if (allPaths.length > 0) {
        const { error } = await supabase.storage.from(config.bucket).remove(allPaths);
        if (error) {
          toast.error(`Erro ao excluir pasta: ${error.message}`);
          return;
        }
      }
      toast.success(`Pasta "${name}" excluída`);
      fetchItems();
    } catch (err: any) {
      toast.error(`Erro ao excluir pasta: ${err.message || 'erro desconhecido'}`);
    }
  };

  /* ── Rename folder ── */
  const handleRenameFolder = async () => {
    if (!renameTarget || !renameName.trim() || renameName.trim() === renameTarget) {
      setRenameTarget(null);
      return;
    }
    const newName = sanitizeName(renameName);
    const oldBase = fullPath ? `${fullPath}/${renameTarget}` : renameTarget;
    const newBase = fullPath ? `${fullPath}/${newName}` : newName;

    setCreating(true);

    // Recursively collect all file paths
    const collectAll = async (prefix: string): Promise<string[]> => {
      const { data } = await supabase.storage.from(config.bucket).list(prefix);
      if (!data || data.length === 0) return [];
      const paths: string[] = [];
      for (const item of data) {
        const itemPath = `${prefix}/${item.name}`;
        if (!item.id) {
          paths.push(...await collectAll(itemPath));
        } else {
          paths.push(itemPath);
        }
      }
      return paths;
    };

    const allPaths = await collectAll(oldBase);

    // Move each file using server-side move (no download/upload)
    for (const oldPath of allPaths) {
      const newPath = oldBase ? oldPath.replace(oldBase, newBase) : oldPath;
      await supabase.storage.from(config.bucket).move(oldPath, newPath);
    }

    toast.success(`Pasta renomeada para "${newName}"`);
    setCreating(false);
    setRenameTarget(null);
    setRenameName('');
    fetchItems();
  };

  /* ── Rename file ── */
  const handleRenameFile = async () => {
    if (!renameFileTarget || !renameFileName.trim() || renameFileName.trim() === renameFileTarget) {
      setRenameFileTarget(null);
      return;
    }
    const newName = sanitizeName(renameFileName);
    const oldPath = fullPath ? `${fullPath}/${renameFileTarget}` : renameFileTarget;
    const newPath = fullPath ? `${fullPath}/${newName}` : newName;

    setCreating(true);
    const { error } = await supabase.storage.from(config.bucket).move(oldPath, newPath);
    if (error) {
      toast.error(`Erro ao renomear: ${error.message}`);
    } else {
      toast.success(`Arquivo renomeado para "${newName}"`);
    }
    setCreating(false);
    setRenameFileTarget(null);
    setRenameFileName('');
    fetchItems();
  };

  /* ── Preview ── */
  const handlePreview = async (name: string) => {
    const filePath = fullPath ? `${fullPath}/${name}` : name;
    const { data } = await supabase.storage.from(config.bucket).createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      const ext = name.split('.').pop()?.toLowerCase() || '';
      setPreviewFile({ name, url: data.signedUrl, type: ext === 'pdf' ? 'pdf' : 'image' });
    }
  };

  /* ── Download ── */
  const handleDownload = async (name: string) => {
    const filePath = fullPath ? `${fullPath}/${name}` : name;
    const { data } = await supabase.storage.from(config.bucket).download(filePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ── Helpers ── */
  const isFolder = (item: StorageItem) => !item.id;

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-400 shrink-0" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || ''))
      return <ImageIcon className="w-5 h-5 text-blue-400 shrink-0" />;
    return <File className="w-5 h-5 text-muted-foreground shrink-0" />;
  };

  const folders = items.filter(i => isFolder(i));
  const files = items.filter(i => !isFolder(i));
  const q = search.toLowerCase();
  const filteredFolders = folders.filter(f => !search || f.name.toLowerCase().includes(q));
  const filteredFiles = files.filter(f => !search || f.name.toLowerCase().includes(q));

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{config.pageTitle}</h1>
        <p className="text-muted-foreground text-sm">{config.pageSubtitle}</p>
      </div>

      {/* Month navigator */}
      <div className="glass-card p-3">
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[150px] text-center">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={nextMonth}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Before system: Google Drive link ── */}
      {isBeforeSystem ? (
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <Folder className="w-12 h-12 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm text-center">
            Os documentos de <strong>{monthLabel}</strong> estão no Google Drive.
          </p>
          <a href={config.driveLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Acessar Google Drive
            </Button>
          </a>
        </div>
      ) : (
        <>
          {/* Breadcrumb */}
          {path.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm flex-wrap">
              <button
                onClick={() => { setPath([]); setSearch(''); }}
                className="text-primary hover:underline"
              >
                {config.breadcrumbRoot}
              </button>
              {path.map((segment, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">/</span>
                  {i < path.length - 1 ? (
                    <button onClick={() => goToBreadcrumb(i + 1)} className="text-primary hover:underline">
                      {segment}
                    </button>
                  ) : (
                    <span className="text-foreground font-medium">{segment}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="glass-card p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 bg-secondary border-border/50 text-sm"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              {path.length > 0 && (
                <Button variant="outline" size="sm" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setNewFolderName(''); setNewFolderOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Nova Pasta
              </Button>
              {path.length > 0 && (
                <>
                  <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <Upload className="w-4 h-4 mr-1" />}
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div
            className={`glass-card p-5 transition-colors ${dragging && path.length > 0 ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum documento ainda</p>
                <p className="text-xs mt-1 opacity-70">
                  {path.length === 0
                    ? 'Clique em "Nova Pasta" para criar a pasta de um cliente'
                    : 'Clique em "Upload" para adicionar arquivos ou "Nova Pasta" para criar subpastas'}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Folders grid */}
                {filteredFolders.length > 0 && (
                  <div>
                    {filteredFiles.length > 0 && (
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">Pastas</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {filteredFolders.map(folder => (
                        <div
                          key={folder.name}
                          className="group flex items-center gap-3 pl-3 pr-1 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/30 hover:border-border/60 cursor-pointer transition-all"
                          onClick={() => openFolder(folder.name)}
                        >
                          <Folder className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-white font-medium flex-1 select-none break-words leading-snug uppercase">
                            {folder.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-background/60 transition-opacity">
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuItem
                                onClick={() => { setRenameTarget(folder.name); setRenameName(folder.name); }}
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteFolder(folder.name)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir pasta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files list */}
                {filteredFiles.length > 0 && (
                  <div>
                    {filteredFolders.length > 0 && (
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">Arquivos</p>
                    )}
                    <div className="space-y-1">
                      {filteredFiles.map(file => (
                        <div
                          key={file.name}
                          className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {getFileIcon(file.name)}
                            <span className="text-sm text-foreground truncate">{file.name}</span>
                            {file.metadata?.size != null && (
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {file.metadata.size >= 1048576
                                  ? `${(file.metadata.size / 1048576).toFixed(1)} MB`
                                  : `${Math.max(1, (file.metadata.size / 1024) | 0)} KB`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(file.name)} title="Visualizar">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(file.name)} title="Download">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenameFileTarget(file.name); setRenameFileName(file.name); }} title="Renomear">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDeleteFile(file.name)} title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={path.length === 0 ? 'Nome do cliente' : 'Nome da pasta'}
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog open={!!renameTarget} onOpenChange={open => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Novo nome"
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRenameFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancelar</Button>
            <Button onClick={handleRenameFolder} disabled={!renameName.trim() || creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Pencil className="w-4 h-4 mr-1" />}
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename file dialog */}
      <Dialog open={!!renameFileTarget} onOpenChange={open => !open && setRenameFileTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Arquivo</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Novo nome do arquivo"
            value={renameFileName}
            onChange={e => setRenameFileName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRenameFile()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFileTarget(null)}>Cancelar</Button>
            <Button onClick={handleRenameFile} disabled={!renameFileName.trim() || creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Pencil className="w-4 h-4 mr-1" />}
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={open => !open && setPreviewFile(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="flex-1 overflow-auto min-h-0">
              {previewFile.type === 'pdf' ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[70vh] rounded-lg border border-border/30"
                  title={previewFile.name}
                />
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full h-auto rounded-lg mx-auto"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

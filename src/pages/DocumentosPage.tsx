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
  File, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const BUCKET = 'documentos';
const PLACEHOLDER = '.emptyFolderPlaceholder';
const DEFAULT_SUBFOLDER = 'Documentos Pessoais';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// April 2026 = first month of the new system
const SYSTEM_START = { year: 2026, month: 3 }; // 0-indexed (3 = April)
const DRIVE_LINK = 'https://drive.google.com/drive/u/0/folders/1s4--xZGI9K7W05kFWl8KHRdpS1E-3fRG';

interface StorageItem {
  name: string;
  id?: string | null;
  metadata?: { size?: number; mimetype?: string };
}

export default function DocumentosPage() {
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

  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBeforeSystem = year < SYSTEM_START.year || (year === SYSTEM_START.year && month < SYSTEM_START.month);
  const monthLabel = `${MONTHS[month]} ${year}`;
  const storagePath = path.join('/');

  /* ── Fetch items at current path ── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.storage.from(BUCKET).list(storagePath || '', {
      sortBy: { column: 'name', order: 'asc' },
    });
    setItems((data || []).filter(i => i.name !== PLACEHOLDER));
    setLoading(false);
  }, [storagePath]);

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
    const name = newFolderName.trim();
    if (!name) return;

    setCreating(true);
    const basePath = path.length > 0 ? `${storagePath}/${name}` : name;

    // Create folder placeholder
    const placeholder = new Blob([''], { type: 'text/plain' });
    await supabase.storage.from(BUCKET).upload(`${basePath}/${PLACEHOLDER}`, placeholder, { upsert: true });

    // If at root level, also create default subfolder
    if (path.length === 0) {
      await supabase.storage.from(BUCKET).upload(
        `${basePath}/${DEFAULT_SUBFOLDER}/${PLACEHOLDER}`,
        placeholder,
        { upsert: true },
      );
    }

    toast.success(`Pasta "${name}" criada`);
    setCreating(false);
    setNewFolderOpen(false);
    setNewFolderName('');
    fetchItems();
  };

  /* ── Upload files ── */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let ok = 0;

    for (const file of Array.from(files)) {
      const filePath = storagePath ? `${storagePath}/${file.name}` : file.name;
      const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
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

  /* ── Delete ── */
  const handleDeleteFile = async (name: string) => {
    const filePath = storagePath ? `${storagePath}/${name}` : name;
    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (error) toast.error(`Erro ao excluir: ${error.message}`);
    else { toast.success('Arquivo excluído'); fetchItems(); }
  };

  const handleDeleteFolder = async (name: string) => {
    const folderPath = storagePath ? `${storagePath}/${name}` : name;
    // List all files recursively in the folder
    const { data: folderItems } = await supabase.storage.from(BUCKET).list(folderPath);
    if (folderItems && folderItems.length > 0) {
      const paths = folderItems.map(i => `${folderPath}/${i.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }
    // Also remove placeholder
    await supabase.storage.from(BUCKET).remove([`${folderPath}/${PLACEHOLDER}`]);
    toast.success(`Pasta "${name}" excluída`);
    fetchItems();
  };

  /* ── Preview ── */
  const handlePreview = async (name: string) => {
    const filePath = storagePath ? `${storagePath}/${name}` : name;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      const ext = name.split('.').pop()?.toLowerCase() || '';
      setPreviewFile({ name, url: data.signedUrl, type: ext === 'pdf' ? 'pdf' : 'image' });
    }
  };

  /* ── Download ── */
  const handleDownload = async (name: string) => {
    const filePath = storagePath ? `${storagePath}/${name}` : name;
    const { data } = await supabase.storage.from(BUCKET).download(filePath);
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
        <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
        <p className="text-muted-foreground text-sm">Gerenciamento de documentos por cliente</p>
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
          <a href={DRIVE_LINK} target="_blank" rel="noopener noreferrer">
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
                Documentos
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
          <div className="glass-card p-5">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {filteredFolders.map(folder => (
                        <div
                          key={folder.name}
                          className="group flex items-center gap-3 pl-3 pr-1 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/30 hover:border-border/60 cursor-pointer transition-all"
                          onClick={() => openFolder(folder.name)}
                        >
                          <Folder className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate flex-1 select-none">
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

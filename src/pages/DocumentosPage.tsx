import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, Folder, FolderOpen, Upload, File, FileText,
  Image, Search, Trash2, Download, Eye, Loader2, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const BUCKET = 'documentos';
const DEFAULT_FOLDERS = ['Documentos Pessoais'];

export default function DocumentosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [items, setItems] = useState<{ name: string; id?: string; metadata?: { size?: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthLabel = `${MONTHS[month]} ${year}`;

  /* ── Fetch distinct client names ── */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('clientes').select('nome').order('nome');
      if (data) {
        const unique = [...new Set(data.map((c: any) => c.nome as string))].sort();
        setClients(unique);
      }
      setLoading(false);
    })();
  }, []);

  /* ── Fetch files when inside a folder ── */
  useEffect(() => {
    if (currentPath.length >= 2) {
      fetchItems();
    } else {
      setItems([]);
    }
  }, [currentPath, monthKey]);

  const storagePath = () => [monthKey, ...currentPath].join('/');

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.storage.from(BUCKET).list(storagePath(), {
      sortBy: { column: 'name', order: 'asc' },
    });
    setItems(
      (data || []).filter(i => i.name !== '.emptyFolderPlaceholder'),
    );
    setLoading(false);
  };

  /* ── Month navigation ── */
  const prevMonth = () => {
    setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11; } return m - 1; });
    setCurrentPath([]);
  };
  const nextMonth = () => {
    setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0; } return m + 1; });
    setCurrentPath([]);
  };

  /* ── Folder navigation ── */
  const openFolder = (name: string) => { setCurrentPath(p => [...p, name]); setSearch(''); };
  const goBack = () => { setCurrentPath(p => p.slice(0, -1)); setSearch(''); };
  const goToBreadcrumb = (index: number) => { setCurrentPath(p => p.slice(0, index)); setSearch(''); };

  /* ── Upload ── */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const base = storagePath();
    let ok = 0;

    for (const file of Array.from(files)) {
      const { error } = await supabase.storage.from(BUCKET).upload(
        `${base}/${file.name}`,
        file,
        { cacheControl: '3600', upsert: true },
      );
      if (error) toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
      else ok++;
    }

    if (ok > 0) toast.success(`${ok} arquivo(s) enviado(s)`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchItems();
  };

  /* ── Delete ── */
  const handleDelete = async (name: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([`${storagePath()}/${name}`]);
    if (error) toast.error(`Erro ao excluir: ${error.message}`);
    else { toast.success('Arquivo excluído'); fetchItems(); }
  };

  /* ── Preview ── */
  const handlePreview = async (name: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(`${storagePath()}/${name}`, 3600);
    if (data?.signedUrl) {
      const ext = name.split('.').pop()?.toLowerCase() || '';
      setPreviewFile({ name, url: data.signedUrl, type: ext === 'pdf' ? 'pdf' : 'image' });
    }
  };

  /* ── Download ── */
  const handleDownload = async (name: string) => {
    const { data } = await supabase.storage.from(BUCKET).download(`${storagePath()}/${name}`);
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
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-400 shrink-0" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || ''))
      return <Image className="w-5 h-5 text-blue-400 shrink-0" />;
    return <File className="w-5 h-5 text-muted-foreground shrink-0" />;
  };

  const isAtRoot = currentPath.length === 0;
  const isAtClient = currentPath.length === 1;
  const isInsideFolder = currentPath.length >= 2;

  const filteredClients = clients.filter(c => !search || c.toLowerCase().includes(search.toLowerCase()));
  const filteredItems = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
        <p className="text-muted-foreground text-sm">Gerenciamento de documentos por cliente</p>
      </div>

      {/* Month navigator */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-lg font-semibold text-foreground min-w-[180px] text-center">
            {monthLabel}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {currentPath.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm flex-wrap">
          <button
            onClick={() => { setCurrentPath([]); setSearch(''); }}
            className="text-primary hover:underline"
          >
            {monthLabel}
          </button>
          {currentPath.map((segment, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">/</span>
              {i < currentPath.length - 1 ? (
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

      {/* Search + actions */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isAtRoot ? 'Buscar cliente...' : 'Buscar arquivo...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border/50"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          {!isAtRoot && (
            <Button variant="outline" size="sm" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          {isInsideFolder && (
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

      {/* Content area */}
      <div className="glass-card p-6">
        {loading && currentPath.length >= 2 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isAtRoot ? (
          /* ── Level 1: Client folders ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredClients.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">
                Nenhum cliente encontrado
              </p>
            )}
            {filteredClients.map(client => (
              <button
                key={client}
                onClick={() => openFolder(client)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-secondary/60 transition-colors group"
              >
                <Folder className="w-10 h-10 text-amber-400 group-hover:hidden" />
                <FolderOpen className="w-10 h-10 text-amber-400 hidden group-hover:block" />
                <span className="text-xs text-foreground font-medium text-center truncate w-full">
                  {client}
                </span>
              </button>
            ))}
          </div>
        ) : isAtClient ? (
          /* ── Level 2: Default subfolders ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {DEFAULT_FOLDERS.map(folder => (
              <button
                key={folder}
                onClick={() => openFolder(folder)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-secondary/60 transition-colors group"
              >
                <Folder className="w-10 h-10 text-blue-400 group-hover:hidden" />
                <FolderOpen className="w-10 h-10 text-blue-400 hidden group-hover:block" />
                <span className="text-xs text-foreground font-medium text-center">{folder}</span>
              </button>
            ))}
          </div>
        ) : (
          /* ── Level 3: Files ── */
          <div>
            {filteredItems.length === 0 && !uploading && (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum documento ainda</p>
                <p className="text-xs mt-1">Clique em Upload para adicionar arquivos</p>
              </div>
            )}
            <div className="space-y-1">
              {filteredItems.map(item => {
                const isFolder = !item.id;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isFolder ? (
                        <button
                          onClick={() => openFolder(item.name)}
                          className="flex items-center gap-3 min-w-0"
                        >
                          <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                          <span className="text-sm text-foreground truncate">{item.name}</span>
                        </button>
                      ) : (
                        <>
                          {getFileIcon(item.name)}
                          <span className="text-sm text-foreground truncate">{item.name}</span>
                          {item.metadata?.size && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {item.metadata.size >= 1048576
                                ? `${(item.metadata.size / 1048576).toFixed(1)} MB`
                                : `${(item.metadata.size / 1024).toFixed(0)} KB`}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {!isFolder && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handlePreview(item.name)} title="Visualizar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handleDownload(item.name)} title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                          onClick={() => handleDelete(item.name)} title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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

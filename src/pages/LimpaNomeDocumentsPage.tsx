import DocumentManager from '@/components/DocumentManager';

const config = {
  pageTitle: 'Limpa Nome',
  pageSubtitle: 'Gerenciamento de documentos de Limpa Nome por cliente',
  bucket: 'documentos',
  pathPrefix: 'limpa-nome',
  defaultSubfolder: 'Documentos Limpa Nome',
  breadcrumbRoot: 'Limpa Nome',
};

export default function LimpaNomeDocumentsPage() {
  return <DocumentManager config={config} />;
}

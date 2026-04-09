import DocumentManager from '@/components/DocumentManager';

const config = {
  pageTitle: 'Limpa Nome',
  pageSubtitle: 'Gerenciamento de documentos de Limpa Nome por cliente',
  bucket: 'documentos',
  pathPrefix: '',
  defaultSubfolder: 'Documentos Pessoais',
  breadcrumbRoot: 'Limpa Nome',
  driveLink: 'https://drive.google.com/drive/u/0/folders/1s4--xZGI9K7W05kFWl8KHRdpS1E-3fRG',
};

export default function DocumentosPage() {
  return <DocumentManager config={config} />;
}

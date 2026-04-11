import DocumentManager from '@/components/DocumentManager';

const config = {
  pageTitle: 'Rating',
  pageSubtitle: 'Gerenciamento de documentos de Rating por cliente',
  bucket: 'documentos',
  pathPrefix: 'rating',
  defaultSubfolder: 'Documentos Pessoais',
  breadcrumbRoot: 'Rating',
  driveLink: 'https://drive.google.com/drive/u/2/folders/1mzu3pD6hG9ZejrFCAWdcMEwPtKZwBVTp',
};

export default function RatingDocumentsPage() {
  return <DocumentManager config={config} />;
}

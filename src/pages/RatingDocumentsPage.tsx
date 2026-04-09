import DocumentManager from '@/components/DocumentManager';

const config = {
  pageTitle: 'Rating',
  pageSubtitle: 'Gerenciamento de documentos de Rating por cliente',
  bucket: 'documentos',
  pathPrefix: 'rating',
  defaultSubfolder: 'Documentos Rating',
  breadcrumbRoot: 'Rating',
};

export default function RatingDocumentsPage() {
  return <DocumentManager config={config} />;
}

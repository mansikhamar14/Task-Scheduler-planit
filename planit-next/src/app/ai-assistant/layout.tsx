import PageWrapper from '@/components/page-wrapper';

export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageWrapper>{children}</PageWrapper>;
}

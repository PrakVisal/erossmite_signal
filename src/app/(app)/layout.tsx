import Header from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="page">{children}</main>
      <footer className="foot">
        Rule-based signals for decision support, not financial advice. Test on a demo account first.
      </footer>
    </>
  );
}

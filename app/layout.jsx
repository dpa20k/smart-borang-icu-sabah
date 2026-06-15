import "../styles.css";

export const metadata = {
  title: "Smart Borang ICU Sabah",
  description: "Sistem Pengurusan Borang Bersepadu ICU JPM Sabah"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}

export const metadata = {
  title: "QDT Control Room",
  description: "Hybrid Quantum–Classical Digital Twin Prototype (TRL4)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0, padding: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
          {children}
        </div>
      </body>
    </html>
  );
}

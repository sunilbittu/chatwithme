import './globals.css';

export const metadata = {
  title: 'chatwithme',
  description: 'Chatbot powered by NVIDIA NIM',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import { ThemeProvider } from '@/components/providers/theme-provider'
import Header from '@/components/Header'
import "./globals.css";
import type { Metadata } from "next";
import Footer from "./components/Footer";
import { ToastContainer } from "./components/useToast";

export const metadata: Metadata = {
  title: "Lil-T Dashboard",
  description: "Mindmap/Concept-Map Editor",
};

export default function RootLayout({children}:{children: React.ReactNode}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-dvh bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <ThemeProvider>
        <Header />
        
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <Footer />
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            const root=document.documentElement;
            const key="lil-theme";
            const saved=localStorage.getItem(key);
            if(saved){ root.classList.toggle('dark', saved==='dark'); }
            document.addEventListener('click', (e)=>{
              const t=e.target as HTMLElement;
              if(t && t.id==='themeToggle'){
                const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
                document.documentElement.classList.toggle('dark', next==='dark');
                localStorage.setItem(key, next);
                dispatchEvent(new CustomEvent('toast',{detail:{msg:'Theme: '+next}}));
              }
            }, true);
          })();
        `}} />
        <ToastContainer />
            </ThemeProvider>
  </body>
    </html>
  );
}

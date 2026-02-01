import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase_url')) {
  document.body.innerHTML = `
    <div style="font-family: sans-serif; padding: 2rem; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; margin: 2rem; border-radius: 4px;">
      <h1 style="margin-top: 0;">Error de Configuración</h1>
      <p>No se encontraron las credenciales de Supabase o son incorrectas.</p>
      <p>⚠️ Asegúrate de cumplir lo siguiente:</p>
      <ol>
        <li>El archivo <strong>.env</strong> existe en la raíz del proyecto (no .env.example).</li>
        <li>Contiene <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong>.</li>
        <li>Has guardado el archivo y reiniciado la terminal (<code>npm run dev</code>).</li>
      </ol>
      <p>Valor actual URL: ${supabaseUrl || '(Vacío)'}</p>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

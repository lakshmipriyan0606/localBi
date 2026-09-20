'use client';

import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Global Toast Provider for Next.js App Router
 * Renders the react-toastify portal with smooth slide animations,
 * zero layout shift, and enterprise design tokens.
 */
export function ToastProvider() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme="light"
      transition={Slide}
      className="!z-[99999]"
      toastClassName="!rounded-2xl !shadow-xl !border !border-slate-100 !font-sans !text-xs !leading-relaxed"
    />
  );
}

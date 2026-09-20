'use client';

export function GoBackButton() {
  return (
    <button
      id="not-found-go-back-btn"
      onClick={() => history.back()}
      type="button"
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
      Go Back
    </button>
  );
}

import { toast, ToastOptions, Slide, Id } from 'react-toastify';
import { AppApiError } from './http/api-error';

/**
 * Standard enterprise toast configuration with instant animation and clean layout.
 */
export const defaultToastConfig: ToastOptions = {
  position: 'top-right',
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  transition: Slide,
};

/**
 * Safely extracts user-friendly error message from any error shape.
 */
export function extractErrorMessage(err: unknown, defaultMessage = 'An unexpected error occurred'): string {
  if (!err) return defaultMessage;
  if (err instanceof AppApiError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return defaultMessage;
}

/**
 * Global reusable notification client built on react-toastify.
 */
export const notify = {
  /**
   * Dispatches a success toast with slide animation.
   */
  success: (message: string, options?: ToastOptions): Id => {
    return toast.success(message, { ...defaultToastConfig, ...options });
  },

  /**
   * Dispatches an error toast with slide animation and safe message extraction.
   */
  error: (message: string | unknown, options?: ToastOptions): Id => {
    const text = typeof message === 'string' ? message : extractErrorMessage(message);
    return toast.error(text, { ...defaultToastConfig, autoClose: 4500, ...options });
  },

  /**
   * Dispatches an informational toast.
   */
  info: (message: string, options?: ToastOptions): Id => {
    return toast.info(message, { ...defaultToastConfig, ...options });
  },

  /**
   * Dispatches a warning toast.
   */
  warning: (message: string, options?: ToastOptions): Id => {
    return toast.warning(message, { ...defaultToastConfig, ...options });
  },

  /**
   * Dispatches an animated promise lifecycle toast (loading -> success or error).
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string | ((data: T) => string);
      error?: string | ((err: unknown) => string);
    },
    options?: ToastOptions
  ) => {
    return toast.promise(
      promise,
      {
        pending: messages.pending,
        success: typeof messages.success === 'function'
          ? { render: ({ data }) => (messages.success as (d: unknown) => string)(data) }
          : messages.success,
        error: messages.error
          ? typeof messages.error === 'function'
            ? { render: ({ data }) => (messages.error as (err: unknown) => string)(data) }
            : messages.error
          : { render: ({ data }) => extractErrorMessage(data) },
      },
      { ...defaultToastConfig, ...options }
    );
  },

  /**
   * Programmatically dismisses a toast or all active toasts.
   */
  dismiss: (id?: Id) => {
    toast.dismiss(id);
  },
};

/**
 * Universal async wrapper to execute any API action with animated toast feedback.
 */
export async function withToast<T>(
  action: () => Promise<T>,
  messages: {
    loading?: string;
    success?: string | ((result: T) => string);
    error?: string | ((err: unknown) => string);
  }
): Promise<T> {
  let toastId: Id | undefined;
  if (messages.loading) {
    toastId = toast.loading(messages.loading, defaultToastConfig);
  }

  try {
    const result = await action();
    if (toastId) {
      if (messages.success) {
        const successMsg = typeof messages.success === 'function' ? messages.success(result) : messages.success;
        toast.update(toastId, {
          render: successMsg,
          type: 'success',
          isLoading: false,
          autoClose: 3500,
          ...defaultToastConfig,
        });
      } else {
        toast.dismiss(toastId);
      }
    } else if (messages.success) {
      const successMsg = typeof messages.success === 'function' ? messages.success(result) : messages.success;
      notify.success(successMsg);
    }
    return result;
  } catch (err) {
    const errorMsg = messages.error
      ? typeof messages.error === 'function'
        ? messages.error(err)
        : messages.error
      : extractErrorMessage(err);

    if (toastId) {
      toast.update(toastId, {
        render: errorMsg,
        type: 'error',
        isLoading: false,
        autoClose: 5000,
        ...defaultToastConfig,
      });
    } else {
      notify.error(errorMsg);
    }
    throw err;
  }
}

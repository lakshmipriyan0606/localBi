import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify, withToast, extractErrorMessage } from '@/lib/notify';
import { AppApiError } from '@/lib/http/api-error';
import { toast } from 'react-toastify';

vi.mock('react-toastify', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-toastify');
  return {
    ...actual,
    toast: {
      success: vi.fn().mockReturnValue('toast-1'),
      error: vi.fn().mockReturnValue('toast-2'),
      info: vi.fn().mockReturnValue('toast-3'),
      warning: vi.fn().mockReturnValue('toast-4'),
      loading: vi.fn().mockReturnValue('toast-loading'),
      update: vi.fn(),
      dismiss: vi.fn(),
      promise: vi.fn(),
    },
    Slide: 'slide-animation',
  };
});

describe('Notification Service (notify & withToast)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractErrorMessage', () => {
    it('returns default message on falsy error', () => {
      expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
      expect(extractErrorMessage(undefined, 'Fallback error')).toBe('Fallback error');
    });

    it('extracts string directly', () => {
      expect(extractErrorMessage('Direct error message')).toBe('Direct error message');
    });

    it('extracts message from standard Error', () => {
      expect(extractErrorMessage(new Error('Standard JS error'))).toBe('Standard JS error');
    });

    it('extracts message from AppApiError', () => {
      const apiErr = new AppApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Resource not found in tenant database',
      });
      expect(extractErrorMessage(apiErr)).toBe('Resource not found in tenant database');
    });

    it('extracts message from object with message property', () => {
      expect(extractErrorMessage({ message: 'Object error message' })).toBe('Object error message');
    });
  });

  describe('notify methods', () => {
    it('calls toast.success with default slide animation config', () => {
      notify.success('Action successful!');
      expect(toast.success).toHaveBeenCalledWith(
        'Action successful!',
        expect.objectContaining({
          position: 'top-right',
          autoClose: 3500,
          transition: 'slide-animation',
        })
      );
    });

    it('calls toast.error with extracted message', () => {
      const err = new Error('Database connection failed');
      notify.error(err);
      expect(toast.error).toHaveBeenCalledWith(
        'Database connection failed',
        expect.objectContaining({
          position: 'top-right',
          autoClose: 4500,
        })
      );
    });

    it('calls toast.info and toast.warning', () => {
      notify.info('Informational note');
      expect(toast.info).toHaveBeenCalledWith('Informational note', expect.any(Object));

      notify.warning('Caution advised');
      expect(toast.warning).toHaveBeenCalledWith('Caution advised', expect.any(Object));
    });
  });

  describe('withToast async wrapper', () => {
    it('shows loading toast and updates to success on resolved action', async () => {
      const action = vi.fn().mockResolvedValue({ id: '123', status: 'OK' });

      const result = await withToast(action, {
        loading: 'Connecting to service…',
        success: 'Connected successfully!',
      });

      expect(action).toHaveBeenCalled();
      expect(toast.loading).toHaveBeenCalledWith('Connecting to service…', expect.any(Object));
      expect(toast.update).toHaveBeenCalledWith(
        'toast-loading',
        expect.objectContaining({
          render: 'Connected successfully!',
          type: 'success',
          isLoading: false,
        })
      );
      expect(result).toEqual({ id: '123', status: 'OK' });
    });

    it('shows loading toast and updates to error on rejected action', async () => {
      const action = vi.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(
        withToast(action, {
          loading: 'Triggering background sync…',
          success: 'Sync completed!',
        })
      ).rejects.toThrow('Network timeout');

      expect(toast.update).toHaveBeenCalledWith(
        'toast-loading',
        expect.objectContaining({
          render: 'Network timeout',
          type: 'error',
          isLoading: false,
        })
      );
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrandTable } from '@/features/brands/components/brand-table';
import { BrandCreateDialog } from '@/features/brands/components/brand-create-dialog';
import { BrandEditDialog } from '@/features/brands/components/brand-edit-dialog';
import { BrandDto } from '@/features/brands/types/brand-dto';
import { browserClient } from '@/lib/http/browser-client';

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('Brands Feature Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockBrands: BrandDto[] = [
    {
      id: 'b-1',
      name: 'Acme Coffee',
      slug: 'acme-coffee',
      status: 'ACTIVE',
      version: 2,
      createdAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'b-2',
      name: 'Acme Bakery',
      slug: 'acme-bakery',
      status: 'ARCHIVED',
      version: 1,
      createdAt: '2026-02-10T00:00:00.000Z',
    },
  ];

  it('renders brand list table with status badges and actions', () => {
    renderWithQueryClient(
      <BrandTable
        tenantSlug="acme-corp"
        brands={mockBrands}
        isLoading={false}
      />
    );

    expect(screen.getByText('Acme Coffee')).toBeInTheDocument();
    expect(screen.getByText('acme-coffee')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();

    expect(screen.getByText('Acme Bakery')).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();
  });

  it('renders empty state when brand list is empty', () => {
    renderWithQueryClient(
      <BrandTable
        tenantSlug="acme-corp"
        brands={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText(/no brands found/i)).toBeInTheDocument();
  });

  it('opens create brand dialog and auto-generates slug from name', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<BrandCreateDialog tenantSlug="acme-corp" />);

    const openBtn = screen.getByRole('button', { name: /add brand/i });
    await user.click(openBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new brand/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/brand name/i);
    await user.type(nameInput, 'Blue Bottle Coffee');

    const slugInput = screen.getByLabelText(/brand slug/i) as HTMLInputElement;
    expect(slugInput.value).toBe('blue-bottle-coffee');
  });

  it('opens edit brand dialog with existing version information', async () => {
    const brandToEdit = mockBrands[0]!;
    const mockOnOpenChange = vi.fn();

    renderWithQueryClient(
      <BrandEditDialog
        tenantSlug="acme-corp"
        brand={brandToEdit}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByRole('heading', { name: /edit brand/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Coffee')).toBeInTheDocument();
    expect(screen.getByText(/optimistic concurrency lock/i)).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('submits brand creation with valid input', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({
      data: { brand: { id: 'b-new', name: 'Roastery', slug: 'roastery' } },
    });

    renderWithQueryClient(<BrandCreateDialog tenantSlug="acme-corp" />);

    const openBtn = screen.getByRole('button', { name: /add brand/i });
    await user.click(openBtn);

    const nameInput = screen.getByLabelText(/brand name/i);
    await user.type(nameInput, 'Roastery');

    const submitBtn = screen.getByRole('button', { name: /^create brand$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(browserClient.post).toHaveBeenCalledWith(
        '/tenants/acme-corp/brands',
        expect.objectContaining({ name: 'Roastery', slug: 'roastery' })
      );
    });
  });
});

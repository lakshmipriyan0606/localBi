// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationTable } from '@/features/locations/components/location-table';
import { LocationCreateDialog } from '@/features/locations/components/location-create-dialog';
import { LocationEditDialog } from '@/features/locations/components/location-edit-dialog';
import { LocationDto, BrandOptionDto } from '@/features/locations/types/location-dto';
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

describe('Locations Feature Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockBrands: BrandOptionDto[] = [
    { id: 'b-1', name: 'Acme Coffee' },
    { id: 'b-2', name: 'Acme Roasters' },
  ];

  const mockLocations: LocationDto[] = [
    {
      id: 'loc-1',
      brandId: 'b-1',
      brandName: 'Acme Coffee',
      storeCode: 'STORE-101',
      name: 'Downtown Flagship',
      addressLine1: '100 Broadway',
      city: 'New York',
      stateRegion: 'NY',
      postalCode: '10001',
      countryCode: 'US',
      timezone: 'America/New_York',
      status: 'ACTIVE',
      version: 1,
      createdAt: '2026-02-01T00:00:00.000Z',
    },
    {
      id: 'loc-2',
      brandId: 'b-1',
      brandName: 'Acme Coffee',
      storeCode: 'STORE-102',
      name: 'Uptown Branch',
      addressLine1: '500 5th Ave',
      city: 'New York',
      stateRegion: 'NY',
      postalCode: '10018',
      countryCode: 'US',
      timezone: 'America/New_York',
      status: 'ARCHIVED',
      version: 3,
      createdAt: '2026-02-05T00:00:00.000Z',
    },
  ];

  it('renders location table rows with store code, address, and status', () => {
    renderWithQueryClient(
      <LocationTable
        tenantSlug="acme-corp"
        locations={mockLocations}
        isLoading={false}
      />
    );

    expect(screen.getByText('STORE-101')).toBeInTheDocument();
    expect(screen.getByText('Downtown Flagship')).toBeInTheDocument();
    expect(screen.getByText('100 Broadway')).toBeInTheDocument();
    expect(screen.getAllByText(/America\/New_York/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('active')).toBeInTheDocument();

    expect(screen.getByText('STORE-102')).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();
  });

  it('renders empty state when location list is empty', () => {
    renderWithQueryClient(
      <LocationTable
        tenantSlug="acme-corp"
        locations={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText(/no locations found/i)).toBeInTheDocument();
  });

  it('opens create location dialog with brand options', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <LocationCreateDialog tenantSlug="acme-corp" brands={mockBrands} />
    );

    const addBtn = screen.getByRole('button', { name: /add location/i });
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /register new location/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('option', { name: 'Acme Coffee' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Acme Roasters' })).toBeInTheDocument();
  });

  it('submits location creation with valid fields', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({
      data: { location: { id: 'loc-new', storeCode: 'STORE-999' } },
    });

    renderWithQueryClient(
      <LocationCreateDialog tenantSlug="acme-corp" brands={mockBrands} />
    );

    const addBtn = screen.getByRole('button', { name: /add location/i });
    await user.click(addBtn);

    const codeInput = screen.getByLabelText(/store code/i);
    const nameInput = screen.getByLabelText(/location name/i);
    const addressInput = screen.getByLabelText(/street address/i);
    const cityInput = screen.getByLabelText(/city/i);
    const stateInput = screen.getByLabelText(/state \/ region/i);
    const postalInput = screen.getByLabelText(/postal code/i);

    await user.type(codeInput, 'STORE-999');
    await user.type(nameInput, 'Soho Branch');
    await user.type(addressInput, '75 Spring St');
    await user.type(cityInput, 'New York');
    await user.type(stateInput, 'NY');
    await user.type(postalInput, '10012');

    const submitBtn = screen.getByRole('button', { name: /^register location$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(browserClient.post).toHaveBeenCalledWith(
        '/tenants/acme-corp/locations',
        expect.objectContaining({
          storeCode: 'STORE-999',
          name: 'Soho Branch',
          city: 'New York',
        })
      );
    });
  });

  it('opens edit location dialog with existing version information', async () => {
    const locationToEdit = mockLocations[0]!;
    const mockOnOpenChange = vi.fn();

    renderWithQueryClient(
      <LocationEditDialog
        tenantSlug="acme-corp"
        location={locationToEdit}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByRole('heading', { name: /edit location/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('STORE-101')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Downtown Flagship')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });
});

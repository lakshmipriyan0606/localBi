'use client';

import { useState } from 'react';
import { useGbpProfile, useUpdateGbpProfile, useGbpVerificationState } from '../hooks/use-gbp-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ShieldAlert, ShieldCheck, MapPin, Store, Clock, Phone, Globe } from 'lucide-react';
import { useReportsQueryState } from '../hooks/use-reports-query-state';
import { NiceSelect } from '@/components/ui/nice-select';

export interface GbpProfileEditorProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; brandId: string }>;
  initialBrandId: string;
  isConnected: boolean;
}

export function GbpProfileEditor({ tenantSlug, locations, initialBrandId, isConnected }: GbpProfileEditorProps) {
  const { state, setLocationId } = useReportsQueryState({
    brandId: initialBrandId,
  });

  const selectedLocationId = state.locationId || locations[0]?.id;
  const { data: profile, isLoading, isError } = useGbpProfile(tenantSlug, selectedLocationId || '');
  const { data: verification } = useGbpVerificationState(tenantSlug, selectedLocationId || '');
  const updateMutation = useUpdateGbpProfile();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const handleEdit = () => {
    setFormData({
      title: profile?.title || '',
      primaryPhone: profile?.phoneNumbers?.primaryPhone || '',
      websiteUri: profile?.websiteUri || '',
    });
    setEditMode(true);
  };

  const handleSave = () => {
    updateMutation.mutate(
      {
        tenantSlug,
        locationId: selectedLocationId!,
        updateMask: 'title,phoneNumbers.primaryPhone,websiteUri',
        data: {
          title: formData.title,
          phoneNumbers: { primaryPhone: formData.primaryPhone },
          websiteUri: formData.websiteUri,
        },
      },
      {
        onSuccess: () => {
          setEditMode(false);
        },
      }
    );
  };

  if (!isConnected) {
    return (
      <div className="bg-white border rounded-xl p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Google Integration Required</h3>
        <p className="text-slate-500 mt-2">Connect your Google Business Profile to manage profile information.</p>
      </div>
    );
  }

  const locationOptions = locations.map(l => ({ id: l.id, name: l.name, value: l.id, label: l.name }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Profile Editor</h2>
          <p className="text-sm text-slate-500">Manage business information on Google</p>
        </div>
        <div className="w-64">
          <NiceSelect
            options={locationOptions}
            value={selectedLocationId || ''}
            onChange={(val) => setLocationId(val)}
            placeholder="Select Location"
          />
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-100 rounded w-1/3"></div>
            <div className="h-32 bg-slate-100 rounded"></div>
          </div>
        ) : isError ? (
          <div className="text-red-500 flex items-center gap-2 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="w-5 h-5" /> Error loading profile.
          </div>
        ) : profile ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-slate-500" /> Basic Information
                </h3>
                {!editMode ? (
                  <Button variant="outline" size="sm" onClick={handleEdit}>Edit Info</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>Business Name</Label>
                  {editMode ? (
                    <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-900 font-medium">{profile.title}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Primary Phone</Label>
                    {editMode ? (
                      <Input value={formData.primaryPhone} onChange={e => setFormData({...formData, primaryPhone: e.target.value})} />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg text-slate-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" /> {profile.phoneNumbers?.primaryPhone || 'Not set'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    {editMode ? (
                      <Input value={formData.websiteUri} onChange={e => setFormData({...formData, websiteUri: e.target.value})} />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg text-slate-700 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" /> {profile.websiteUri || 'Not set'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-slate-500" /> Location Details
                </h3>
                <div className="p-4 bg-slate-50 rounded-lg text-slate-700">
                  {profile.storefrontAddress?.addressLines?.join(', ')}<br/>
                  {profile.storefrontAddress?.locality}, {profile.storefrontAddress?.administrativeArea} {profile.storefrontAddress?.postalCode}<br/>
                  {profile.storefrontAddress?.regionCode}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border rounded-xl p-5 bg-slate-50/50">
                <h4 className="font-medium text-sm text-slate-900 mb-4">Verification Status</h4>
                {verification?.verifications?.length > 0 ? (
                  verification.verifications.some((v: any) => v.state === 'VERIFIED') ? (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-700">Verified</p>
                        <p className="text-xs text-slate-500 mt-1">This location is verified and publicly visible on Google.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-amber-700">Pending Verification</p>
                        <p className="text-xs text-slate-500 mt-1">Check Google Business Profile to complete verification.</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-200 rounded-full text-slate-600">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Unverified</p>
                      <p className="text-xs text-slate-500 mt-1">This location needs to be verified.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border rounded-xl p-5 bg-slate-50/50">
                <h4 className="font-medium text-sm text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" /> Regular Hours
                </h4>
                {profile.regularHours?.periods?.length > 0 ? (
                  <div className="space-y-2 text-sm text-slate-600">
                    {profile.regularHours.periods.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span className="capitalize">{p.openDay.toLowerCase()}</span>
                        <span>{p.openTime.hours}:{p.openTime.minutes === 0 ? '00' : p.openTime.minutes} - {p.closeTime.hours}:{p.closeTime.minutes === 0 ? '00' : p.closeTime.minutes}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No hours specified.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">Select a location to view its profile.</div>
        )}
      </div>
    </div>
  );
}

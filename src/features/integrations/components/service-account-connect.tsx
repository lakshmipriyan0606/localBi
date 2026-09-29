'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Key, LogIn, Save, AlertCircle } from 'lucide-react';

export interface GoogleIntegrationConnectProps {
  /** Callback fired when the connection is successfully verified and saved */
  onSuccess?: (config: { ga4PropertyId: string; gscSiteUrl: string }) => void;
  /** Callback fired when the user clicks 'Sign in with Google' */
  onOAuthConnect?: () => void;
}

export function GoogleIntegrationConnect({ onSuccess, onOAuthConnect }: GoogleIntegrationConnectProps = {}) {
  const [activeTab, setActiveTab] = useState<'oauth' | 'service'>('oauth');
  const [ga4Id, setGa4Id] = useState('');
  const [gscUrl, setGscUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<{
    ga4?: { success: boolean; message: string };
    gsc?: { success: boolean; message: string };
  } | null>(null);

  // In a real scenario, this email should be fetched from the backend via an API
  const serviceAccountEmail = 'localbi-data-fetcher@localbi-508918.iam.gserviceaccount.com';

  const handleServiceAccountVerify = async () => {
    setIsLoading(true);
    setResults(null);
    setErrorMessage(null);
    try {
      // 1. Verify the connection using our verify API
      const verifyResponse = await fetch('/api/integrations/google/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga4PropertyId: ga4Id, gscSiteUrl: gscUrl }),
      });
      const data = await verifyResponse.json();

      if (!data.success) {
        setErrorMessage('Verification request failed: ' + (data.error || 'Unknown error'));
        return;
      }

      setResults(data.results);

      // 2. Block saving if GA4 validation failed
      if (ga4Id && data.results?.ga4 && !data.results.ga4.success) {
        setErrorMessage(
          `GA4 Property ID "${ga4Id}" is not valid or the service account does not have access. ` +
          `Please check the ID and make sure you have added the service account email as a Viewer in Google Analytics.`
        );
        return;
      }

      // 3. Block saving if GSC validation failed
      if (gscUrl && data.results?.gsc && !data.results.gsc.success) {
        setErrorMessage(
          `GSC Site URL "${gscUrl}" could not be verified. ` +
          `Please check the URL and make sure the service account has access in Google Search Console.`
        );
        return;
      }

      // 4. All validations passed — trigger save callback
      if (onSuccess) {
        onSuccess({ ga4PropertyId: ga4Id, gscSiteUrl: gscUrl });
      }
    } catch (error) {
      setErrorMessage('Network error occurred while trying to verify. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    if (onOAuthConnect) {
      onOAuthConnect();
    } else {
      alert("Redirecting to Google OAuth Login...");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-3xl overflow-hidden">
      
      {/* Header Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('oauth')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'oauth' 
              ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' 
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Connect via Google (Recommended)
        </button>
        <button
          onClick={() => setActiveTab('service')}
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'service' 
              ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' 
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Key className="w-4 h-4" />
          Connect via Service Account
        </button>
      </div>

      <div className="p-6">
        {/* =========================================
            OPTION 1: OAUTH FLOW
            ========================================= */}
        {activeTab === 'oauth' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Connect your Google Account</h3>
              <p className="text-sm text-slate-500 mb-6">
                The fastest and most secure way to connect. Log in with your Google account to automatically import your Google Analytics, Search Console, and Business Profile data.
              </p>
              
              <button
                onClick={handleOAuthLogin}
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-3 transition-colors"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>
              
              <p className="text-xs text-slate-400 mt-4">
                We only request read-only access. Your data is strictly confidential.
              </p>
            </div>
          </div>
        )}

        {/* =========================================
            OPTION 2: SERVICE ACCOUNT FLOW
            ========================================= */}
        {activeTab === 'service' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Manual Configuration</h3>
              <p className="text-sm text-slate-500">
                Use this method if you cannot log in directly. Add our service account email to your Google properties with <strong>Viewer</strong> permissions, then enter your IDs below.
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-indigo-900 mb-2">1. Add this email to your GA4 and GSC users:</p>
              <code className="block bg-white border border-indigo-200 p-2.5 rounded text-indigo-700 text-sm font-medium break-all select-all">
                {serviceAccountEmail}
              </code>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  GA4 Property ID
                  <span className="ml-1 text-xs text-slate-400 font-normal">(numbers only, e.g. 123456789)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
                    ga4Id && !/^\d+$/.test(ga4Id)
                      ? 'border-red-400 bg-red-50 focus:ring-red-400'
                      : 'border-slate-300'
                  }`}
                  placeholder="e.g. 123456789"
                  value={ga4Id}
                  onChange={(e) => { setGa4Id(e.target.value); setErrorMessage(null); setResults(null); }}
                />
                {ga4Id && !/^\d+$/.test(ga4Id) && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    GA4 Property ID must contain numbers only
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  GSC Site URL
                </label>
                <input
                  type="url"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. https://www.yourwebsite.com/"
                  value={gscUrl}
                  onChange={(e) => setGscUrl(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleServiceAccountVerify}
              disabled={isLoading || (!ga4Id && !gscUrl) || (!!ga4Id && !/^\d+$/.test(ga4Id))}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isLoading ? 'Verifying & Saving...' : 'Verify & Save Connection'}
            </button>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">Validation Failed — Not Saved</p>
                  <p className="text-sm text-red-700 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Results Section */}
            {results && (
              <div className="mt-6 space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="text-sm font-bold text-slate-900 mb-2">Verification Status</h4>
                {ga4Id && results.ga4 && (
                  <div className={`flex items-center gap-2 text-sm ${results.ga4.success ? 'text-emerald-700' : 'text-red-600'}`}>
                    {results.ga4.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span><strong>GA4:</strong> {results.ga4.message}</span>
                  </div>
                )}
                {gscUrl && results.gsc && (
                  <div className={`flex items-center gap-2 text-sm ${results.gsc.success ? 'text-emerald-700' : 'text-red-600'}`}>
                    {results.gsc.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span><strong>GSC:</strong> {results.gsc.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

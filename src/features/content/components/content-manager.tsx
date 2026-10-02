'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Sparkles,
  Link2,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Send,
  Eye,
  History,
  RotateCcw,
} from 'lucide-react';

interface BrandOption {
  id: string;
  name: string;
}

interface ContentManagerProps {
  tenantSlug: string;
  brands: BrandOption[];
  initialBrandId?: string;
}

export function ContentManager({ tenantSlug, brands, initialBrandId }: ContentManagerProps) {
  const [selectedBrandId, setSelectedBrandId] = useState(initialBrandId || brands[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'articles' | 'briefs' | 'ai' | 'links'>('articles');
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<any[]>([]);
  const [orphans, setOrphans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // AI draft generation state
  const [aiKeyword, setAiKeyword] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiContentType, setAiContentType] = useState('ARTICLE');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<any>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  // Fetch articles
  const fetchArticles = async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const url = new URL(`/api/tenants/${tenantSlug}/content`, window.location.origin);
      url.searchParams.set('brandId', selectedBrandId);
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);
      if (searchQuery) url.searchParams.set('search', searchQuery);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setArticles(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load articles', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch briefs
  const fetchBriefs = async () => {
    if (!selectedBrandId) return;
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/content/briefs?brandId=${selectedBrandId}`);
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs || []);
      }
    } catch (err) {
      console.error('Failed to load briefs', err);
    }
  };

  // Fetch link audit
  const fetchLinkAudits = async () => {
    try {
      const [brokenRes, orphansRes] = await Promise.all([
        fetch(`/api/tenants/${tenantSlug}/content/links?action=broken`),
        fetch(`/api/tenants/${tenantSlug}/content/links?action=orphans`),
      ]);
      if (brokenRes.ok) {
        const b = await brokenRes.json();
        setBrokenLinks(b.brokenLinks || []);
      }
      if (orphansRes.ok) {
        const o = await orphansRes.json();
        setOrphans(o.orphans || []);
      }
    } catch (err) {
      console.error('Failed to load link audits', err);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchBriefs();
    if (activeTab === 'links') {
      fetchLinkAudits();
    }
  }, [selectedBrandId, activeTab, statusFilter]);

  // Handle workflow transition
  const handleTransition = async (contentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/content/${contentId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchArticles();
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Workflow transition failed');
      }
    } catch (e) {
      alert('Error updating status');
    }
  };

  // Handle AI generation
  const handleGenerateAiDraft = async (saveAsDraft: boolean) => {
    if (!aiKeyword.trim()) {
      alert('Please enter a target keyword');
      return;
    }
    setAiGenerating(true);
    setAiSuccessMsg('');
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/content/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          primaryKeyword: aiKeyword.trim(),
          suggestedTitle: aiTitle.trim() || undefined,
          contentType: aiContentType,
          saveAsDraft,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (saveAsDraft) {
          setAiSuccessMsg('Draft article created successfully with audit trail! Ready for editorial review.');
          setAiKeyword('');
          setAiTitle('');
          setAiDraftResult(null);
          fetchArticles();
          setActiveTab('articles');
        } else {
          setAiDraftResult(data.draft);
        }
      } else {
        const err = await res.json();
        alert(err.error?.message || 'AI generation failed');
      }
    } catch (err) {
      alert('Failed to generate draft');
    } finally {
      setAiGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Published</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Approved</span>;
      case 'IN_REVIEW':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">In Review</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Revision Needed</span>;
      case 'ARCHIVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Archived</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Content & Blog Growth Engine
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Editorial CMS, structured versioning, grounded AI drafting & internal linking
              </p>
            </div>
          </div>
        </div>

        {/* Brand selector */}
        {brands.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Brand:</label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 space-x-6">
        <button
          onClick={() => setActiveTab('articles')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'articles'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Articles & Content ({articles.length})
        </button>

        <button
          onClick={() => setActiveTab('briefs')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'briefs'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Content Briefs ({briefs.length})
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'ai'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Grounded AI Drafting
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'links'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Link2 className="w-4 h-4" />
          Link Health & Audits
        </button>
      </div>

      {/* Tab 1: Articles */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchArticles()}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <button
              onClick={() => setActiveTab('ai')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Article / AI Draft
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
              <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">No content items found</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                Start by generating an AI-grounded draft or creating a brief from an SEO opportunity.
              </p>
              <button
                onClick={() => setActiveTab('ai')}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Draft first article <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-3.5">Title & Path</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Version</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Updated</th>
                    <th className="px-6 py-3.5 text-right">Editorial Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                  {articles.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</div>
                        <div className="text-xs text-zinc-400 font-mono">/blog/{item.slug}</div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          <History className="w-3 h-3" /> v{item.currentVersionNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {item.category?.name || 'General'}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {item.status === 'DRAFT' && (
                          <button
                            onClick={() => handleTransition(item.id, 'IN_REVIEW')}
                            className="inline-flex items-center text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md"
                          >
                            Submit Review
                          </button>
                        )}
                        {item.status === 'IN_REVIEW' && (
                          <>
                            <button
                              onClick={() => handleTransition(item.id, 'APPROVED')}
                              className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleTransition(item.id, 'REJECTED')}
                              className="inline-flex items-center text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() => handleTransition(item.id, 'PUBLISHED')}
                            className="inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md"
                          >
                            Publish Live
                          </button>
                        )}
                        {item.status === 'PUBLISHED' && (
                          <a
                            href={`/blog/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Briefs */}
      {activeTab === 'briefs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {briefs.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
                <CheckCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">No content briefs yet</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Briefs translate Keyword Opportunities directly into targeted outlines.
                </p>
              </div>
            ) : (
              briefs.map((brief) => (
                <div
                  key={brief.id}
                  className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {brief.intent}
                    </span>
                    <span className="text-xs text-zinc-400">{brief.status}</span>
                  </div>

                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                    {brief.workingTitle}
                  </h3>

                  <p className="text-xs text-zinc-500">
                    Primary: <strong className="text-zinc-700 dark:text-zinc-300">{brief.primaryKeyword}</strong>
                  </p>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                    <span className="text-zinc-400">
                      {new Date(brief.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => {
                        setAiKeyword(brief.primaryKeyword || brief.primaryTopic);
                        setAiTitle(brief.workingTitle);
                        setActiveTab('ai');
                      }}
                      className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                    >
                      Draft with AI <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Grounded AI Drafting */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                Grounded Fact Guardrails Active
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                AI-Assisted SEO Content Generator
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Injects real brand details, verified store addresses, and live product catalog records. Never invents facts or pricing.
              </p>
            </div>

            {aiSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm border border-emerald-200 dark:border-emerald-800">
                {aiSuccessMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Keyword / Search Demand *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Best artisanal attars in Chennai"
                  value={aiKeyword}
                  onChange={(e) => setAiKeyword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Suggested Article Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate from facts"
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Content Format
                </label>
                <select
                  value={aiContentType}
                  onChange={(e) => setAiContentType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="ARTICLE">In-depth Article</option>
                  <option value="GUIDE">Local Buyer's Guide</option>
                  <option value="BLOG">Blog Post</option>
                  <option value="FAQ_CONTENT">Store FAQ Guide</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => handleGenerateAiDraft(false)}
                  disabled={aiGenerating}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {aiGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Preview Grounded Draft
                </button>

                <button
                  onClick={() => handleGenerateAiDraft(true)}
                  disabled={aiGenerating}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {aiGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Generate & Save Draft
                </button>
              </div>
            </div>
          </div>

          {/* AI Preview panel */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
              Draft Preview & Audit Trail
            </h3>

            {aiDraftResult ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 text-sm">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-1">
                  <div className="text-xs text-zinc-500 font-semibold">Audit Provenance:</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    Prompt Version: <span className="font-mono text-indigo-600 dark:text-indigo-400">{aiDraftResult.promptVersion}</span> | Word Count: {aiDraftResult.wordCount} ({aiDraftResult.readingTimeMinutes} min read)
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Grounded with {aiDraftResult.auditMetadata.groundedEntities.locationCount} store locations and {aiDraftResult.auditMetadata.groundedEntities.productCount} catalog products.
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {aiDraftResult.title}
                  </h4>
                  <p className="text-xs text-zinc-500 italic mt-0.5">{aiDraftResult.metaDescription}</p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl whitespace-pre-wrap font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {aiDraftResult.contentMarkdown}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-zinc-400 text-sm">
                Enter a target keyword on the left and click Preview or Generate.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Link Health & Audits */}
      {activeTab === 'links' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Broken link report */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Broken Internal Links ({brokenLinks.length})
                </h3>
                <button
                  onClick={fetchLinkAudits}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                </button>
              </div>

              {brokenLinks.length === 0 ? (
                <div className="p-6 text-center text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  Zero broken links detected across published content!
                </div>
              ) : (
                <div className="space-y-2">
                  {brokenLinks.map((b, idx) => (
                    <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{b.contentTitle}</div>
                      <div className="text-rose-600 font-mono">{b.brokenUrl} ({b.reason})</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orphan content report */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-500" />
                  Orphan Articles ({orphans.length})
                </h3>
              </div>

              {orphans.length === 0 ? (
                <div className="p-6 text-center text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  All published articles have healthy inbound internal links!
                </div>
              ) : (
                <div className="space-y-2">
                  {orphans.map((o) => (
                    <div key={o.contentItemId} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{o.title}</div>
                      <div className="text-zinc-400 font-mono">/blog/{o.slug}</div>
                      <div className="text-amber-600 font-medium">0 inbound internal links</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

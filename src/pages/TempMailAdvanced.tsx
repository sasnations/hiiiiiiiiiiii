import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Mail, Shield, Clock, Globe, CheckCircle, Zap, RefreshCw, Copy,
  Loader, Inbox, Trash2, Archive, Star, QrCode, Filter, Search,
  Download, Share2, Bell, Settings, Eye, EyeOff, Link as LinkIcon,
  AlertTriangle, X, ChevronDown, ChevronUp, ExternalLink, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { PublicLayout } from '../components/PublicLayout';

// Storage keys
const STORAGE_KEYS = {
  TEMP_EMAIL: 'boomlify_temp_email',
  SELECTED_DOMAIN: 'boomlify_selected_domain',
  FILTER_SETTINGS: 'boomlify_filter_settings'
};

interface Domain {
  id: string;
  domain: string;
}

interface TempEmail {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
}

interface ReceivedEmail {
  id: string;
  from_email: string;
  subject: string;
  body_html: string;
  body_text: string;
  received_at: string;
  temp_email: string;
  attachments?: Array<{
    filename: string;
    size: number;
    content_type: string;
    url: string;
  }>;
  is_starred?: boolean;
  is_read?: boolean;
}

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

interface FilterOptions {
  search: string;
  showUnread: boolean;
  showStarred: boolean;
  dateRange: 'all' | 'today' | 'week' | 'month';
  sortBy: 'date' | 'sender' | 'subject';
  sortOrder: 'asc' | 'desc';
}

function QRModal({ isOpen, onClose, email }: QRModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Email QR Code</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <QRCodeSVG
            value={email}
            size={200}
            level="H"
            includeMargin={true}
            className="w-full max-w-[200px]"
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4 break-all">{email}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#4A90E2] text-white rounded-lg hover:bg-[#357ABD] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 hover:bg-white/20 rounded-full transition-colors"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <Copy className="w-5 h-5" />
      )}
    </button>
  );
}

export function TempMailAdvanced() {
  // State management
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [tempEmail, setTempEmail] = useState<TempEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [qrModal, setQRModal] = useState({ isOpen: false, email: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(() => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTER_SETTINGS);
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.error('Failed to parse filter settings from localStorage:', error);
    }
    return {
      search: '',
      showUnread: false,
      showStarred: false,
      dateRange: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    };
  });

  // SEO data
  const seoData = {
    title: "Advanced Temporary Email - Multiple Domains & Features | Boomlify",
    description: "Create advanced temporary emails with multiple domains, filtering, and real-time notifications. Free disposable email service with extended features.",
    canonicalUrl: "https://boomlify.com/temp-mail-advanced",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Boomlify Advanced Email Generator",
      "applicationCategory": "EmailApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": "Advanced temporary email service with multiple domains and extended features",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1250"
      },
      "featureList": [
        "Multiple domain selection",
        "Advanced filtering",
        "Real-time notifications",
        "Email organization",
        "Attachment support"
      ]
    }
  };

  // Save filter settings when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTER_SETTINGS, JSON.stringify(filterOptions));
  }, [filterOptions]);

  // Fetch domains on mount
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/domains/public`);
        const availableDomains = response.data;

        if (availableDomains && availableDomains.length > 0) {
          setDomains(availableDomains);
          setSelectedDomain(availableDomains[0]);

          try {
            const savedEmail = localStorage.getItem(STORAGE_KEYS.TEMP_EMAIL);
            if (savedEmail) {
              const emailData = JSON.parse(savedEmail);
              const expiryDate = new Date(emailData.expires_at);

              if (expiryDate > new Date()) {
                setTempEmail(emailData);
                fetchEmails(emailData.email);
                return;
              }
            }
          } catch (error) {
            console.error('Failed to parse saved email from localStorage:', error);
            localStorage.removeItem(STORAGE_KEYS.TEMP_EMAIL); // Clear invalid data
          }

          await generateEmail();
        }
      } catch (error) {
        console.error('Failed to fetch domains:', error);
      }
    };

    fetchDomains();
  }, []);

  // Auto-refresh emails
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && tempEmail?.email) {
      fetchEmails(tempEmail.email);
      interval = setInterval(() => fetchEmails(tempEmail.email), 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, tempEmail]);

  const fetchEmails = async (email: string) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/emails/public/${email}`);
      const emails = response.data || [];
      setReceivedEmails(emails.map((email: ReceivedEmail) => ({
        ...email,
        is_starred: email.is_starred ?? false,
        is_read: email.is_read ?? false
      })));
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    }
  };

  const generateEmail = async () => {
    if (!selectedDomain) return;

    setIsLoading(true);
    try {
      const prefix = emailPrefix || Math.random().toString(36).substring(2, 10);
      const newEmail = `${prefix}@${selectedDomain.domain}`;

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/emails/public/create`,
        {
          email: newEmail,
          domainId: selectedDomain.id
        }
      );

      if (!response.data) {
        throw new Error('Failed to create email');
      }

      localStorage.setItem(STORAGE_KEYS.TEMP_EMAIL, JSON.stringify(response.data));
      localStorage.setItem(STORAGE_KEYS.SELECTED_DOMAIN, JSON.stringify(selectedDomain));

      setTempEmail(response.data);
      setReceivedEmails([]);
      setSelectedEmail(null);
    } catch (error: any) {
      console.error('Failed to generate email:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAction = async (emailId: string, action: 'star' | 'archive' | 'delete' | 'markRead' | 'markUnread') => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/emails/${emailId}/${action}`);

      if (action === 'delete') {
        setReceivedEmails(prev => prev.filter(e => e.id !== emailId));
        if (selectedEmail?.id === emailId) setSelectedEmail(null);
      } else {
        const updatedEmails = receivedEmails.map(email => {
          if (email.id === emailId) {
            return {
              ...email,
              is_starred: action === 'star' ? !email.is_starred : email.is_starred,
              is_read: action === 'markRead' ? true : action === 'markUnread' ? false : email.is_read
            };
          }
          return email;
        });
        setReceivedEmails(updatedEmails);
      }
    } catch (error) {
      console.error(`Failed to ${action} email:`, error);
    }
  };

  // Filter and sort emails
  const filteredEmails = receivedEmails
    .filter(email => {
      if (filterOptions.showUnread && email.is_read) return false;
      if (filterOptions.showStarred && !email.is_starred) return false;
      if (filterOptions.search) {
        const searchLower = filterOptions.search.toLowerCase();
        return (
          email.subject?.toLowerCase().includes(searchLower) ||
          email.from_email.toLowerCase().includes(searchLower)
        );
      }
      if (filterOptions.dateRange !== 'all') {
        const emailDate = new Date(email.received_at);
        const now = new Date();
        switch (filterOptions.dateRange) {
          case 'today':
            return emailDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            return emailDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            return emailDate >= monthAgo;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const order = filterOptions.sortOrder === 'desc' ? -1 : 1;
      switch (filterOptions.sortBy) {
        case 'sender':
          return order * a.from_email.localeCompare(b.from_email);
        case 'subject':
          return order * (a.subject || '').localeCompare(b.subject || '');
        default:
          return order * (new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
      }
    });

  return (
    <PublicLayout>
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <link rel="canonical" href={seoData.canonicalUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoData.canonicalUrl} />
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        <meta property="og:image" content="https://boomlify.com/advanced-og.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={seoData.canonicalUrl} />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.description} />
        <meta name="twitter:image" content="https://boomlify.com/advanced-twitter.jpg" />

        {/* Keywords */}
        <meta name="keywords" content="advanced temp mail, temporary email service, disposable email features, multiple email domains, anonymous email advanced" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(seoData.structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-[#2F4858] to-[#33658A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Email Generation Panel */}
            <div className="lg:col-span-1 bg-white/10 backdrop-blur-lg rounded-xl p-6 h-fit">
              <div className="space-y-6">
                {/* Custom Email Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Custom Email Prefix (Optional)</label>
                  <input
                    type="text"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    placeholder="Enter custom prefix"
                    className="w-full bg-white/20 rounded-lg border border-white/30 p-3 focus:ring-2 focus:ring-blue-400 placeholder-white/50"
                  />
                </div>

                {/* Domain Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Select Domain</label>
                  <select
                    value={selectedDomain?.id || ''}
                    onChange={(e) => {
                      const domain = domains.find(d => d.id === e.target.value);
                      if (domain) setSelectedDomain(domain);
                    }}
                    className="w-full bg-white/20 rounded-lg border border-white/30 p-3 focus:ring-2 focus:ring-blue-400"
                  >
                    {domains.map((domain) => (
                      <option key={domain.id} value={domain.id}>
                        @{domain.domain}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email Generation */}
                <button
                  onClick={generateEmail}
                  disabled={isLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg font-medium flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Generate Email
                    </>
                  )}
                </button>

                {/* Generated Email Display */}
                {tempEmail && (
                  <div className="bg-white/10 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono break-all">{tempEmail.email}</span>
                      <div className="flex space-x-2">
                        <CopyButton text={tempEmail.email} />
                        <button
                          onClick={() => setQRModal({ isOpen: true, email: tempEmail.email })}
                          className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        48h Validity
                      </span>
                      <span className="flex items-center">
                        <Shield className="w-4 h-4 mr-1" />
                        Protected
                      </span>
                    </div>
                  </div>
                )}

                {/* Features List */}
                <div className="border-t border-white/20 pt-6">
                  <h3 className="text-lg font-semibold mb-4">Advanced Features</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      <span>Multiple domain options</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      <span>Advanced filtering</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      <span>Real-time notifications</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      <span>Attachment support</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Inbox Panel */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Inbox className="w-5 h-5 mr-2" />
                  Advanced Inbox
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Toggle filters"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`p-2 rounded-lg ${autoRefresh ? 'bg-green-500/20' : 'hover:bg-white/10'} transition-colors`}
                    title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
                  >
                    <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                        <input
                          type="text"
                          value={filterOptions.search}
                          onChange={(e) => setFilterOptions({ ...filterOptions, search: e.target.value })}
                          placeholder="Search emails..."
                          className="w-full bg-white/20 pl-10 pr-4 py-2 rounded-lg border border-white/30 focus:ring-2 focus:ring-blue-400 placeholder-white/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Sort By</label>
                      <select
                        value={filterOptions.sortBy}
                        onChange={(e) => setFilterOptions({ ...filterOptions, sortBy: e.target.value as 'date' | 'sender' | 'subject' })}
                        className="w-full bg-white/20 rounded-lg border border-white/30 p-2 focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="date">Date</option>
                        <option value="sender">Sender</option>
                        <option value="subject">Subject</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Date Range</label>
                      <select
                        value={filterOptions.dateRange}
                        onChange={(e) => setFilterOptions({ ...filterOptions, dateRange: e.target.value as 'all' | 'today' | 'week' | 'month' })}
                        className="w-full bg-white/20 rounded-lg border border-white/30 p-2 focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterOptions.showUnread}
                        onChange={(e) => setFilterOptions({ ...filterOptions, showUnread: e.target.checked })}
                        className="rounded border-white/30 text-blue-500 focus:ring-blue-400"
                      />
                      <span className="ml-2">Unread Only</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterOptions.showStarred}
                        onChange={(e) => setFilterOptions({ ...filterOptions, showStarred: e.target.checked })}
                        className="rounded border-white/30 text-blue-500 focus:ring-blue-400"
                      />
                      <span className="ml-2">Starred Only</span>
                    </label>
                    <button
                      onClick={() => setFilterOptions({
                        search: '',
                        showUnread: false,
                        showStarred: false,
                        dateRange: 'all',
                        sortBy: 'date',
                        sortOrder: 'desc'
                      })}
                      className="text-sm text-white/70 hover:text-white"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Email List */}
              <div className="space-y-2">
                {filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-white/70">No emails found</p>
                    {filterOptions.search && (
                      <p className="text-sm text-white/50 mt-2">
                        Try adjusting your search filters
                      </p>
                    )}
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedEmail?.id === email.id
                          ? 'bg-white/20'
                          : 'hover:bg-white/10'
                      } ${!email.is_read ? 'border-l-4 border-blue-500' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">
                            {email.subject || 'No Subject'}
                          </h3>
                          <p className="text-sm text-white/70 truncate">
                            {email.from_email}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className="text-sm text-white/50">
                            {new Date(email.received_at).toLocaleTimeString()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailAction(email.id, 'star');
                            }}
                            className={`p-1 rounded-full hover:bg-white/10 ${
                              email.is_starred ? 'text-yellow-400' : 'text-white/50'
                            }`}
                          >
                            <Star className="w-4 h-4" fill={email.is_starred ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Email Content */}
              {selectedEmail && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            {selectedEmail.subject || 'No Subject'}
                          </h2>
                          <div className="text-sm text-gray-600">
                            <p>From: {selectedEmail.from_email}</p>
                            <p>Received: {new Date(selectedEmail.received_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEmailAction(selectedEmail.id, selectedEmail.is_read ? 'markUnread' : 'markRead')}
                            className="p-2 rounded-lg hover:bg-gray-100"
                            title={selectedEmail.is_read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {selectedEmail.is_read ? (
                              <EyeOff className="w-5 h-5 text-gray-600" />
                            ) : (
                              <Eye className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEmailAction(selectedEmail.id, 'star')}
                            className={`p-2 rounded-lg hover:bg-gray-100 ${
                              selectedEmail.is_starred ? 'text-yellow-500' : 'text-gray-600'
                            }`}
                            title={selectedEmail.is_starred ? 'Unstar' : 'Star'}
                          >
                            <Star
                              className="w-5 h-5"
                              fill={selectedEmail.is_starred ? 'currentColor' : 'none'}
                            />
                          </button>
                          <button
                            onClick={() => handleEmailAction(selectedEmail.id, 'delete')}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setSelectedEmail(null)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="Close"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                      {selectedEmail.body_html ? (
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-700">
                          {selectedEmail.body_text}
                        </pre>
                      )}

                      {/* Attachments */}
                      {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                        <div className="mt-6 border-t border-gray-200 pt-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Attachments ({selectedEmail.attachments.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedEmail.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center min-w-0">
                                  <Download className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                      {attachment.filename}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {formatFileSize(attachment.size)}
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={attachment.url}
                                  download
                                  className="ml-4 px-3 py-1 bg-[#4A90E2] text-white rounded-lg hover:bg-[#357ABD] transition-colors flex-shrink-0"
                                >
                                  Download
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Modal */}
          <QRModal
            isOpen={qrModal.isOpen}
            onClose={() => setQRModal({ isOpen: false, email: '' })}
            email={qrModal.email}
          />

          {/* Floating Upgrade Button */}
          <div className="fixed bottom-4 right-4 z-50">
            <Link
              to="/register"
              className="bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center group"
            >
              <Star className="w-5 h-5 mr-2" />
              <span>Get 3+ Months Free</span>
              <ArrowRight className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

// Utility function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
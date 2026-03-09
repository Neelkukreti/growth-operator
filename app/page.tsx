'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { ArrowRight, Search, Globe, Mail, Send, Zap, CheckCircle, BarChart3, Users, Sparkles, Loader2, Clock, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { getSessions, deleteSession, SessionMeta } from '@/lib/session-storage';

const PRESETS = [
  { label: 'SaaS in Bangalore', query: 'SaaS companies in Bangalore' },
  { label: 'AI Startups in SF', query: 'AI startups in San Francisco' },
  { label: 'Fintech in London', query: 'Fintech companies in London' },
  { label: 'DevTools in Berlin', query: 'DevTool companies in Berlin' },
  { label: 'E-commerce in NYC', query: 'E-commerce brands in New York' },
];

const PRODUCT_EXAMPLES = [
  'We help SaaS companies reduce churn with AI-powered customer success tools',
  'An API monitoring platform that alerts dev teams before customers notice downtime',
  'B2B invoicing software for freelancers and small agencies',
];

const PRODUCT_SUGGESTIONS: { keywords: string[]; products: string[] }[] = [
  {
    keywords: ['saas', 'software', 'startup'],
    products: ['AI customer support chatbot', 'Churn prediction tool', 'Product analytics platform', 'Email marketing automation'],
  },
  {
    keywords: ['fintech', 'finance', 'banking', 'payment'],
    products: ['KYC automation tool', 'Fraud detection software', 'Compliance reporting dashboard', 'Payment analytics platform'],
  },
  {
    keywords: ['ecommerce', 'e-commerce', 'shopify', 'retail', 'store'],
    products: ['Abandoned cart recovery tool', 'Product recommendation engine', 'Inventory management software', 'Customer loyalty platform'],
  },
  {
    keywords: ['devtool', 'developer', 'api', 'engineering'],
    products: ['API monitoring platform', 'Error tracking tool', 'CI/CD automation', 'Code review assistant'],
  },
  {
    keywords: ['ai', 'ml', 'machine learning'],
    products: ['GPU cloud platform', 'ML model monitoring', 'Training data platform', 'AI cost optimization tool'],
  },
  {
    keywords: ['agency', 'marketing', 'creative', 'design'],
    products: ['Client reporting dashboard', 'Project management tool', 'White-label analytics', 'Social media scheduler'],
  },
  {
    keywords: ['restaurant', 'food', 'sushi', 'cafe', 'hospitality'],
    products: ['POS system', 'Online ordering platform', 'Customer loyalty program', 'Food delivery integration'],
  },
  {
    keywords: ['health', 'clinic', 'medical', 'healthcare'],
    products: ['Patient scheduling software', 'Medical billing automation', 'Telemedicine platform', 'Health analytics dashboard'],
  },
];

function getProductSuggestions(query: string): string[] {
  const q = query.toLowerCase();
  for (const { keywords, products } of PRODUCT_SUGGESTIONS) {
    if (keywords.some((k) => q.includes(k))) return products;
  }
  return ['CRM software', 'Email outreach tool', 'Analytics dashboard', 'Marketing automation'];
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'niche' | 'product'>('niche');
  const [query, setQuery] = useState('');
  const [nicheProduct, setNicheProduct] = useState('');
  const [showNicheProduct, setShowNicheProduct] = useState(false);
  const [productDesc, setProductDesc] = useState('');
  const [targetCount, setTargetCount] = useState(5);
  const [isExpanding, setIsExpanding] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    deleteSession(id);
    setSessions(getSessions());
  };

  const handleLaunchNiche = (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    const id = Date.now().toString(36);
    const params = new URLSearchParams({ q: finalQuery.trim(), n: String(targetCount) });
    if (nicheProduct.trim()) params.set('product', nicheProduct.trim());
    router.push(`/campaign/${id}?${params}`);
  };

  const handleLaunchProduct = async () => {
    if (!productDesc.trim()) return;
    setIsExpanding(true);
    setGeneratedQuery('');

    try {
      const res = await fetch('/api/expand-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDescription: productDesc.trim() }),
      });
      const { query: aiQuery, productSummary } = await res.json();
      setGeneratedQuery(aiQuery);

      const id = Date.now().toString(36);
      const params = new URLSearchParams({
        q: aiQuery,
        n: String(targetCount),
        product: productSummary || productDesc.trim(),
      });
      router.push(`/campaign/${id}?${params}`);
    } catch {
      // Fallback: use product desc as query
      const id = Date.now().toString(36);
      const params = new URLSearchParams({
        q: productDesc.trim().slice(0, 80),
        n: String(targetCount),
        product: productDesc.trim(),
      });
      router.push(`/campaign/${id}?${params}`);
    } finally {
      setIsExpanding(false);
    }
  };

  const canLaunch = mode === 'niche' ? !!query.trim() : !!productDesc.trim();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-[1200px] mx-auto px-6">
        {/* Hero */}
        <div className="pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light text-primary text-[12px] font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              Autonomous Pipeline Generation
            </div>

            <h1 className="text-4xl md:text-[56px] font-bold tracking-tight leading-[1.1] text-foreground mb-5">
              AI That Builds
              <br />
              Your Pipeline.
            </h1>

            <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed mb-10">
              Autonomous agents search Google, deep-dive each company&apos;s website,
              then write hyper-personalized outreach — all streamed live.
            </p>
          </motion.div>

          {/* Mode switcher + input */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="max-w-xl mx-auto mb-4"
          >
            {/* Tab switcher */}
            <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-xl border border-border mb-3 w-fit mx-auto">
              <button
                onClick={() => setMode('niche')}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
                  mode === 'niche'
                    ? 'bg-white text-foreground shadow-sm border border-border-light'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <Search className="w-3.5 h-3.5" />
                Find by niche
              </button>
              <button
                onClick={() => setMode('product')}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
                  mode === 'product'
                    ? 'bg-white text-foreground shadow-sm border border-border-light'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Describe my product
              </button>
            </div>

            {/* Input card */}
            <div className="card overflow-hidden">
              <AnimatePresence mode="wait">
                {mode === 'niche' ? (
                  <motion.div
                    key="niche"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Search className="w-5 h-5 text-muted-light shrink-0" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLaunchNiche()}
                        placeholder="Find SaaS companies in Bangalore..."
                        className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-light focus:outline-none"
                      />
                    </div>
                    <AnimatePresence>
                      {showNicheProduct && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border-light pt-3 px-4 pb-3.5">
                            <div className="flex items-start gap-3 mb-2.5">
                              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <input
                                type="text"
                                value={nicheProduct}
                                onChange={(e) => setNicheProduct(e.target.value)}
                                placeholder="What are you selling? e.g. AI customer support tool"
                                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-light focus:outline-none"
                              />
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-7">
                              {getProductSuggestions(query).map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => setNicheProduct(suggestion)}
                                  className={clsx(
                                    'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                                    nicheProduct === suggestion
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-background-secondary text-muted border-border-light hover:text-primary hover:border-primary/30 hover:bg-primary-light',
                                  )}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="px-4 pb-2">
                      <button
                        type="button"
                        onClick={() => setShowNicheProduct((s) => !s)}
                        className="text-[11px] text-muted hover:text-primary transition-colors"
                      >
                        {showNicheProduct ? '− Hide product context' : '+ Add what you\'re selling (for personalized emails)'}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="product"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="px-4 pt-3.5 pb-2">
                      <textarea
                        value={productDesc}
                        onChange={(e) => setProductDesc(e.target.value)}
                        placeholder={`Describe what your product does...\n\nExample: "${PRODUCT_EXAMPLES[0]}"`}
                        rows={3}
                        className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-light focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                      {PRODUCT_EXAMPLES.map((ex) => (
                        <button
                          key={ex}
                          onClick={() => setProductDesc(ex)}
                          className="text-[11px] px-2 py-1 rounded-md bg-background-secondary text-muted hover:text-primary hover:bg-primary-light border border-border-light transition-colors text-left"
                        >
                          {ex.slice(0, 40)}...
                        </button>
                      ))}
                    </div>
                    {generatedQuery && (
                      <div className="px-4 pb-2 flex items-center gap-2 text-[12px] text-success">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Targeting: <span className="font-medium">{generatedQuery}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-background-secondary border-t border-border-light">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-muted">Leads:</span>
                      {[1, 3, 5, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTargetCount(n)}
                        className={clsx(
                          'px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors',
                          targetCount === n
                            ? 'bg-primary text-white'
                            : 'text-muted hover:text-foreground hover:bg-white',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={mode === 'niche' ? () => handleLaunchNiche() : handleLaunchProduct}
                  disabled={!canLaunch || isExpanding}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {isExpanding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finding targets...
                    </>
                  ) : (
                    <>
                      Launch Campaign
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Presets (only in niche mode) */}
          <AnimatePresence>
            {mode === 'niche' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 justify-center mb-6 overflow-hidden"
              >
                {PRESETS.map(({ label, query: q }) => (
                  <button
                    key={label}
                    onClick={() => handleLaunchNiche(q)}
                    className="px-3 py-1.5 rounded-full text-[12px] text-muted font-medium border border-border hover:border-primary/30 hover:text-primary hover:bg-primary-light transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[12px] text-muted-light"
          >
            Or <button onClick={() => handleLaunchNiche('SaaS companies in Bangalore')} className="text-primary hover:underline font-medium">view a demo campaign</button>
          </motion.p>

          {/* Session history */}
          <AnimatePresence>
            {sessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 max-w-xl mx-auto"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-muted-light" />
                  <span className="text-[12px] font-medium text-muted">Recent campaigns</span>
                </div>
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <a
                      key={s.id}
                      href={`/campaign/${s.id}?q=${encodeURIComponent(s.query)}&n=${s.targetCount}${s.productContext ? `&product=${encodeURIComponent(s.productContext)}` : ''}`}
                      className="group flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-white hover:border-primary/30 hover:bg-primary-light/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                          <Search className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{s.query}</p>
                          <p className="text-[11px] text-muted-light">
                            {s.totalLeads} leads · {s.totalEmails} emails · {new Date(s.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-light hover:text-error hover:bg-error-light transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="pb-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-foreground mb-2">From target to outreach in minutes</h2>
            <p className="text-sm text-muted">AI handles the busywork. You close the deals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Search, label: 'Discover', desc: 'AI searches for companies matching your target criteria.', color: 'bg-primary-light text-primary' },
              { icon: Globe, label: 'Research', desc: 'Navigates company websites to extract key intel and contacts.', color: 'bg-info-light text-info' },
              { icon: Mail, label: 'Personalize', desc: 'Generates custom emails based on pain points and context.', color: 'bg-warning-light text-warning' },
              { icon: Send, label: 'Deliver', desc: 'Emails ready to send with one click. Track opens and replies.', color: 'bg-success-light text-success' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="text-center">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">{label}</div>
                <div className="text-[13px] text-muted leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pb-24"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Users, value: 'Up to 10', label: 'Leads per campaign', desc: 'Deep research on every lead, not shallow bulk scraping' },
              { icon: BarChart3, value: '3x', label: 'Reply rate vs. bulk', desc: 'Personalization that actually works' },
              { icon: CheckCircle, value: '<5min', label: 'First email ready', desc: 'From Google search to inbox-ready email' },
            ].map(({ icon: Icon, value, label, desc }) => (
              <div key={label} className="card px-6 py-5 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
                <div className="text-sm font-medium text-foreground mb-1">{label}</div>
                <div className="text-[12px] text-muted">{desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between text-[12px] text-muted-light">
          <span>Growth Operator</span>
          <span>Powered by TinyFish + Gemini</span>
        </div>
      </footer>
    </div>
  );
}

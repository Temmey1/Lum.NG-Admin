import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Tag, ShoppingBag, Plus, Settings, LogOut,
  ExternalLink, Edit, Trash2, Check, X, Package, Users,
  DollarSign, Globe, Type, Image, MessageSquare, Phone,
  Megaphone, AlignLeft, Search, ChevronDown, ChevronUp,
  RotateCcw, Eye, Save
} from 'lucide-react';
import { productsApi, ordersApi, settingsApi, authApi } from '../api/index';
import { formatPrice, CATEGORIES, DEFAULT_SITE_CONTENT } from '../data/siteDefaults';

const PRODUCT_CATEGORIES = CATEGORIES.filter(c => c.value !== 'all');

// Storefront base URL, used for the "View Site" / "Preview Shop" links.
// This admin app is deployed separately from the storefront, so it can't
// just link to a relative path — it needs the storefront's real URL.
const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173';

/* Normalizes a backend order (Prisma shape) into the flat shape this page
 * renders. Keeps the render code below unchanged from its original form. */
function normalizeOrder(o) {
  return {
    ref: o.ref,
    customer: {
      name: o.custName, email: o.custEmail, phone: o.custPhone,
      address: o.custAddress, state: o.custState, landmark: o.custLandmark,
    },
    delivery: (o.delivery || '').toLowerCase(),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    status: (o.status || '').toLowerCase(),
    date: o.createdAt,
    items: (o.items || []).map(i => ({ id: i.productId, qty: i.qty })),
  };
}

/* ─── Nav structure ─────────────────────────────────────── */
const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   Icon: LayoutDashboard, group: 'main' },
  { id: 'products',   label: 'Products',     Icon: Tag,            group: 'main' },
  { id: 'orders',     label: 'Orders',       Icon: ShoppingBag,    group: 'main' },
  { id: 'add',        label: 'Add Product',  Icon: Plus,           group: 'main' },
  // Website group
  { id: 'web-hero',        label: 'Hero Section',    Icon: Image,         group: 'website' },
  { id: 'web-about',       label: 'About Section',   Icon: AlignLeft,     group: 'website' },
  { id: 'web-marquee',     label: 'Marquee Ticker',  Icon: Type,          group: 'website' },
  { id: 'web-fabrics',     label: 'Fabric Cards',    Icon: Tag,           group: 'website' },
  { id: 'web-testimonials',label: 'Testimonials',    Icon: MessageSquare, group: 'website' },
  { id: 'web-cta',         label: 'CTA Banner',      Icon: Megaphone,     group: 'website' },
  { id: 'web-contact',     label: 'Contact Info',    Icon: Phone,         group: 'website' },
  { id: 'web-footer',      label: 'Footer',          Icon: Globe,         group: 'website' },
  { id: 'web-seo',         label: 'SEO / Meta',      Icon: Search,        group: 'website' },
  // Config
  { id: 'settings',   label: 'Settings',     Icon: Settings,       group: 'config' },
];

const BLANK_PRODUCT = {
  name: '', category: 'ankara', description: '', price: '', unit: 'per yard',
  bulkPrice: '', bulkMin: '', badge: '', minOrder: 1, tags: '',
  pattern: 'linear-gradient(135deg,#1a1a1a,#333)', inStock: true, featured: false,
};

/* ─── Reusable form widgets ─────────────────────────────── */
const inputCls = 'w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-3.5 py-2.5 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--gold-dim)] placeholder:text-[var(--text-ghost)] transition-all';
const labelCls = 'text-[11px] tracking-widest uppercase text-[var(--text-muted)] block mb-1.5';

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-0">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function FieldRow({ children }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function SectionCard({ title, children, onReset }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-7 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-[var(--text)] text-base">{title}</h2>
        {onReset && (
          <button onClick={onReset}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--gold-light)] transition-colors uppercase tracking-wider">
            <RotateCcw size={12}/> Reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SaveBar({ onSave }) {
  return (
    <div className="flex justify-end mt-2">
      <button onClick={onSave}
        className="flex items-center gap-2 bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-bold uppercase tracking-wider text-[12px] px-6 py-2.5 rounded hover:-translate-y-0.5 transition-all">
        <Save size={13}/> Save Changes
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   'bg-[rgba(232,169,76,0.15)] text-[var(--gold)] border-[var(--gold-dim)]',
    confirmed: 'bg-[rgba(76,175,110,0.15)] text-green-400 border-[rgba(76,175,110,0.3)]',
    processing:'bg-[rgba(100,130,220,0.15)] text-blue-300 border-[rgba(100,130,220,0.3)]',
    fulfilled: 'bg-[rgba(76,175,110,0.2)] text-green-300 border-[rgba(76,175,110,0.4)]',
    cancelled: 'bg-[rgba(232,92,92,0.15)] text-[var(--danger)] border-[rgba(232,92,92,0.3)]',
    active:    'bg-[rgba(76,175,110,0.2)] text-green-400 border-[rgba(76,175,110,0.3)]',
    oos:       'bg-[rgba(232,92,92,0.15)] text-[var(--danger)] border-[rgba(232,92,92,0.2)]',
  };
  return (
    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm border ${map[status] || map.pending}`}>
      {status === 'oos' ? 'Out of Stock' : status === 'active' ? 'In Stock' : status}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function AdminPage() {
  const navigate = useNavigate();

  const [products, setProducts]   = useState([]);
  const [orders, setOrders]       = useState([]);
  const [siteContent, setSiteContent] = useState(DEFAULT_SITE_CONTENT);
  const [dataLoading, setDataLoading] = useState(true);

  const [page, setPage]         = useState('dashboard');
  const [form, setForm]         = useState(BLANK_PRODUCT);
  const [editId, setEditId]     = useState(null);
  const [toast, setToast]       = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [newCreds, setNewCreds] = useState({ user: '', pass: '' });
  const [websiteOpen, setWebsiteOpen] = useState(true);

  // Local copies of site content sections for editing
  const [heroForm,        setHeroForm]        = useState(siteContent.hero);
  const [aboutForm,       setAboutForm]       = useState(siteContent.about);
  const [marqueeForm,     setMarqueeForm]     = useState(siteContent.marquee.join(', '));
  const [testimonialsForm,setTestimonialsForm]= useState(siteContent.testimonials);
  const [ctaForm,         setCtaForm]         = useState(siteContent.cta);
  const [contactForm,     setContactForm]     = useState(siteContent.contact);
  const [footerForm,      setFooterForm]      = useState(siteContent.footer);
  const [seoForm,         setSeoForm]         = useState(siteContent.seo);
  const [fabricCards,     setFabricCards]     = useState(siteContent.hero.fabricCards);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };
  const saved = (section) => { showToast(`✓ ${section} saved`); };
  const failed = (label, err) => showToast(`⚠ ${label} failed: ${err.response?.data?.message || err.message}`);

  /* ── Data fetching (real backend) ── */
  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await productsApi.getAll();
      setProducts(data.products || []);
    } catch (err) { failed('Loading products', err); }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await ordersApi.getAll();
      setOrders((data.orders || []).map(normalizeOrder));
    } catch (err) { failed('Loading orders', err); }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await settingsApi.get();
      // Merge over defaults — sections never saved yet fall back gracefully
      const merged = { ...DEFAULT_SITE_CONTENT, ...data };
      setSiteContent(merged);
    } catch (err) { failed('Loading site content', err); }
  }, []);

  useEffect(() => {
    (async () => {
      setDataLoading(true);
      await Promise.all([fetchProducts(), fetchOrders(), fetchSettings()]);
      setDataLoading(false);
    })();
  }, [fetchProducts, fetchOrders, fetchSettings]);

  // Sync local forms whenever site content is (re)loaded from the server
  useEffect(() => {
    setHeroForm(siteContent.hero);
    setAboutForm(siteContent.about);
    setMarqueeForm(siteContent.marquee.join(', '));
    setTestimonialsForm(siteContent.testimonials);
    setCtaForm(siteContent.cta);
    setContactForm(siteContent.contact);
    setFooterForm(siteContent.footer);
    setSeoForm(siteContent.seo);
    setFabricCards(siteContent.hero.fabricCards);
  }, [siteContent]);

  const handleLogout = () => {
    localStorage.removeItem('lumng_admin_token');
    localStorage.removeItem('lumng_admin_username');
    navigate('/login');
  };
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  /* Product save */
  const handleProductSave = async () => {
    if (!form.name || !form.category || !form.price) { showToast('⚠ Name, category, price required'); return; }
    const data = {
      ...form,
      price: Number(form.price),
      bulkPrice: form.bulkPrice ? Number(form.bulkPrice) : null,
      bulkMin:   form.bulkMin   ? Number(form.bulkMin)   : null,
      minOrder:  Number(form.minOrder) || 1,
      tags: typeof form.tags === 'string'
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : form.tags,
    };
    try {
      if (editId) await productsApi.update(editId, data);
      else await productsApi.create(data);
      await fetchProducts();
      showToast(`✓ "${form.name}" ${editId ? 'updated' : 'added'}`);
      setForm(BLANK_PRODUCT); setEditId(null); setPage('products');
    } catch (err) { failed('Save product', err); }
  };

  const toggleStock = async (p) => {
    try {
      await productsApi.update(p.id, { inStock: !p.inStock });
      await fetchProducts();
      showToast(`${p.name}: ${!p.inStock ? 'in stock' : 'out of stock'}`);
    } catch (err) { failed('Update stock', err); }
  };

  const deleteProductAction = async (p) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productsApi.delete(p.id);
      await fetchProducts();
      showToast('Product deleted');
    } catch (err) { failed('Delete product', err); }
  };

  const updateOrderStatusAction = async (ref, status) => {
    try {
      await ordersApi.updateStatus(ref, status);
      await fetchOrders();
      showToast(`Order → ${status}`);
    } catch (err) { failed('Update order status', err); }
  };

  const clearOrdersAction = async () => {
    if (!confirm('Clear all orders?')) return;
    try {
      await ordersApi.clearAll();
      await fetchOrders();
      showToast('Orders cleared');
    } catch (err) { failed('Clear orders', err); }
  };

  const updateSiteSection = async (section, data) => {
    try {
      await settingsApi.update({ [section]: data });
      setSiteContent(sc => ({ ...sc, [section]: data }));
    } catch (err) { failed(`Save ${section}`, err); }
  };

  const setSiteArray = async (key, arr) => {
    try {
      await settingsApi.update({ [key]: arr });
      setSiteContent(sc => ({ ...sc, [key]: arr }));
    } catch (err) { failed(`Save ${key}`, err); }
  };

  const resetSiteContent = async () => {
    try {
      await settingsApi.update(DEFAULT_SITE_CONTENT);
      setSiteContent(DEFAULT_SITE_CONTENT);
    } catch (err) { failed('Reset site content', err); }
  };

  const startEdit = (p) => {
    setForm({ ...p, tags: Array.isArray(p.tags) ? p.tags.join(', ') : p.tags || '' });
    setEditId(p.id);
    setPage('add');
  };

  /* Stats */
  const totalRevenue    = orders.reduce((s, o) => s + (o.total || o.subtotal || 0), 0);
  const uniqueCustomers = [...new Set(orders.map(o => o.customer?.email).filter(Boolean))].length;

  /* Testimonials helpers */
  const updateTestimonial = (i, key, val) =>
    setTestimonialsForm(arr => arr.map((t, idx) => idx === i ? { ...t, [key]: val } : t));
  const addTestimonial = () =>
    setTestimonialsForm(arr => [...arr, { stars: 5, text: '', author: '' }]);
  const removeTestimonial = (i) =>
    setTestimonialsForm(arr => arr.filter((_, idx) => idx !== i));

  /* Fabric cards helpers */
  const updateCard = (i, key, val) =>
    setFabricCards(arr => arr.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  const addCard = () =>
    setFabricCards(arr => [...arr, { label: 'New Fabric', pattern: 'linear-gradient(135deg,#111,#333)' }]);
  const removeCard = (i) =>
    setFabricCards(arr => arr.filter((_, idx) => idx !== i));

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Loading admin panel…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex font-[Inter]">

      {/* ── Sidebar ── */}
      <aside className="w-[260px] bg-[var(--bg-2)] border-r border-[var(--border)] flex flex-col fixed top-0 left-0 bottom-0 z-10 overflow-y-auto">
        <div className="px-6 py-7 border-b border-[var(--border)]">
          <div className="font-[Playfair_Display] text-xl font-black tracking-widest"
            style={{ background: 'linear-gradient(135deg,var(--text),var(--gold-light))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            <div className="flex items-center gap-2.5">
              <img src="/logo.jpeg" alt="LUM NG" className="w-8 h-8 rounded-full object-cover border border-[var(--gold-dim)]" />
              <span>LUM NG</span>
            </div>
          </div>
          <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--gold)] mt-1">Admin Panel</div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {/* Main group */}
          <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-ghost)] px-3.5 mb-2 mt-1">Main</div>
          {NAV.filter(n => n.group === 'main').map(({ id, label, Icon }) => (
            <button key={id}
              onClick={() => { setPage(id); if (id === 'add') { setForm(BLANK_PRODUCT); setEditId(null); } }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded text-[13px] text-left transition-all border w-full ${
                page === id
                  ? 'bg-[var(--gold-glow)] border-[var(--gold-dim)] text-[var(--gold-light)]'
                  : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]'
              }`}>
              <Icon size={15}/> {label}
            </button>
          ))}

          {/* Website group */}
          <button
            onClick={() => setWebsiteOpen(o => !o)}
            className="flex items-center justify-between px-3.5 py-2.5 mt-3 mb-1 text-[10px] tracking-[0.15em] uppercase text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors w-full">
            <span>Website Content</span>
            {websiteOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          {websiteOpen && NAV.filter(n => n.group === 'website').map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setPage(id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded text-[13px] text-left transition-all border w-full ${
                page === id
                  ? 'bg-[var(--gold-glow)] border-[var(--gold-dim)] text-[var(--gold-light)]'
                  : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]'
              }`}>
              <Icon size={15}/> {label}
            </button>
          ))}

          {/* Config */}
          <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-ghost)] px-3.5 mb-2 mt-4">Config</div>
          <button onClick={() => setPage('settings')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded text-[13px] text-left transition-all border w-full ${
              page === 'settings'
                ? 'bg-[var(--gold-glow)] border-[var(--gold-dim)] text-[var(--gold-light)]'
                : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text)]'
            }`}>
            <Settings size={15}/> Settings
          </button>

          <a href={STOREFRONT_URL} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded text-[13px] border border-transparent text-[var(--text-ghost)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all mt-1">
            <ExternalLink size={15}/> View Site
          </a>
          <a href={`${STOREFRONT_URL}/shop`} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded text-[13px] border border-transparent text-[var(--text-ghost)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-all">
            <Eye size={15}/> Preview Shop
          </a>
        </nav>

        <div className="px-6 py-5 border-t border-[var(--border)]">
          <div className="text-[12px] text-[var(--text-muted)] mb-3">
            <strong className="text-[var(--text-dim)] block">{localStorage.getItem('lumng_admin_username') || 'Admin'}</strong>Logged in
          </div>
          <button onClick={handleLogout}
            className="w-full border border-[var(--border)] text-[var(--text-muted)] text-[12px] uppercase tracking-wider py-2 rounded hover:border-red-400/30 hover:text-red-400/80 transition-all flex items-center justify-center gap-2">
            <LogOut size={13}/> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-[260px] flex-1 p-10 min-h-screen">

        {/* ── DASHBOARD ── */}
        {page === 'dashboard' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <h1 className="font-[Playfair_Display] text-3xl font-bold text-[var(--text)] mb-8">
              Dashboard <span className="text-[14px] font-normal text-[var(--text-muted)] font-[Inter]">Welcome back 👋</span>
            </h1>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {[
                { label:'Total Products', value:products.length,  sub:`${products.filter(p=>p.inStock).length} in stock`, Icon:Package,  color:'var(--gold)' },
                { label:'Total Orders',   value:orders.length,    sub:`${orders.filter(o=>o.status==='pending').length} pending`,  Icon:ShoppingBag, color:'#6b9e6b' },
                { label:'Revenue',        value:formatPrice(totalRevenue), sub:'From all orders', Icon:DollarSign, color:'var(--gold-light)' },
                { label:'Customers',      value:uniqueCustomers,  sub:'Unique emails',  Icon:Users,   color:'#7a9fd4' },
              ].map(({ label, value, sub, Icon, color }) => (
                <div key={label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--gold-dim)] transition-all">
                  <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase mb-3" style={{ color }}>
                    <Icon size={14}/> {label}
                  </div>
                  <div className="font-[Playfair_Display] text-3xl font-bold"
                    style={{ background:`linear-gradient(135deg,var(--text),${color})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                    {value}
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] mt-1">{sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
              {/* Recent orders */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <span className="font-semibold text-[var(--text)]">Recent Orders</span>
                  <button onClick={() => setPage('orders')} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--gold-light)] transition-colors">View All →</button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr>{['Ref','Customer','Total','Status'].map(h =>
                      <th key={h} className="text-left text-[10px] tracking-wider uppercase text-[var(--gold)] px-4 py-3 border-b border-[var(--border)]">{h}</th>
                    )}</tr>
                  </thead>
                  <tbody>
                    {orders.slice(0,5).map(o => (
                      <tr key={o.ref} className="hover:bg-[var(--input-bg)]">
                        <td className="px-4 py-3 font-mono text-[12px] text-[var(--gold)]">{o.ref}</td>
                        <td className="px-4 py-3 text-[14px] text-[var(--text-dim)]">{o.customer?.name || '—'}</td>
                        <td className="px-4 py-3 text-[14px] text-[var(--text-dim)]">{formatPrice(o.total || o.subtotal || 0)}</td>
                        <td className="px-4 py-3"><StatusBadge status={o.status}/></td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quick actions */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 flex flex-col gap-3">
                <span className="font-semibold text-[var(--text)] mb-2">Quick Actions</span>
                {[
                  ['+ Add New Product','add'],
                  ['Manage Products','products'],
                  ['View Orders','orders'],
                  ['Edit Hero Section','web-hero'],
                  ['Edit Testimonials','web-testimonials'],
                ].map(([label, target]) => (
                  <button key={target} onClick={() => setPage(target)}
                    className="w-full text-left px-4 py-3 border border-[var(--border)] rounded text-[13px] text-[var(--text-muted)] hover:border-[var(--gold-dim)] hover:text-[var(--gold-light)] transition-all">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PRODUCTS ── */}
        {page === 'products' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-[Playfair_Display] text-3xl font-bold text-[var(--text)]">
                Products <span className="text-[14px] font-normal text-[var(--text-muted)] font-[Inter]">{products.length} total</span>
              </h1>
              <button onClick={() => { setPage('add'); setForm(BLANK_PRODUCT); setEditId(null); }}
                className="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-bold uppercase tracking-wider text-[12px] px-5 py-2.5 rounded flex items-center gap-2 hover:-translate-y-0.5 transition-all">
                <Plus size={14}/> Add Product
              </button>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>{['Preview','Name','Category','Price','Bulk','Status','Actions'].map(h =>
                    <th key={h} className="text-left text-[10px] tracking-wider uppercase text-[var(--gold)] px-4 py-3 border-b border-[var(--border)]">{h}</th>
                  )}</tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-[var(--input-bg)] border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3"><div className="w-9 h-9 rounded-md" style={{ background: p.pattern }}/></td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-[var(--text)]">{p.name}</span>
                        {p.badge && <span className="ml-2 bg-[var(--gold)] text-[var(--bg)] text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm">{p.badge}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)] capitalize">{p.category}</td>
                      <td className="px-4 py-3 text-sm text-[var(--gold-light)]">{formatPrice(p.price)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                        {p.bulkPrice ? `${formatPrice(p.bulkPrice)} (${p.bulkMin}+)` : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.inStock ? 'active' : 'oos'}/></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(p)}
                            className="w-8 h-8 border border-[var(--border)] rounded flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--gold-dim)] hover:text-[var(--gold-light)] transition-all">
                            <Edit size={13}/>
                          </button>
                          <button onClick={() => toggleStock(p)}
                            className="w-8 h-8 border border-[var(--border)] rounded flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--gold-dim)] hover:text-[var(--gold-light)] transition-all">
                            <Check size={13}/>
                          </button>
                          <button onClick={() => deleteProductAction(p)}
                            className="w-8 h-8 border border-[var(--border)] rounded flex items-center justify-center text-[var(--text-muted)] hover:border-red-400/40 hover:text-red-400/80 transition-all">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── ADD / EDIT PRODUCT ── */}
        {page === 'add' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <h1 className="font-[Playfair_Display] text-3xl font-bold text-[var(--text)] mb-8">
              {editId ? 'Edit Product' : 'Add Product'}
            </h1>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8">
              <div className="grid grid-cols-1 gap-5 max-w-2xl">
                <FieldRow>
                  <Field label="Product Name *"><input value={form.name} onChange={setF('name')} placeholder="e.g. Royal Ankara" className={inputCls}/></Field>
                  <Field label="Category *">
                    <select value={form.category} onChange={setF('category')} className={inputCls + ' cursor-pointer'}>
                      {PRODUCT_CATEGORIES.map(c =>
                        <option key={c.value} value={c.value}>{c.label}</option>
                      )}
                    </select>
                  </Field>
                </FieldRow>
                <Field label="Description">
                  <textarea value={form.description} onChange={setF('description')} rows={3} placeholder="Describe this fabric..." className={inputCls + ' resize-y'}/>
                </Field>
                <FieldRow>
                  <Field label="Price (₦) *"><input type="number" value={form.price} onChange={setF('price')} placeholder="4500" className={inputCls}/></Field>
                  <Field label="Unit"><input value={form.unit} onChange={setF('unit')} placeholder="per yard" className={inputCls}/></Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Bulk Price (₦)"><input type="number" value={form.bulkPrice} onChange={setF('bulkPrice')} placeholder="Discounted price" className={inputCls}/></Field>
                  <Field label="Bulk Min Qty"><input type="number" value={form.bulkMin} onChange={setF('bulkMin')} placeholder="e.g. 10" className={inputCls}/></Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Badge Label"><input value={form.badge} onChange={setF('badge')} placeholder="Bestseller" className={inputCls}/></Field>
                  <Field label="Min Order Qty"><input type="number" value={form.minOrder} onChange={setF('minOrder')} placeholder="1" className={inputCls}/></Field>
                </FieldRow>
                <Field label="Tags (comma separated)"><input value={form.tags} onChange={setF('tags')} placeholder="traditional, colorful, wax print" className={inputCls}/></Field>
                <Field label="CSS Gradient Pattern">
                  <textarea value={form.pattern} onChange={setF('pattern')} rows={2} placeholder="linear-gradient(135deg, #color1, #color2)" className={inputCls + ' resize-y font-mono text-[12px]'}/>
                  <div className="h-16 rounded-lg border border-[var(--border)] mt-2 transition-all" style={{ background: form.pattern }}/>
                </Field>
                <FieldRow>
                  <Field label="In Stock">
                    <select value={String(form.inStock)} onChange={e => setForm(f => ({ ...f, inStock: e.target.value === 'true' }))} className={inputCls + ' cursor-pointer'}>
                      <option value="true">Yes — In Stock</option>
                      <option value="false">No — Out of Stock</option>
                    </select>
                  </Field>
                  <Field label="Featured on Homepage">
                    <select value={String(form.featured)} onChange={e => setForm(f => ({ ...f, featured: e.target.value === 'true' }))} className={inputCls + ' cursor-pointer'}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </Field>
                </FieldRow>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setPage('products'); setForm(BLANK_PRODUCT); setEditId(null); }}
                    className="flex-1 border border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[13px] py-3 rounded hover:border-[var(--text-ghost)] transition-all">
                    Cancel
                  </button>
                  <button onClick={handleProductSave}
                    className="flex-1 bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-bold uppercase tracking-wider text-[13px] py-3 rounded hover:-translate-y-0.5 transition-all">
                    {editId ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ORDERS ── */}
        {page === 'orders' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-[Playfair_Display] text-3xl font-bold text-[var(--text)]">
                Orders <span className="text-[14px] font-normal text-[var(--text-muted)] font-[Inter]">{orders.length} total</span>
              </h1>
              <button onClick={clearOrdersAction}
                className="border border-red-400/25 text-red-400/70 text-[12px] uppercase tracking-wider px-4 py-2 rounded hover:bg-red-400/10 transition-all">
                Clear All
              </button>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>{['Ref','Customer','Phone','Delivery','Total','Date','Status','View'].map(h =>
                    <th key={h} className="text-left text-[10px] tracking-wider uppercase text-[var(--gold)] px-4 py-3 border-b border-[var(--border)]">{h}</th>
                  )}</tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.ref} className="hover:bg-[var(--input-bg)] border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 font-mono text-[12px] text-[var(--gold)]">{o.ref}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-dim)]">{o.customer?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{o.customer?.phone || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{o.delivery === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}</td>
                      <td className="px-4 py-3 text-sm text-[var(--gold-light)]">{formatPrice(o.total || o.subtotal || 0)}</td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{o.date ? new Date(o.date).toLocaleDateString('en-NG') : '—'}</td>
                      <td className="px-4 py-3">
                        <select value={o.status}
                          onChange={e => updateOrderStatusAction(o.ref, e.target.value)}
                          className="bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text)] text-[12px] focus:outline-none focus:border-[var(--gold-dim)] cursor-pointer">
                          {['pending','confirmed','processing','fulfilled','cancelled'].map(s =>
                            <option key={s}>{s}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setViewOrder(o)}
                          className="w-8 h-8 border border-[var(--border)] rounded flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--gold-dim)] hover:text-[var(--gold-light)] transition-all">
                          <ExternalLink size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">No orders yet. Share your shop link!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            WEBSITE CONTENT PAGES
        ════════════════════════════════════════ */}

        {/* ── WEB: HERO ── */}
        {page === 'web-hero' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="Hero Section" sub="Landing page hero — first thing visitors see" />

            <SectionCard title="Headlines & Copy"
              onReset={() => { setHeroForm(siteContent.hero); showToast('Reset to saved'); }}>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Eyebrow Text">
                  <input value={heroForm.eyebrow} onChange={e => setHeroForm(f=>({...f,eyebrow:e.target.value}))} className={inputCls}/>
                </Field>
                <FieldRow>
                  <Field label="Title Line 1">
                    <input value={heroForm.titleLine1} onChange={e => setHeroForm(f=>({...f,titleLine1:e.target.value}))} className={inputCls}/>
                  </Field>
                  <Field label="Title Line 2 (italic + gold)">
                    <input value={heroForm.titleLine2} onChange={e => setHeroForm(f=>({...f,titleLine2:e.target.value}))} className={inputCls}/>
                  </Field>
                </FieldRow>
                <Field label="Subtitle">
                  <textarea value={heroForm.subtitle} onChange={e => setHeroForm(f=>({...f,subtitle:e.target.value}))} rows={3} className={inputCls + ' resize-y'}/>
                </Field>
                <FieldRow>
                  <Field label="Primary Button Text">
                    <input value={heroForm.ctaPrimary} onChange={e => setHeroForm(f=>({...f,ctaPrimary:e.target.value}))} className={inputCls}/>
                  </Field>
                  <Field label="Secondary Button Text">
                    <input value={heroForm.ctaSecondary} onChange={e => setHeroForm(f=>({...f,ctaSecondary:e.target.value}))} className={inputCls}/>
                  </Field>
                </FieldRow>
              </div>
              <SaveBar onSave={() => { updateSiteSection('hero', heroForm); saved('Hero copy'); }}/>
            </SectionCard>

            <SectionCard title="Floating Fabric Cards" onReset={() => { setFabricCards(siteContent.hero.fabricCards); }}>
              <div className="flex flex-col gap-4">
                {fabricCards.map((card, i) => (
                  <div key={i} className="flex gap-3 items-start bg-[var(--bg-3)] border border-[var(--border)] rounded-lg p-4">
                    <div className="w-16 h-16 rounded-md flex-shrink-0 border border-[var(--border)]" style={{ background: card.pattern }}/>
                    <div className="flex-1 grid grid-cols-1 gap-2">
                      <Field label="Card Label">
                        <input value={card.label} onChange={e => updateCard(i,'label',e.target.value)} className={inputCls}/>
                      </Field>
                      <Field label="CSS Gradient Pattern">
                        <input value={card.pattern} onChange={e => updateCard(i,'pattern',e.target.value)} className={inputCls + ' font-mono text-[12px]'}/>
                      </Field>
                    </div>
                    <button onClick={() => removeCard(i)}
                      className="text-[var(--text-ghost)] hover:text-[var(--danger)] transition-colors mt-1">
                      <Trash2 size={15}/>
                    </button>
                  </div>
                ))}
                <button onClick={addCard}
                  className="border border-dashed border-[var(--border)] rounded-lg py-3 text-[13px] text-[var(--text-muted)] hover:border-[var(--gold-dim)] hover:text-[var(--gold-light)] transition-all flex items-center justify-center gap-2">
                  <Plus size={14}/> Add Fabric Card
                </button>
              </div>
              <SaveBar onSave={() => { updateSiteSection('hero', { ...heroForm, fabricCards }); saved('Hero cards'); }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── WEB: ABOUT ── */}
        {page === 'web-about' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="About Section" sub="The story section below the hero" />
            <SectionCard title="About Copy" onReset={() => setAboutForm(siteContent.about)}>
              <div className="grid grid-cols-1 gap-4">
                <FieldRow>
                  <Field label="Eyebrow Text">
                    <input value={aboutForm.eyebrow} onChange={e => setAboutForm(f=>({...f,eyebrow:e.target.value}))} className={inputCls}/>
                  </Field>
                  <Field label="Badge Number (e.g. 500+)">
                    <input value={aboutForm.badgeNumber} onChange={e => setAboutForm(f=>({...f,badgeNumber:e.target.value}))} className={inputCls}/>
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Title Line">
                    <input value={aboutForm.title} onChange={e => setAboutForm(f=>({...f,title:e.target.value}))} className={inputCls}/>
                  </Field>
                  <Field label="Title Italic Line (gold)">
                    <input value={aboutForm.titleItalic} onChange={e => setAboutForm(f=>({...f,titleItalic:e.target.value}))} className={inputCls}/>
                  </Field>
                </FieldRow>
                <Field label="Body Paragraph 1">
                  <textarea value={aboutForm.body1} onChange={e => setAboutForm(f=>({...f,body1:e.target.value}))} rows={3} className={inputCls + ' resize-y'}/>
                </Field>
                <Field label="Body Paragraph 2">
                  <textarea value={aboutForm.body2} onChange={e => setAboutForm(f=>({...f,body2:e.target.value}))} rows={3} className={inputCls + ' resize-y'}/>
                </Field>
                <Field label="Badge Label">
                  <input value={aboutForm.badgeLabel} onChange={e => setAboutForm(f=>({...f,badgeLabel:e.target.value}))} className={inputCls}/>
                </Field>
              </div>
            </SectionCard>
            <SectionCard title="Stats Bar">
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(n => (
                  <div key={n} className="flex flex-col gap-3">
                    <Field label={`Stat ${n} Value`}>
                      <input value={aboutForm[`stat${n}Value`]} onChange={e => setAboutForm(f=>({...f,[`stat${n}Value`]:e.target.value}))} className={inputCls}/>
                    </Field>
                    <Field label={`Stat ${n} Label`}>
                      <input value={aboutForm[`stat${n}Label`]} onChange={e => setAboutForm(f=>({...f,[`stat${n}Label`]:e.target.value}))} className={inputCls}/>
                    </Field>
                  </div>
                ))}
              </div>
              <SaveBar onSave={() => { updateSiteSection('about', aboutForm); saved('About'); }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── WEB: MARQUEE ── */}
        {page === 'web-marquee' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="Marquee Ticker" sub="The scrolling text strip between hero and about" />
            <SectionCard title="Ticker Items" onReset={() => setMarqueeForm(siteContent.marquee.join(', '))}>
              <Field label="Items (comma separated)">
                <textarea value={marqueeForm} onChange={e => setMarqueeForm(e.target.value)} rows={4}
                  placeholder="Ankara, Guinea Brocade, Lace Fabrics, ..."
                  className={inputCls + ' resize-y'}/>
              </Field>
              <p className="text-[12px] text-[var(--text-muted)] mt-2">Each item separated by a comma. Dots (·) are added automatically between items.</p>
              <div className="mt-4 overflow-hidden border border-[var(--border)] rounded-lg py-3 px-4 bg-[var(--bg-3)]">
                <p className="text-[11px] text-[var(--text-ghost)] mb-2 uppercase tracking-wider">Preview:</p>
                <p className="text-[13px] text-[var(--text-muted)] truncate">
                  {marqueeForm.split(',').map(s => s.trim()).filter(Boolean).join(' · ')}
                </p>
              </div>
              <SaveBar onSave={() => {
                const items = marqueeForm.split(',').map(s => s.trim()).filter(Boolean);
                setSiteArray('marquee', items);
                saved('Marquee ticker');
              }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── WEB: FABRIC CARDS (landing grid) ── */}
        {page === 'web-fabrics' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="Fabric Cards — Landing Grid" sub="The product cards shown on the homepage. Edit actual products from Products → Manage." />
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-7">
              <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-5">
                The landing page fabric grid pulls directly from your <strong className="text-[var(--text-dim)]">Products</strong> list.
                To control which fabrics show on the homepage, toggle the <strong className="text-[var(--text-dim)]">"Featured on Homepage"</strong> flag when adding or editing a product.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.filter(p => p.featured).map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-[var(--bg-3)] border border-[var(--border)] rounded-lg p-3">
                    <div className="w-10 h-10 rounded-md flex-shrink-0" style={{ background: p.pattern }}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text)] truncate">{p.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{formatPrice(p.price)} · {p.unit}</div>
                    </div>
                    <button onClick={() => startEdit(p)} className="text-[var(--text-ghost)] hover:text-[var(--gold-light)] transition-colors">
                      <Edit size={14}/>
                    </button>
                  </div>
                ))}
                {products.filter(p => p.featured).length === 0 && (
                  <p className="col-span-3 text-[var(--text-muted)] text-sm">No featured products yet. Mark products as featured when adding/editing.</p>
                )}
              </div>
              <div className="mt-5">
                <button onClick={() => setPage('products')}
                  className="border border-[var(--border)] text-[var(--text-muted)] text-[13px] uppercase tracking-wider px-5 py-2.5 rounded hover:border-[var(--gold-dim)] hover:text-[var(--gold-light)] transition-all">
                  Manage All Products →
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── WEB: TESTIMONIALS ── */}
        {page === 'web-testimonials' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="Testimonials" sub="Customer reviews shown on the landing page" />
            <SectionCard title="Reviews" onReset={() => setTestimonialsForm(siteContent.testimonials)}>
              <div className="flex flex-col gap-4">
                {testimonialsForm.map((t, i) => (
                  <div key={i} className="bg-[var(--bg-3)] border border-[var(--border)] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] text-[var(--gold)] font-semibold">Review #{i + 1}</span>
                      <button onClick={() => removeTestimonial(i)}
                        className="text-[var(--text-ghost)] hover:text-[var(--danger)] transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Review Text">
                        <textarea value={t.text} onChange={e => updateTestimonial(i,'text',e.target.value)} rows={3} className={inputCls + ' resize-y'}/>
                      </Field>
                      <FieldRow>
                        <Field label="Author Name, City">
                          <input value={t.author} onChange={e => updateTestimonial(i,'author',e.target.value)} placeholder="Adaeze O., Ilorin" className={inputCls}/>
                        </Field>
                        <Field label="Stars (1–5)">
                          <input type="number" min={1} max={5} value={t.stars} onChange={e => updateTestimonial(i,'stars',Number(e.target.value))} className={inputCls}/>
                        </Field>
                      </FieldRow>
                    </div>
                  </div>
                ))}
                <button onClick={addTestimonial}
                  className="border border-dashed border-[var(--border)] rounded-lg py-3 text-[13px] text-[var(--text-muted)] hover:border-[var(--gold-dim)] hover:text-[var(--gold-light)] transition-all flex items-center justify-center gap-2">
                  <Plus size={14}/> Add Testimonial
                </button>
              </div>
              <SaveBar onSave={() => { setSiteArray('testimonials', testimonialsForm); saved('Testimonials'); }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── WEB: CTA BANNER ── */}
        {page === 'web-cta' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="CTA Banner" sub="The call-to-action strip above the contact section" />
            <SectionCard title="CTA Copy" onReset={() => setCtaForm(siteContent.cta)}>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Headline">
                  <input value={ctaForm.title} onChange={e => setCtaForm(f=>({...f,title:e.target.value}))} className={inputCls}/>
                </Field>
                <Field label="Subtitle">
                  <input value={ctaForm.subtitle} onChange={e => setCtaForm(f=>({...f,subtitle:e.target.value}))} className={inputCls}/>
                </Field>
                <FieldRow>
                  <Field label="Primary Button">
                    <input value={ctaForm.btnPrimary} onChange={e => setCtaForm(f=>({...f,btnPrimary:e.target.value}))} className={inputCls}/>
                  </Field>
                  <Field label="Secondary Button">
                    <input value={ctaForm.btnSecondary} onChange={e => setCtaForm(f=>({...f,btnSecondary:e.target.value}))} className={inputCls}/>
                  </Field>
                </FieldRow>
              </div>
              <SaveBar onSave={() => { updateSiteSection('cta', ctaForm); saved('CTA Banner'); }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── WEB: CONTACT ── */}
        {page === 'web-contact' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="Contact Info" sub="Displayed in the landing page contact section and footer" />
            <SectionCard title="Contact Details" onReset={() => setContactForm(siteContent.contact)}>
              <div className="grid grid-cols-1 gap-4">
                <FieldRow>
                  <Field label="Phone Number">
                    <input value={contactForm.phone} onChange={e => setContactForm(f=>({...f,phone:e.target.value}))} placeholder="+234 800 000 0000" className={inputCls}/>
                  </Field>
                  <Field label="Email Address">
                    <input type="email" value={contactForm.email} onChange={e => setContactForm(f=>({...f,email:e.target.value}))} placeholder="lumngfabrics@gmail.com" className={inputCls}/>
                  </Field>
                </FieldRow>
                <Field label="Physical Address">
                  <input value={contactForm.address} onChange={e => setContactForm(f=>({...f,address:e.target.value}))} placeholder="Ilorin, Kwara State" className={inputCls}/>
                </Field>
                <FieldRow>
                  <Field label="Store Address (pickup)">
                    <input value={contactForm.storeAddress} onChange={e => setContactForm(f=>({...f,storeAddress:e.target.value}))} placeholder="Ilorin, Kwara State." className={inputCls}/>
                  </Field>
                  <Field label="Opening Hours">
                    <input value={contactForm.hours} onChange={e => setContactForm(f=>({...f,hours:e.target.value}))} placeholder="Mon–Sat 9am–6pm" className={inputCls}/>
                  </Field>
                </FieldRow>
              </div>
              <SaveBar onSave={() => { updateSiteSection('contact', contactForm); saved('Contact Info'); }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── WEB: FOOTER ── */}
        {page === 'web-footer' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="Footer" sub="Bottom of every page" />
            <SectionCard title="Footer Content" onReset={() => setFooterForm(siteContent.footer)}>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Tagline / Description">
                  <textarea value={footerForm.tagline} onChange={e => setFooterForm(f=>({...f,tagline:e.target.value}))} rows={2} className={inputCls + ' resize-y'}/>
                </Field>
                <Field label="Copyright Line">
                  <input value={footerForm.copyright} onChange={e => setFooterForm(f=>({...f,copyright:e.target.value}))} className={inputCls}/>
                </Field>
              </div>
              <SaveBar onSave={() => { updateSiteSection('footer', footerForm); saved('Footer'); }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── WEB: SEO ── */}
        {page === 'web-seo' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <PageHeader title="SEO / Meta Tags" sub="Controls browser tab title and search engine preview" />
            <SectionCard title="Meta Data" onReset={() => setSeoForm(siteContent.seo)}>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Site Title (browser tab)">
                  <input value={seoForm.siteTitle} onChange={e => setSeoForm(f=>({...f,siteTitle:e.target.value}))} placeholder="LUM NG — Unisex Fabric Store | Ilorin, Kwara" className={inputCls}/>
                </Field>
                <Field label="Meta Description (search engines, ~155 chars)">
                  <textarea value={seoForm.metaDescription} onChange={e => setSeoForm(f=>({...f,metaDescription:e.target.value}))} rows={3} className={inputCls + ' resize-y'}
                    placeholder="LUM NG — premium unisex fabric store in Ilorin, Kwara. Lace, Ankara, Senator, Guinea, Bonnets and more."/>
                </Field>
                <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-lg p-4 mt-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-ghost)] mb-2">Google Preview</p>
                  <p className="text-blue-400 text-[14px] font-medium">{seoForm.siteTitle || 'LUM NG — Unisex Fabric Store | Ilorin, Kwara'}</p>
                  <p className="text-green-500/70 text-[12px]">https://lumng.com</p>
                  <p className="text-[var(--text-muted)] text-[13px] mt-1">{seoForm.metaDescription || 'Meta description will appear here...'}</p>
                </div>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Note: After saving, inform your developer i.e me Timothy lol to update your <code className="bg-[var(--bg-3)] px-1 rounded">index.html</code> &lt;title&gt; and &lt;meta name="description"&gt; tags to apply these values.
                </p>
              </div>
              <SaveBar onSave={() => { updateSiteSection('seo', seoForm); saved('SEO / Meta'); }}/>
            </SectionCard>
          </motion.div>
        )}

        {/* ── SETTINGS ── */}
        {page === 'settings' && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
            <h1 className="font-[Playfair_Display] text-3xl font-bold text-[var(--text)] mb-8">Settings</h1>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 max-w-2xl mb-6">
              <h2 className="font-semibold text-[var(--text)] mb-5">Admin Credentials</h2>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="New Username">
                  <input value={newCreds.user} onChange={e => setNewCreds(c=>({...c,user:e.target.value}))} placeholder="New username" className={inputCls}/>
                </Field>
                <Field label="New Password">
                  <input type="password" value={newCreds.pass} onChange={e => setNewCreds(c=>({...c,pass:e.target.value}))} placeholder="New password" className={inputCls}/>
                </Field>
              </div>
              <button onClick={async () => {
                if (!newCreds.user || !newCreds.pass) { showToast('Enter both fields'); return; }
                try {
                  await authApi.updateCredentials({ username: newCreds.user, password: newCreds.pass });
                  localStorage.setItem('lumng_admin_username', newCreds.user);
                  setNewCreds({ user:'', pass:'' });
                  showToast('✓ Credentials updated — use the new login next time');
                } catch (err) { failed('Update credentials', err); }
              }} className="bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-bold uppercase tracking-wider text-[13px] px-6 py-2.5 rounded hover:-translate-y-0.5 transition-all">
                Update Credentials
              </button>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 max-w-2xl">
              <h2 className="font-semibold text-[var(--text)] mb-2">Reset Website Content</h2>
              <p className="text-sm text-[var(--text-muted)] mb-5">Resets all website text/copy to the original defaults. Products and orders are not affected.</p>
              <button onClick={async () => { if (confirm('Reset all website content to defaults?')) { await resetSiteContent(); showToast('✓ Website content reset'); } }}
                className="border border-red-400/25 text-red-400/70 text-[13px] uppercase tracking-wider px-5 py-2.5 rounded hover:bg-red-400/10 transition-all">
                Reset Website Content
              </button>
            </div>
          </motion.div>
        )}

      </main>

      {/* ── Order detail modal ── */}
      <AnimatePresence>
        {viewOrder && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 bg-[var(--overlay)] z-50 flex items-center justify-center p-5"
            onClick={() => setViewOrder(null)}>
            <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 w-full max-w-[520px] max-h-[90vh] overflow-y-auto relative"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewOrder(null)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)]"><X size={20}/></button>
              <h3 className="font-[Playfair_Display] text-xl font-bold text-[var(--text)] mb-1">Order Details</h3>
              <div className="font-mono text-[13px] text-[var(--gold)] mb-6">{viewOrder.ref}</div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                {[['Customer', viewOrder.customer?.name],['Phone', viewOrder.customer?.phone],['Email', viewOrder.customer?.email],['Delivery', viewOrder.delivery]].map(([k,v]) => (
                  <div key={k}>
                    <span className="text-[10px] tracking-wider uppercase text-[var(--gold)] block mb-1">{k}</span>
                    <span className="text-[var(--text-dim)]">{v || '—'}</span>
                  </div>
                ))}
                {viewOrder.customer?.address && (
                  <div className="col-span-2">
                    <span className="text-[10px] tracking-wider uppercase text-[var(--gold)] block mb-1">Address</span>
                    <span className="text-[var(--text-dim)]">{viewOrder.customer.address}{viewOrder.customer.state ? `, ${viewOrder.customer.state}` : ''}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-2 mb-4">
                {(viewOrder.items || []).map((item, i) => {
                  const p = products.find(x => x.id === item.id);
                  if (!p) return null;
                  const price = item.qty >= (p.bulkMin || Infinity) ? p.bulkPrice : p.price;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <div className="w-10 h-10 rounded-md flex-shrink-0" style={{ background: p.pattern }}/>
                      <div className="flex-1 text-sm">
                        <div className="font-semibold text-[var(--text)]">{p.name}</div>
                        <div className="text-[var(--text-muted)] text-xs">{item.qty} × {p.unit}</div>
                      </div>
                      <div className="text-[var(--gold-light)] font-semibold">{formatPrice(price * item.qty)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-right font-bold text-lg text-[var(--text)]">
                Total: {formatPrice(viewOrder.total || viewOrder.subtotal || 0)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            className="fixed bottom-8 right-8 bg-[var(--bg-card)] border border-[var(--gold-dim)] rounded-lg px-5 py-3.5 text-sm text-[var(--text)] z-[999] shadow-[var(--shadow-gold)]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageHeader({ title, sub }) {
  return (
    <div className="mb-8">
      <h1 className="font-[Playfair_Display] text-3xl font-bold text-[var(--text)]">{title}</h1>
      {sub && <p className="text-[var(--text-muted)] text-sm mt-1">{sub}</p>}
    </div>
  );
}

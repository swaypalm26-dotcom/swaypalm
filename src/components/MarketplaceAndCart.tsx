import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSwayPalm } from '../context/SwayPalmContext';
import {
  BUSINESS_CATEGORIES,
  BusinessCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  calculateOrderSplit,
} from '../types';
import { resizeImageFileToDataUrl } from '../data/sampleCatalog';
import { VerifiedBadge } from './BrandMark';
import { CardPaymentForm } from './CardPaymentForm';
import { MediaArtwork } from './MediaArtwork';

export const MarketplaceView: React.FC = () => {
  const {
    products,
    selectedProduct,
    setSelectedProduct,
    addToCart,
    setShowCartDrawer,
    addProduct,
    startDirectChat,
    openBusinessProfile,
    getBusinessById,
    getDisplayBusinessName,
    notifyToast,
  } = useSwayPalm();

  const [categoryFilter, setCategoryFilter] = useState<'All' | BusinessCategory>('All');
  const [queryText, setQueryText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailQty, setDetailQty] = useState(1);

  // Add product form
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('20');
  const [category, setCategory] = useState<BusinessCategory>('Fashion');
  const [description, setDescription] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return products
      .filter((p) => {
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        if (q) {
          const sellerBiz = getBusinessById(p.business_id);
          const sellerName = (sellerBiz?.name || '').toLowerCase();
          const sellerCountry = (sellerBiz?.country || '').toLowerCase();
          const sellerCity = (sellerBiz?.city || '').toLowerCase();
          if (
            !p.title.toLowerCase().includes(q) &&
            !sellerName.includes(q) &&
            !sellerCountry.includes(q) &&
            !sellerCity.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => Number(b.boosted) - Number(a.boosted));
  }, [products, categoryFilter, queryText, getBusinessById]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 800);
      setImageDataUrl(dataUrl);
    } catch {
      notifyToast('Could not read product image.', 'error');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price || !description.trim()) return;
    setSaving(true);
    try {
      await addProduct({
        title,
        description,
        price: Number(price),
        stock: Number(stock) || 1,
        category,
        imageDataUrl,
      });
      setShowAddModal(false);
      setTitle('');
      setPrice('');
      setStock('20');
      setDescription('');
      setImageDataUrl(undefined);
    } finally {
      setSaving(false);
    }
  };

  // Product Detail View
  if (selectedProduct) {
    const sellerBiz = getBusinessById(selectedProduct.business_id);
    const sellerName =
      sellerBiz?.name ||
      getDisplayBusinessName(selectedProduct.business_id, selectedProduct.user_id);
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedProduct(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-6 bg-[#FAFBFB]">
            <MediaArtwork
              theme={selectedProduct.imageTheme}
              imageDataUrl={selectedProduct.imageDataUrl}
              title={selectedProduct.title}
              aspectClass="aspect-[4/3] lg:h-full"
            />
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{selectedProduct.category}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {sellerBiz?.city || 'Global'}
                  {sellerBiz?.country ? `, ${sellerBiz.country}` : ''}
                </span>
              </div>

              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-neutral-900 mt-2">
                {selectedProduct.title}
              </h1>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono font-bold text-2xl text-[#0A4D2E] tabular-nums">
                  ${selectedProduct.price.toFixed(2)}
                </span>
                <span className="text-xs font-medium text-neutral-500 tabular-nums">
                  {selectedProduct.stock} units available
                </span>
              </div>

              <p className="text-sm text-neutral-700 mt-4 leading-relaxed">
                {selectedProduct.description}
              </p>

              {/* Seller Strip */}
              <div className="mt-6 p-3.5 rounded-lg bg-[#F3F5F4] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => openBusinessProfile(selectedProduct.business_id)}
                  className="text-left min-w-0"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900 truncate hover:text-[#0A4D2E]">
                      {sellerName}
                    </span>
                    {sellerBiz?.verified && (
                      <VerifiedBadge plan={sellerBiz.plan || 'pro'} className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Click to view seller storefront
                  </p>
                </button>
                {sellerBiz && (
                  <button
                    type="button"
                    onClick={() =>
                      startDirectChat(
                        sellerBiz,
                        `Hello ${sellerBiz.name}, I am interested in "${selectedProduct.title}".`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 inline-flex items-center gap-1.5 shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#0A4D2E]" />
                    Chat Seller
                  </button>
                )}
              </div>
            </div>

            {/* Contiguous Purchase Module */}
            <div className="mt-6 pt-5 border-t border-neutral-200 space-y-3">
              {selectedProduct.stock > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-neutral-600">Quantity</span>
                    <div className="inline-flex items-center border border-neutral-300 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                        className="p-2 text-neutral-700 hover:bg-neutral-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-4 font-mono text-sm font-semibold tabular-nums">
                        {Math.min(detailQty, selectedProduct.stock)}
                      </span>
                      <button
                        type="button"
                        disabled={detailQty >= selectedProduct.stock}
                        onClick={() => setDetailQty(Math.min(selectedProduct.stock, detailQty + 1))}
                        className="p-2 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => addToCart(selectedProduct, Math.min(detailQty, selectedProduct.stock))}
                      className="py-2.5 px-4 rounded-lg border border-[#0A4D2E] text-[#0A4D2E] hover:bg-[#0A4D2E]/5 text-sm font-semibold inline-flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedProduct, Math.min(detailQty, selectedProduct.stock));
                        setShowCartDrawer(true);
                      }}
                      className="py-2.5 px-4 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Buy Now
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-600 text-center">
                  Currently Out of Stock
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-neutral-900">
              Global B2B & Retail Marketplace
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Source products directly from verified businesses worldwide or list your own catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search products, sellers, or countries..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D2E]"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['All', ...BUSINESS_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#0A4D2E] text-white'
                  : 'bg-[#F3F5F4] text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((prod) => {
          const sellerBiz = getBusinessById(prod.business_id);
          const sellerName =
            sellerBiz?.name || getDisplayBusinessName(prod.business_id, prod.user_id);
          return (
            <div
              key={prod.product_id}
              className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between hover:-translate-y-0.5 transition-transform duration-150"
            >
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailQty(1);
                    setSelectedProduct(prod);
                  }}
                  className="w-full block text-left"
                >
                  <MediaArtwork
                    theme={prod.imageTheme}
                    imageDataUrl={prod.imageDataUrl}
                    aspectClass="aspect-[4/3]"
                  />
                </button>
                <div className="p-4">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="uppercase tracking-wide font-medium">{prod.category}</span>
                    <span>{prod.boosted ? 'Featured' : `${prod.stock} in stock`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailQty(1);
                      setSelectedProduct(prod);
                    }}
                    className="text-left block mt-1"
                  >
                    <h3 className="font-display font-bold text-sm text-neutral-900 line-clamp-2 hover:text-[#0A4D2E]">
                      {prod.title}
                    </h3>
                  </button>
                  <div className="flex items-center gap-1 text-xs text-neutral-600 mt-1.5">
                    <span className="truncate">{sellerName}</span>
                    {sellerBiz?.verified && (
                      <VerifiedBadge plan={sellerBiz.plan} className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {sellerBiz ? `${sellerBiz.city}, ${sellerBiz.country}` : 'Global'}
                  </p>
                </div>
              </div>

            <div className="px-4 pb-4 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-base text-[#0A4D2E] tabular-nums">
                ${prod.price}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDetailQty(1);
                    setSelectedProduct(prod);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  View
                </button>
                <button
                  type="button"
                  disabled={prod.stock <= 0}
                  onClick={() => addToCart(prod, 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold hover:bg-[#083D24] disabled:bg-neutral-300 disabled:text-neutral-600"
                >
                  {prod.stock > 0 ? 'Add' : 'Out'}
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="font-display font-bold text-base text-neutral-900">
                List a Product on SwayPalm
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Virgin Brazilian Body Wave Hair Bundles"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                    className="w-full px-2.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                  >
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {Number(price) > 0 && (
                <div className="p-3 rounded-lg bg-[#F3F5F4] border border-neutral-200 flex items-center justify-between gap-3 text-xs">
                  <span className="text-neutral-600">
                    10% Website Sales Fee:{' '}
                    <strong className="font-mono text-neutral-900">
                      -${calculateOrderSplit(Number(price)).platformFeeAmount.toFixed(2)}
                    </strong>
                  </span>
                  <span className="text-[#0A4D2E] font-semibold">
                    You Receive (90%):{' '}
                    <strong className="font-mono">
                      ${calculateOrderSplit(Number(price)).sellerNetAmount.toFixed(2)}
                    </strong>
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe quality, minimum order quantity, and shipping options..."
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Product Photo (Optional)
                </label>
                <label className="cursor-pointer flex items-center justify-center gap-2 p-3 border border-dashed border-neutral-300 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50">
                  <Upload className="w-4 h-4 text-[#0A4D2E]" />
                  {imageDataUrl ? 'Change uploaded photo' : 'Upload product photo'}
                  <input type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-[#0A4D2E] text-white text-xs font-semibold hover:bg-[#083D24]"
                >
                  {saving ? 'Publishing...' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const CartCheckoutDrawer: React.FC = () => {
  const {
    cart,
    showCartDrawer,
    setShowCartDrawer,
    updateCartQty,
    removeFromCart,
    checkoutCart,
    getDisplayBusinessName,
    userProfile,
  } = useSwayPalm();

  const [buyerName, setBuyerName] = useState(userProfile?.displayName || '');
  const [buyerPhone, setBuyerPhone] = useState(userProfile?.phone || '+254');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('M-Pesa');
  const [submitting, setSubmitting] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  React.useEffect(() => {
    if (userProfile?.displayName && !buyerName) {
      setBuyerName(userProfile.displayName);
    }
    if (userProfile?.phone && (!buyerPhone || buyerPhone === '+254')) {
      setBuyerPhone(userProfile.phone);
    }
  }, [userProfile?.displayName, userProfile?.phone, showCartDrawer]);

  if (!showCartDrawer) return null;

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const orderSplit = calculateOrderSplit(subtotal);
  const isCardMethod = paymentMethod === 'Card' || paymentMethod === 'Stripe';

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCardMethod) return;
    if (!buyerName.trim() || !buyerPhone.trim() || !shippingAddress.trim()) {
      setDeliveryError('Enter recipient name, contact phone, and delivery address.');
      return;
    }
    setDeliveryError(null);
    setSubmitting(true);
    try {
      await checkoutCart({
        buyerName,
        buyerPhone,
        shippingAddress,
        paymentMethod,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="flex-1" onClick={() => setShowCartDrawer(false)} />
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-neutral-900">
            Cart & Checkout ({cart.reduce((s, i) => s + i.quantity, 0)})
          </h2>
          <button
            type="button"
            onClick={() => setShowCartDrawer(false)}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="font-semibold text-sm text-neutral-900">Your cart is empty</p>
              <p className="text-xs text-neutral-500 mt-1">
                Browse the Marketplace to add wholesale or retail products.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.product_id}
                    className="p-3 border border-neutral-200 rounded-lg flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-900 line-clamp-1">
                        {item.product.title}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {getDisplayBusinessName(item.product.business_id, item.product.user_id)}
                      </p>
                      <p className="font-mono text-xs font-semibold text-[#0A4D2E] mt-1 tabular-nums">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product.product_id, item.quantity - 1)}
                        className="p-1 border border-neutral-300 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs w-6 text-center tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.product.stock}
                        onClick={() => updateCartQty(item.product.product_id, item.quantity + 1)}
                        className="p-1 border border-neutral-300 rounded disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.product_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCheckout} className="pt-4 border-t border-neutral-200 space-y-3">
                <h3 className="font-display font-bold text-sm text-neutral-900">
                  Delivery & Payment Details
                </h3>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Recipient / Company Name"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="Contact Phone (+254...)"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Delivery City, Street & Country"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method);
                          setDeliveryError(null);
                        }}
                        className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                          paymentMethod === method
                            ? 'bg-[#0A4D2E] text-white border-[#0A4D2E]'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Order Total</span>
                    <span className="font-mono text-lg text-[#0A4D2E] tabular-nums">
                      ${orderSplit.grossAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F3F5F4] border border-neutral-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Platform Sales Fee (10% Auto-Deducted)</span>
                      <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                        -${orderSplit.platformFeeAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#0A4D2E] font-semibold">
                      <span>Seller Net Payout (90%)</span>
                      <span className="font-mono tabular-nums">
                        ${orderSplit.sellerNetAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {deliveryError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    {deliveryError}
                  </p>
                )}

                {isCardMethod ? (
                  <CardPaymentForm
                    purpose="marketplace"
                    amountUsd={subtotal}
                    description={`SwayPalm Marketplace Order (${cart.length} item${cart.length === 1 ? '' : 's'})`}
                    methodLabel={paymentMethod}
                    defaultName={buyerName || userProfile?.displayName || ''}
                    defaultEmail={userProfile?.email || ''}
                    submittingExternal={submitting}
                    onBeforeStripeRedirect={() => {
                      if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem(
                          'swaypalm_pending_stripe_cart',
                          JSON.stringify({
                            buyerName: buyerName.trim() || userProfile?.displayName || 'SwayPalm Buyer',
                            buyerPhone: buyerPhone.trim() || '+254700000000',
                            shippingAddress: shippingAddress.trim() || 'Pickup / To be confirmed',
                            paymentMethod,
                          })
                        );
                      }
                    }}
                    onAuthorized={async () => {
                      if (!buyerName.trim() || !buyerPhone.trim() || !shippingAddress.trim()) {
                        setDeliveryError(
                          'Enter Recipient Name, Contact Phone, and Delivery Address above before completing card payment.'
                        );
                        return;
                      }
                      setDeliveryError(null);
                      setSubmitting(true);
                      try {
                        await checkoutCart({
                          buyerName,
                          buyerPhone,
                          shippingAddress,
                          paymentMethod,
                        });
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-lg bg-[#0A4D2E] hover:bg-[#083D24] text-white text-sm font-semibold transition-colors"
                  >
                    {submitting ? 'Confirming Order...' : `Place Order via ${paymentMethod}`}
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SupplierOrder, ProductReview } from '../../types';
import { subscribeBuyerSupplierOrders, apiAddProductReview, subscribeOrderReviews } from '../../services/firebaseService';
import { Star, Image as ImageIcon, Send, Clock, CheckCircle, Package } from 'lucide-react';
import { format } from 'date-fns';

export function MyOrdersTab() {
  const { currentOrg } = useApp();
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  
  useEffect(() => {
    if (!currentOrg) return;
    const unsub = subscribeBuyerSupplierOrders(currentOrg.id, setOrders);
    return () => unsub();
  }, [currentOrg]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <h2 className="text-3xl font-black text-[#15263f]">Meus Pedidos</h2>
      {orders.length === 0 ? (
        <div className="text-center text-slate-500 py-10">Nenhum pedido encontrado.</div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <OrderItemCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderItemCard({ order }: { order: SupplierOrder }) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeOrderReviews(order.id, setReviews);
    return () => unsub();
  }, [order.id]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-800">Pedido #{order.id.substring(0, 8)}</h3>
          <p className="text-sm text-slate-500">{format(order.createdAt, 'dd/MM/yyyy HH:mm')} • Fornecedor: {order.supplierName}</p>
        </div>
        <div>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase">{order.status}</span>
        </div>
      </div>

      <div className="space-y-4">
        {order.items.map(item => {
          const existingReview = reviews.find(r => r.productId === item.productId);
          return (
            <div key={item.productId} className="flex flex-col gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.quantity} un x R$ {item.price.toFixed(2)}</p>
                </div>
                {existingReview ? (
                  <div className="flex gap-1 text-orange-400">
                    {Array.from({ length: existingReview.rating }).map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                ) : (
                  <button 
                    onClick={() => setReviewingItemId(reviewingItemId === item.productId ? null : item.productId)}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 underline"
                  >
                    Avaliar Produto
                  </button>
                )}
              </div>
              
              {existingReview && existingReview.feedbackText && (
                 <p className="text-sm text-slate-600 italic">"{existingReview.feedbackText}"</p>
              )}
              {existingReview && existingReview.imageUrls && existingReview.imageUrls.length > 0 && (
                <div className="flex gap-2">
                  {existingReview.imageUrls.map((url, i) => (
                    <img key={i} src={url} alt="Review" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              )}

              {reviewingItemId === item.productId && !existingReview && (
                <ReviewForm order={order} item={item} onSuccess={() => setReviewingItemId(null)} />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 text-right font-bold text-slate-800">
        Total: R$ {order.totalValue.toFixed(2)}
      </div>
    </div>
  );
}

function ReviewForm({ order, item, onSuccess }: { order: SupplierOrder, item: any, onSuccess: () => void }) {
  const { currentOrg, currentUser } = useApp();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return alert('Selecione uma nota de 1 a 5 estrelas.');
    setIsSubmitting(true);
    try {
      const review: ProductReview = {
        id: `rev_${Date.now()}_${item.productId}`,
        productId: item.productId,
        orderId: order.id,
        supplierId: order.supplierId,
        buyerOrgId: currentOrg?.id || '',
        buyerName: currentUser?.name || '',
        rating,
        feedbackText,
        imageUrls,
        createdAt: new Date()
      };
      await apiAddProductReview(review);
      onSuccess();
    } catch (err) {
      alert('Erro ao enviar avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl space-y-4">
      <div className="flex gap-2 cursor-pointer">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            size={24} 
            className={`transition-colors ${star <= (hoverRating || rating) ? 'text-orange-400' : 'text-slate-300'}`}
            fill={star <= (hoverRating || rating) ? "currentColor" : "none"}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
          />
        ))}
      </div>
      <textarea 
        placeholder="O que achou do produto?" 
        value={feedbackText}
        onChange={e => setFeedbackText(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-orange-400 h-24 resize-none"
      />
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="URL da Imagem (Opcional)" 
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
          onKeyDown={(e) => {
             if(e.key === 'Enter') {
                const val = e.currentTarget.value;
                if(val) setImageUrls([...imageUrls, val]);
                e.currentTarget.value = '';
             }
          }}
        />
      </div>
      {imageUrls.length > 0 && (
         <div className="flex gap-2 flex-wrap">
            {imageUrls.map((url, idx) => (
                <div key={idx} className="relative">
                   <img src={url} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                   <button onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                </div>
            ))}
         </div>
      )}
      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting || rating === 0}
        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        <Send size={16} /> Enviar Avaliação
      </button>
    </div>
  );
}

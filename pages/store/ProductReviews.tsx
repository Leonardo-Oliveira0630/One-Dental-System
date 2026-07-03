import React, { useState, useEffect } from 'react';
import { ProductReview } from '../../types';
import { subscribeProductReviews } from '../../services/firebaseService';
import { Star } from 'lucide-react';
import { format } from 'date-fns';

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  useEffect(() => {
    const unsub = subscribeProductReviews(productId, setReviews);
    return () => unsub();
  }, [productId]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '0.0';

  if (reviews.length === 0) {
    return (
      <div className="mt-8 border-t border-slate-100 pt-6">
        <h4 className="font-bold mb-4 text-slate-800">Avaliações do Produto</h4>
        <p className="text-sm text-slate-500">Nenhuma avaliação ainda. Seja o primeiro a avaliar após a compra!</p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      <h4 className="font-bold mb-4 text-slate-800 flex items-center gap-2">
        Avaliações do Produto 
        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
           {avgRating} <Star size={12} className="inline text-orange-400 mb-0.5" fill="currentColor"/> ({reviews.length})
        </span>
      </h4>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {reviews.map(review => (
          <div key={review.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-slate-800">{review.buyerName}</p>
                <p className="text-xs text-slate-500">{format(review.createdAt, 'dd/MM/yyyy')}</p>
              </div>
              <div className="flex text-orange-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "text-orange-400" : "text-slate-300"} />
                ))}
              </div>
            </div>
            {review.feedbackText && (
              <p className="text-sm text-slate-700 mt-2">{review.feedbackText}</p>
            )}
            {review.imageUrls && review.imageUrls.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {review.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt="Review" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

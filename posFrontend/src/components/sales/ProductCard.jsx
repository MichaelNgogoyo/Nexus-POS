import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Image, Sync } from '@mui/icons-material';

const ProductCard = ({ product, onAddToCart }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl = null;

        const fetchImage = async () => {
            if (product.id) {
                try {
                    setLoading(true);
                    const response = await api.getProductImageById(product.id);
                    if (response.data && response.data.size > 0) {
                        objectUrl = URL.createObjectURL(response.data);
                        setImageUrl(objectUrl);
                    }
                } catch (error) {
                    console.error(`Failed to fetch image for product ${product.id}`, error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchImage();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [product.id]);

    return (
        <div onClick={() => onAddToCart(product)} className="card p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-bg-tertiary transition-all duration-200">
            <div className="w-24 h-24 mb-2 flex items-center justify-center bg-bg-tertiary rounded-lg">
                {loading ? (
                    <Sync className="animate-spin text-text-muted" />
                ) : imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                    <Image className="text-text-muted" sx={{ fontSize: 40 }} />
                )}
            </div>
            <p className="font-bold">{product.name}</p>
            <p className="text-text-secondary">${product.price.toFixed(2)}</p>
        </div>
    );
};

export default ProductCard;

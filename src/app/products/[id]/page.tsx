'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import ProductForm from '@/components/products/ProductForm';
import { useProducts } from '@/hooks/useProducts';
import { fetchOne } from '@/lib/firestore';
import { Product } from '@/types';

export default function ProductEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const { addProduct, updateProduct } = useProducts();
  const [initialData, setInitialData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) return;

    const loadProduct = async () => {
      try {
        const data = await fetchOne<Product>('products', id);
        if (!data) {
          setError('Product not found');
        } else {
          setInitialData(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, isNew]);

  const handleSubmit = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      if (isNew) {
        await addProduct(data);
      } else {
        await updateProduct(id, data);
      }
      router.push('/products');
    } catch (err: any) {
      console.error(err);
      throw err; // Form will catch and display it
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/products')} sx={{ mb: 2 }}>
          Back to Products
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/products')} sx={{ mb: 2 }}>
          Back to Products
        </Button>
        <Typography variant="h4" fontWeight="bold">
          {isNew ? 'Create New Product' : 'Edit Product'}
        </Typography>
        <Typography color="text.secondary">
          Define the product or service you are pitching to provide context for the AI.
        </Typography>
      </Box>

      <ProductForm 
        initialData={initialData || undefined} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/products')}
      />
    </Box>
  );
}

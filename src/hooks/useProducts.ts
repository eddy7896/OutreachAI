import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/types';
import { createDocument, updateDocument, deleteDocument } from '@/lib/firestore';

const COLLECTION_NAME = 'products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching products:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createDocument<Product>(COLLECTION_NAME, productData);
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    return updateDocument<Product>(COLLECTION_NAME, id, productData);
  };

  const removeProduct = async (id: string) => {
    return deleteDocument(COLLECTION_NAME, id);
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    removeProduct,
  };
}

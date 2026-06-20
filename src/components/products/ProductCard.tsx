import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { Product } from '@/types';
import { useRouter } from 'next/navigation';

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => void;
}

export default function ProductCard({ product, onDelete }: ProductCardProps) {
  const router = useRouter();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="div" gutterBottom>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.description}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          <Chip label="Target Audience" size="small" variant="outlined" />
          <Typography variant="caption" sx={{ alignSelf: 'center' }}>
            {product.targetAudience}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {product.keyFeatures?.slice(0, 3).map((feature, index) => (
            <Chip key={index} label={feature} size="small" color="primary" variant="outlined" />
          ))}
          {(product.keyFeatures?.length || 0) > 3 && (
            <Chip label={`+${product.keyFeatures.length - 3} more`} size="small" />
          )}
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" color="primary" onClick={() => router.push(`/products/${product.id}`)}>
          Edit
        </Button>
        <Button size="small" color="error" onClick={() => onDelete(product.id)}>
          Delete
        </Button>
      </CardActions>
    </Card>
  );
}

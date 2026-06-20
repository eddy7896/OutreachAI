'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, Paper, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Card, CardContent } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowDownward } from '@mui/icons-material';
import { Sequence, SequenceNode, EmailTemplate } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SequenceBuilderProps {
  initialData?: Partial<Sequence>;
  templates: EmailTemplate[];
  onSubmit: (data: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function SequenceBuilder({ initialData, templates, onSubmit, isSubmitting, onCancel }: SequenceBuilderProps) {
  const [name, setName] = useState(initialData?.name || '');
  
  // Initialize with a root node if new
  const [nodes, setNodes] = useState<SequenceNode[]>(
    initialData?.nodes || [{ id: uuidv4(), type: 'email', children: [], position: { x: 0, y: 0 } }]
  );
  
  const rootNodeId = initialData?.rootNodeId || nodes[0]?.id;

  const handleAddChild = (parentId: string, branchLabel: string = 'Next Step') => {
    const newNode: SequenceNode = {
      id: uuidv4(),
      type: 'delay', // Default new nodes to delay
      delayDays: 2,
      children: [],
      position: { x: 0, y: 0 }
    };
    
    setNodes(prev => {
      const newNodes = [...prev, newNode];
      // Find parent and add child reference
      const parentIndex = newNodes.findIndex(n => n.id === parentId);
      if (parentIndex !== -1) {
        newNodes[parentIndex] = {
          ...newNodes[parentIndex],
          children: [...newNodes[parentIndex].children, { branchLabel, nodeId: newNode.id }]
        };
      }
      return newNodes;
    });
  };

  const handleUpdateNode = (id: string, updates: Partial<SequenceNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    await onSubmit({
      name,
      rootNodeId,
      nodes,
    });
  };

  // Recursive render function for the tree
  const renderNode = (nodeId: string, level: number = 0) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    return (
      <Box key={node.id} sx={{ ml: level > 0 ? 4 : 0, mt: 2, position: 'relative' }}>
        {level > 0 && (
          <ArrowDownward sx={{ position: 'absolute', left: -24, top: -16, color: 'text.secondary' }} />
        )}
        
        <Card variant="outlined" sx={{ mb: 2, width: 400, borderColor: node.type === 'email' ? 'primary.main' : 'default' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <FormControl size="small" sx={{ width: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={node.type}
                  label="Type"
                  onChange={(e) => handleUpdateNode(node.id, { type: e.target.value as SequenceNode['type'] })}
                >
                  <MenuItem value="email">Send Email</MenuItem>
                  <MenuItem value="delay">Time Delay</MenuItem>
                  <MenuItem value="condition">Condition Split</MenuItem>
                  <MenuItem value="end">End Sequence</MenuItem>
                </Select>
              </FormControl>
              
              {node.id !== rootNodeId && (
                <IconButton size="small" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {node.type === 'email' && (
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Template</InputLabel>
                <Select
                  value={node.templateId || ''}
                  label="Template"
                  onChange={(e) => handleUpdateNode(node.id, { templateId: e.target.value })}
                >
                  {templates.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {node.type === 'delay' && (
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Wait (Days)"
                value={node.delayDays || 1}
                onChange={(e) => handleUpdateNode(node.id, { delayDays: parseInt(e.target.value) })}
                sx={{ mb: 2 }}
              />
            )}

            {node.type === 'condition' && (
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={node.conditionType || 'reply_received'}
                  label="Condition"
                  onChange={(e) => handleUpdateNode(node.id, { conditionType: e.target.value as SequenceNode['conditionType'] })}
                >
                  <MenuItem value="reply_received">If Reply Received</MenuItem>
                  <MenuItem value="no_reply">If No Reply</MenuItem>
                  <MenuItem value="positive_intent">If Positive Intent</MenuItem>
                </Select>
              </FormControl>
            )}

            {node.type !== 'end' && (
              <Box sx={{ mt: 2 }}>
                {node.type === 'condition' ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => handleAddChild(node.id, 'Yes')} disabled={node.children.some(c => c.branchLabel === 'Yes')}>
                      Add "Yes" Path
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => handleAddChild(node.id, 'No')} disabled={node.children.some(c => c.branchLabel === 'No')}>
                      Add "No" Path
                    </Button>
                  </Box>
                ) : (
                  <Button 
                    size="small" 
                    startIcon={<AddIcon />} 
                    onClick={() => handleAddChild(node.id)}
                    disabled={node.children.length > 0} // Linear path for non-conditions
                  >
                    Add Next Step
                  </Button>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Render Children Recursively */}
        <Box sx={{ borderLeft: '2px dashed', borderColor: 'divider', ml: 2, pl: 2 }}>
          {node.children.map(child => (
            <Box key={child.nodeId}>
              {node.type === 'condition' && (
                <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                  Path: {child.branchLabel}
                </Typography>
              )}
              {renderNode(child.nodeId, level + 1)}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 4 }}>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Sequence Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 4 }}
        />

        <Box sx={{ bgcolor: 'background.default', p: 3, borderRadius: 2, overflowX: 'auto' }}>
          <Typography variant="h6" gutterBottom>Sequence Flow</Typography>
          {renderNode(rootNodeId)}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Sequence'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}

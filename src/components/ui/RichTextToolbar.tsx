import React from 'react';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import { useSignatures } from '@/hooks/useSignatures';

interface RichTextToolbarProps {
  onInsert: (text: string) => void;
}

export function RichTextToolbar({ onInsert }: RichTextToolbarProps) {
  const { signatures } = useSignatures();

  const handleSignature = () => {
    const defaultSig = signatures.find(s => s.isDefault) || signatures[0];
    if (defaultSig) {
      onInsert(`<br/><br/>${defaultSig.htmlContent}`);
    } else {
      onInsert(`<br/><br/><p>Best regards,</p>`);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      p: 0.5, 
      borderBottom: '1px solid', 
      borderColor: 'divider', 
      bgcolor: 'grey.50',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    }}>
      <Tooltip title="Bold">
        <IconButton size="small" onClick={() => onInsert('<b></b>')}><FormatBoldIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title="Italic">
        <IconButton size="small" onClick={() => onInsert('<i></i>')}><FormatItalicIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />
      <Tooltip title="Insert Link">
        <IconButton size="small" onClick={() => onInsert('<a href="https://">Link</a>')}><InsertLinkIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title="Insert Attachment (Link)">
        <IconButton size="small" onClick={() => onInsert('<br/><a href="[PASTE_ATTACHMENT_LINK_HERE]">📎 View Attachment</a>')}><AttachFileIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />
      <Tooltip title="Insert Signature">
        <IconButton size="small" onClick={handleSignature}><DriveFileRenameOutlineIcon fontSize="small" /></IconButton>
      </Tooltip>
    </Box>
  );
}

import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Divider, Menu, MenuItem } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import { useSignatures } from '@/hooks/useSignatures';

interface RichTextToolbarProps {
  onInsert: (text: string) => void;
}

const EMOJIS = ['😀', '😂', '👍', '🚀', '🔥', '🎉', '💡', '🤝', '🙌', '📅'];
const FONTS = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Georgia', value: 'Georgia, serif' }
];

export function RichTextToolbar({ onInsert }: RichTextToolbarProps) {
  const { signatures } = useSignatures();

  const [sigAnchorEl, setSigAnchorEl] = useState<null | HTMLElement>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [fontAnchorEl, setFontAnchorEl] = useState<null | HTMLElement>(null);

  const handleSignatureSelect = (html: string) => {
    onInsert(`<br/><br/>${html}`);
    setSigAnchorEl(null);
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
      
      <Tooltip title="Font">
        <IconButton size="small" onClick={(e) => setFontAnchorEl(e.currentTarget)}><FontDownloadIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Menu anchorEl={fontAnchorEl} open={Boolean(fontAnchorEl)} onClose={() => setFontAnchorEl(null)}>
        {FONTS.map(font => (
          <MenuItem 
            key={font.name} 
            onClick={() => { onInsert(`<span style="font-family: ${font.value}"></span>`); setFontAnchorEl(null); }} 
            sx={{ fontFamily: font.value }}
          >
            {font.name}
          </MenuItem>
        ))}
      </Menu>

      <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />
      
      <Tooltip title="Insert Link">
        <IconButton size="small" onClick={() => onInsert('<a href="https://">Link</a>')}><InsertLinkIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title="Insert Attachment (Link)">
        <IconButton size="small" onClick={() => onInsert('<br/><a href="[PASTE_ATTACHMENT_LINK_HERE]">📎 View Attachment</a>')}><AttachFileIcon fontSize="small" /></IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />

      <Tooltip title="Emoji">
        <IconButton size="small" onClick={(e) => setEmojiAnchorEl(e.currentTarget)}><EmojiEmotionsIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Menu anchorEl={emojiAnchorEl} open={Boolean(emojiAnchorEl)} onClose={() => setEmojiAnchorEl(null)}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', p: 1, gap: 1 }}>
          {EMOJIS.map(emoji => (
            <IconButton key={emoji} size="small" onClick={() => { onInsert(emoji); setEmojiAnchorEl(null); }}>
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Menu>

      <Tooltip title="Insert Signature">
        <IconButton size="small" onClick={(e) => setSigAnchorEl(e.currentTarget)}><DriveFileRenameOutlineIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Menu anchorEl={sigAnchorEl} open={Boolean(sigAnchorEl)} onClose={() => setSigAnchorEl(null)}>
        {signatures.length === 0 ? (
          <MenuItem disabled>No Signatures Found</MenuItem>
        ) : (
          signatures.map(sig => (
            <MenuItem key={sig.id} onClick={() => handleSignatureSelect(sig.htmlContent)}>
              {sig.name} {sig.isDefault ? '(Default)' : ''}
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
}

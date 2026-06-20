import { NextResponse } from 'next/server';
import { updateDocument } from '@/lib/firestore';
import { serverTimestamp } from 'firebase/firestore';

// A 1x1 transparent PNG pixel encoded in Base64
const PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const emailId = searchParams.get('emailId');

  if (emailId) {
    try {
      // Update the email document to mark as opened
      // We don't await this so the pixel returns instantly to the client
      updateDocument('emails', emailId, {
        opened: true,
        status: 'opened',
        openedAt: new Date() // Since we are in Node, let's use Date object instead of serverTimestamp() for simplicity, or we can use admin SDK if needed. Wait, updateDocument uses standard Firebase client SDK in this project so new Date() is fine.
      }).catch(err => {
        console.error(`Failed to update open tracking for email ${emailId}:`, err);
      });
    } catch (error) {
      console.error('Error in tracking pixel:', error);
    }
  }

  // Return the 1x1 transparent PNG image
  const buffer = Buffer.from(PIXEL_BASE64, 'base64');
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

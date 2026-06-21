import { Timestamp } from 'firebase/firestore';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle?: string;
  industry: string;
  targetProduct: string;
  remarks: string;
  status: 'new' | 'contacted' | 'replied' | 'qualified' | 'lost' | 'converted';
  contactStatus?: 'First Contact' | 'Follow Up 1' | 'Follow Up 2' | 'Replied' | 'Meeting Booked' | 'Not Interested' | string;
  campaignId?: string;
  currentSequenceNodeId?: string;
  sequenceLastActionAt?: Timestamp | Date;
  hasUnread?: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  targetProduct: string;
  industry?: string;
  templateId?: string;
  sequenceId?: string;
  timezone?: string;
  scheduleWindow?: {
    startHour: number; // e.g. 9 for 9 AM
    endHour: number;   // e.g. 17 for 5 PM
    days: number[];    // e.g. [1,2,3,4,5] for Mon-Fri
  };
  status: 'draft' | 'active' | 'paused' | 'completed';
  stats: {
    totalLeads: number;
    sent: number;
    replied: number;
    positive: number;
    notInterested: number;
    bounced: number;
    ghosted: number;
  };
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  targetProduct?: string;
  category: 'cold_outreach' | 'follow_up' | 'breakup' | 'custom';
  placeholders: string[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Sequence {
  id: string;
  name: string;
  rootNodeId: string;
  nodes: SequenceNode[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface SequenceNode {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'end';
  templateId?: string;
  templateIdB?: string;
  abTestEnabled?: boolean;
  delayDays?: number;
  conditionType?: 'reply_received' | 'no_reply' | 'positive_intent' | 'negative_intent';
  children: {
    branchLabel: string;
    nodeId: string;
  }[];
  position: { x: number; y: number };
}

export interface Email {
  id: string;
  leadId: string;
  campaignId?: string;
  direction: 'outbound' | 'inbound';
  variant?: 'A' | 'B';
  subject: string;
  body: string;
  intent?: 'POSITIVE_INTEREST' | 'MORE_INFO_REQUESTED' | 'NOT_INTERESTED' | 'OUT_OF_OFFICE' | 'BOUNCE' | 'UNKNOWN';
  intentSummary?: string;
  actionRequired?: boolean;
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'opened' | 'failed';
  scheduledAt?: Timestamp | Date;
  sentAt?: Timestamp | Date;
  openedAt?: Timestamp | Date;
  opened?: boolean;
  isRead?: boolean; // For tracking if the user has read inbound emails
  resendMessageId?: string;
  sequenceStep?: number;
  createdAt: Timestamp | Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  valueProposition: string;
  targetAudience: string;
  keyFeatures: string[];
  competitorDifferentiators: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt: Timestamp | Date;
}

export interface AppSettings {
  id: string; // usually a singleton like "global" or userId
  profile: {
    name: string;
    email: string;
    company: string;
    senderEmail?: string;
    replyToEmail?: string;
  };
  preferences: {
    emailAlerts: boolean;
    inAppNotifications: boolean;
  };
  apiKeys: {
    resendApiKey: string;
    geminiApiKey: string;
  };
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Signature {
  id: string;
  name: string;
  htmlContent: string;
  isDefault: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

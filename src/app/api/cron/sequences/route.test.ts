import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteField } from 'firebase/firestore';
import type { Lead, Sequence } from '@/types';

// --- Firestore mock -------------------------------------------------------
const db: Record<string, unknown[]> = {};
const updates: { collection: string; id: string; data: Record<string, unknown> }[] = [];
const creates: { collection: string; data: Record<string, unknown> }[] = [];

vi.mock('@/lib/firestore', () => ({
  fetchAll: vi.fn(async (name: string) => structuredClone(db[name] ?? [])),
  createDocument: vi.fn(async (collection: string, data: Record<string, unknown>) => {
    creates.push({ collection, data });
    return { id: `email-${creates.length}`, ...data };
  }),
  updateDocument: vi.fn(async (collection: string, id: string, data: Record<string, unknown>) => {
    // Mirror the real SDK: undefined values are rejected.
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) throw new Error(`Unsupported field value: undefined (found in field ${k})`);
    }
    updates.push({ collection, id, data });
  }),
}));

// --- Generation and sending (called directly, not over HTTP) -------------------
let sendOk = true;
const generateEmail = vi.fn(async () => ({ subject: 'Hello', body: '<p>Hi</p>' }));
const sendEmail = vi.fn<(email: { to: string; subject: string; html: string }) => Promise<{ messageId?: string }>>(async () => {
  if (!sendOk) throw new Error('rejected');
  return { messageId: 'msg-1' };
});
vi.mock('@/lib/email', () => ({ generateEmail, sendEmail }));

// --- Fixtures ---------------------------------------------------------------
const sequence: Sequence = {
  id: 'seq-1',
  name: 'Default',
  rootNodeId: 'email-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  nodes: [
    { id: 'email-1', type: 'email', templateId: 'tpl-1', children: [{ branchLabel: 'Next Step', nodeId: 'delay-1' }], position: { x: 0, y: 0 } },
    { id: 'delay-1', type: 'delay', delayDays: 2, children: [{ branchLabel: 'Next Step', nodeId: 'cond-1' }], position: { x: 0, y: 0 } },
    {
      id: 'cond-1', type: 'condition', conditionType: 'reply_received', position: { x: 0, y: 0 },
      children: [{ branchLabel: 'Yes', nodeId: 'end-1' }, { branchLabel: 'No', nodeId: 'email-2' }],
    },
    { id: 'email-2', type: 'email', templateId: 'tpl-1', children: [], position: { x: 0, y: 0 } },
    { id: 'end-1', type: 'end', children: [], position: { x: 0, y: 0 } },
  ],
};

const lead = (id: string, extra: Partial<Lead> = {}): Lead => ({
  id,
  firstName: 'Dana', lastName: 'Okafor', email: `${id}@example.com`, phone: '', company: 'Northwind',
  industry: 'Logistics', targetProduct: 'RouteIQ', remarks: '', status: 'new',
  campaignId: 'camp-1', createdAt: new Date(), updatedAt: new Date(),
  ...extra,
});

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

function seed(leads: Lead[]) {
  db.campaigns = [{ id: 'camp-1', name: 'C', status: 'active', sequenceId: 'seq-1', targetProduct: 'RouteIQ' }];
  db.sequences = [sequence];
  db.products = [{ id: 'prod-1', name: 'RouteIQ' }];
  db.templates = [{ id: 'tpl-1', subject: 's', body: 'b' }];
  db.signatures = [];
  db.leads = leads;
}

const leadUpdates = (id: string) => updates.filter((u) => u.collection === 'leads' && u.id === id).map((u) => u.data);
const isDeleteField = (v: unknown) => deleteField().isEqual(v as ReturnType<typeof deleteField>);

async function run() {
  const { GET } = await import('./route');
  const res = await GET(new Request('http://localhost:3000/api/cron/sequences'));
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  updates.length = 0;
  creates.length = 0;
  sendOk = true;
  generateEmail.mockClear();
  sendEmail.mockClear();
});

describe('GET /api/cron/sequences', () => {
  it('finds the product by name, sends the email and advances the lead', async () => {
    seed([lead('a', { currentSequenceNodeId: 'email-1' })]);
    const { status, body } = await run();

    expect(status).toBe(200);
    expect(body.actionsTaken).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@example.com', subject: 'Hello' }));
    expect(sendEmail.mock.calls[0]?.[0].html).toContain('http://localhost:3000/api/track?emailId=');
    const last = leadUpdates('a').at(-1)!;
    expect(last.currentSequenceNodeId).toBe('delay-1');
    expect(last.status).toBe('contacted');
    expect(updates.find((u) => u.collection === 'emails')?.data.resendMessageId).toBe('msg-1');
  });

  it('marks the email failed and keeps the lead in place when sending fails', async () => {
    sendOk = false;
    seed([lead('a', { currentSequenceNodeId: 'email-1' })]);
    const { body } = await run();

    expect(body.failures).toBe(1);
    expect(updates.find((u) => u.collection === 'emails')?.data.status).toBe('failed');
    expect(leadUpdates('a')).toEqual([]);
  });

  it('follows the "No" branch of a condition when there is no reply', async () => {
    seed([lead('a', { currentSequenceNodeId: 'cond-1', status: 'contacted' })]);
    await run();
    expect(leadUpdates('a').at(-1)!.currentSequenceNodeId).toBe('email-2');
  });

  it('waits on a delay until it has elapsed', async () => {
    seed([
      lead('early', { currentSequenceNodeId: 'delay-1', sequenceLastActionAt: daysAgo(1) }),
      lead('due', { currentSequenceNodeId: 'delay-1', sequenceLastActionAt: daysAgo(3) }),
    ]);
    await run();
    expect(leadUpdates('early')).toEqual([]);
    expect(leadUpdates('due').at(-1)!.currentSequenceNodeId).toBe('cond-1');
  });

  it('completes the sequence at an end node without writing undefined, and keeps processing other leads', async () => {
    seed([
      lead('done', { currentSequenceNodeId: 'end-1', status: 'contacted' }),
      lead('next', { currentSequenceNodeId: 'email-1' }),
    ]);
    const { status, body } = await run();

    expect(status).toBe(200);
    expect(body.failures).toBe(0);
    const done = leadUpdates('done').at(-1)!;
    expect(isDeleteField(done.currentSequenceNodeId)).toBe(true);
    expect(done.sequenceCompletedAt).toBeInstanceOf(Date);
    expect(leadUpdates('next').at(-1)!.currentSequenceNodeId).toBe('delay-1');
  });

  it('completes the sequence when the last email node has no next step', async () => {
    seed([lead('a', { currentSequenceNodeId: 'email-2', status: 'contacted' })]);
    await run();
    const last = leadUpdates('a').at(-1)!;
    expect(isDeleteField(last.currentSequenceNodeId)).toBe(true);
    expect(last.sequenceCompletedAt).toBeInstanceOf(Date);
  });

  it('completes leads that point at a node that no longer exists', async () => {
    seed([lead('a', { currentSequenceNodeId: 'deleted-node' })]);
    await run();
    expect(leadUpdates('a').at(-1)!.sequenceCompletedAt).toBeInstanceOf(Date);
  });

  it('skips completed leads instead of restarting them', async () => {
    seed([lead('a', { sequenceCompletedAt: daysAgo(1), status: 'contacted' })]);
    await run();
    expect(updates).toEqual([]);
    expect(generateEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it.each(['Meeting Booked', 'Not Interested'])('skips leads closed out as "%s"', async (contactStatus) => {
    seed([lead('a', { currentSequenceNodeId: 'email-1', status: 'contacted', contactStatus })]);
    await run();
    expect(generateEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('isolates a failing lead from the rest of the run', async () => {
    seed([lead('a', { currentSequenceNodeId: 'email-1' }), lead('b', { currentSequenceNodeId: 'email-1' })]);
    generateEmail.mockImplementationOnce(async () => {
      throw new Error('AI provider down');
    });
    const { status, body } = await run();

    expect(status).toBe(200);
    expect(body.failures).toBe(1);
    expect(leadUpdates('b').at(-1)!.currentSequenceNodeId).toBe('delay-1');
  });

  it('never writes undefined to Firestore across a full walk of the sequence', async () => {
    seed(sequence.nodes.map((n) => lead(n.id, { currentSequenceNodeId: n.id, status: 'contacted', sequenceLastActionAt: daysAgo(5) })));
    const { status, body } = await run();
    expect(status).toBe(200);
    expect(body.failures).toBe(0);
  });
});

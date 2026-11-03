import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  categories: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn(), revalidate: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('./queries', () => ({ getGroceryCategories: mocks.categories }));
vi.mock('@/db', async () => {
  const schema = await import('@/db/schema');
  return { schema, getDb: () => ({ update: mocks.update }) };
});
import { saveGrocerySuggestions } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.categories.mockResolvedValue([{ id: 'obst' }]);
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ id: 'obst' }]);
});
function data(suggestions: string) {
  const form = new FormData();
  form.set('categoryId', 'obst');
  form.set('original', '["Bananen"]');
  form.set('suggestions', suggestions);
  return form;
}

describe('save grocery suggestions', () => {
  it('trims and deduplicates names while preserving the first spelling and order', async () => {
    expect(await saveGrocerySuggestions(data(' Birnen \n\nBIRNEN\nMango '))).toEqual({ success: true });
    expect(mocks.set).toHaveBeenCalledWith({ quickAddItems: ['Birnen', 'Mango'], updatedAt: expect.any(Date) });
    expect(mocks.revalidate).toHaveBeenCalledWith('/einkauf');
  });
  it('persists an intentionally empty list', async () => {
    await saveGrocerySuggestions(data(' \n'));
    expect(mocks.set).toHaveBeenCalledWith({ quickAddItems: [], updatedAt: expect.any(Date) });
  });
  it.each(['x'.repeat(81), Array.from({length: 31}, (_, i) => `Artikel ${i}`).join('\n')])('rejects oversized input', async (value) => {
    expect(await saveGrocerySuggestions(data(value))).toHaveProperty('error');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('rejects an unknown category', async () => {
    mocks.categories.mockResolvedValue([]);
    expect(await saveGrocerySuggestions(data('Birnen'))).toHaveProperty('error');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('reports concurrent changes instead of claiming the update succeeded', async () => {
    mocks.returning.mockResolvedValue([]);
    expect(await saveGrocerySuggestions(data('Birnen'))).toHaveProperty('error');
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

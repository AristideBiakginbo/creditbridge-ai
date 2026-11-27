import type { DemoTransaction } from '../repository'

export const DEMO_CURRENCY = 'MAD' as const
export const DEMO_BUSINESS_NAME = 'Kora Goods Studio'

export const seedTransactions: DemoTransaction[] = [
  { id: 'seed-001', date: '2026-11-26', type: 'income', description: 'Wholesale fabric order', category: 'Sales', amount: 8420, currency: DEMO_CURRENCY },
  { id: 'seed-002', date: '2026-11-25', type: 'expense', description: 'Market stall fee', category: 'Rent & fees', amount: 650, currency: DEMO_CURRENCY },
  { id: 'seed-003', date: '2026-11-24', type: 'income', description: 'Custom tailoring orders', category: 'Services', amount: 2350, currency: DEMO_CURRENCY },
  { id: 'seed-004', date: '2026-11-22', type: 'expense', description: 'Cotton and thread restock', category: 'Inventory', amount: 3175, currency: DEMO_CURRENCY },
  { id: 'seed-005', date: '2026-11-20', type: 'expense', description: 'Local delivery fares', category: 'Transport', amount: 280, currency: DEMO_CURRENCY },
  { id: 'seed-006', date: '2026-11-18', type: 'income', description: 'Weekend market sales', category: 'Sales', amount: 4960, currency: DEMO_CURRENCY },
  { id: 'seed-007', date: '2026-10-30', type: 'income', description: 'Uniform stitching deposit', category: 'Services', amount: 5200, currency: DEMO_CURRENCY },
  { id: 'seed-008', date: '2026-10-28', type: 'expense', description: 'Shop electricity', category: 'Utilities', amount: 430, currency: DEMO_CURRENCY },
  { id: 'seed-009', date: '2026-10-24', type: 'expense', description: 'Fabric wholesale purchase', category: 'Inventory', amount: 4180, currency: DEMO_CURRENCY },
  { id: 'seed-010', date: '2026-10-19', type: 'income', description: 'Retail clothing sales', category: 'Sales', amount: 6830, currency: DEMO_CURRENCY },
  { id: 'seed-011', date: '2026-09-29', type: 'expense', description: 'Market stall fee', category: 'Rent & fees', amount: 650, currency: DEMO_CURRENCY },
  { id: 'seed-012', date: '2026-09-25', type: 'income', description: 'Alteration services', category: 'Services', amount: 1940, currency: DEMO_CURRENCY },
  { id: 'seed-013', date: '2026-09-20', type: 'expense', description: 'Buttons and zippers', category: 'Inventory', amount: 1280, currency: DEMO_CURRENCY },
  { id: 'seed-014', date: '2026-09-12', type: 'income', description: 'Community market sales', category: 'Sales', amount: 5720, currency: DEMO_CURRENCY },
  { id: 'seed-015', date: '2026-08-29', type: 'expense', description: 'Courier and delivery', category: 'Transport', amount: 390, currency: DEMO_CURRENCY },
  { id: 'seed-016', date: '2026-08-24', type: 'income', description: 'School uniform order', category: 'Services', amount: 9350, currency: DEMO_CURRENCY },
  { id: 'seed-017', date: '2026-08-19', type: 'expense', description: 'Fabric and lining', category: 'Inventory', amount: 3640, currency: DEMO_CURRENCY },
  { id: 'seed-018', date: '2026-08-10', type: 'income', description: 'Ready-to-wear sales', category: 'Sales', amount: 4380, currency: DEMO_CURRENCY },
  { id: 'seed-019', date: '2026-07-26', type: 'expense', description: 'Workspace rent', category: 'Rent & fees', amount: 2100, currency: DEMO_CURRENCY },
  { id: 'seed-020', date: '2026-07-22', type: 'income', description: 'Tailoring and repairs', category: 'Services', amount: 2870, currency: DEMO_CURRENCY },
  { id: 'seed-021', date: '2026-07-16', type: 'expense', description: 'Power and lighting', category: 'Utilities', amount: 510, currency: DEMO_CURRENCY },
  { id: 'seed-022', date: '2026-07-09', type: 'income', description: 'Market day sales', category: 'Sales', amount: 5210, currency: DEMO_CURRENCY },
  { id: 'seed-023', date: '2026-06-27', type: 'expense', description: 'Initial fabric restock', category: 'Inventory', amount: 4520, currency: DEMO_CURRENCY },
  { id: 'seed-024', date: '2026-06-20', type: 'income', description: 'Custom order balance', category: 'Services', amount: 6480, currency: DEMO_CURRENCY },
  { id: 'seed-025', date: '2026-06-12', type: 'expense', description: 'Market transport', category: 'Transport', amount: 340, currency: DEMO_CURRENCY },
  { id: 'seed-026', date: '2026-06-06', type: 'income', description: 'Opening month sales', category: 'Sales', amount: 7480, currency: DEMO_CURRENCY },
]

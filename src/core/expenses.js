import { generateId } from '../shared/utils/ids';

export function buildExpense(data) {
  return {
    ...data,
    id: generateId(),
    date: data.date || new Date().toISOString(),
  };
}

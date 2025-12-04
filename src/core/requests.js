import { generateId } from '../utils/ids';

export function buildRequest(data) {
  return {
    ...data,
    id: generateId(),
    status: data.status || 'REVIEW',
    date: data.date || new Date().toISOString(),
  };
}

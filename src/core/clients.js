import { generateId } from '../utils/ids';

export function buildClient(data) {
  return {
    ...data,
    id: generateId(),
    score: data.score ?? 70,
  };
}

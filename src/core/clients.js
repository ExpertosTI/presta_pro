import { generateId } from '../shared/utils/ids';

export function buildClient(data) {
  return {
    ...data,
    id: generateId(),
    score: data.score ?? 70,
  };
}

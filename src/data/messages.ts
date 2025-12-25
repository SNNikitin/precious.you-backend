export interface Message {
  id: string;
  text: string;
  category: string;
  gender: 'female' | 'male' | 'neutral';
}

export const MESSAGES: Message[] = [
  // Affirmation - женский род
  { id: 'aff-1', text: '{{name}}, ты хорошая', category: 'affirmation', gender: 'female' },
  { id: 'aff-2', text: 'Ты достаточно. Просто такая, какая есть', category: 'affirmation', gender: 'female' },
  { id: 'aff-3', text: '{{name}}, ты заслуживаешь любви', category: 'affirmation', gender: 'female' },
  { id: 'aff-4', text: 'Ты ценная. Не забывай об этом', category: 'affirmation', gender: 'female' },

  // Motivation - женский род
  { id: 'mot-1', text: '{{name}}, ты справишься!', category: 'motivation', gender: 'female' },
  { id: 'mot-2', text: 'У тебя всё получится', category: 'motivation', gender: 'female' },
  { id: 'mot-3', text: 'Ты сильнее, чем думаешь', category: 'motivation', gender: 'female' },
  { id: 'mot-4', text: 'Каждый маленький шаг — это прогресс', category: 'motivation', gender: 'female' },

  // Comfort - женский род
  { id: 'com-1', text: 'Всё будет хорошо', category: 'comfort', gender: 'female' },
  { id: 'com-2', text: '{{name}}, ты в безопасности', category: 'comfort', gender: 'female' },
  { id: 'com-3', text: 'Можно просто быть. Не нужно ничего доказывать', category: 'comfort', gender: 'female' },
  { id: 'com-4', text: 'Сегодня можно отдохнуть', category: 'comfort', gender: 'female' },

  // Appreciation - женский род
  { id: 'app-1', text: '{{name}}, ты умничка!', category: 'appreciation', gender: 'female' },
  { id: 'app-2', text: 'Ты молодец, что стараешься', category: 'appreciation', gender: 'female' },
  { id: 'app-3', text: 'Горжусь тобой', category: 'appreciation', gender: 'female' },

  // Self-worth - женский род
  { id: 'sw-1', text: 'Ты важная', category: 'self_worth', gender: 'female' },
  { id: 'sw-2', text: '{{name}}, мир лучше, потому что ты в нём есть', category: 'self_worth', gender: 'female' },
  { id: 'sw-3', text: 'Ты уникальная и неповторимая', category: 'self_worth', gender: 'female' },

  // Neutral variants
  { id: 'aff-n-1', text: '{{name}}, ты замечательный человек', category: 'affirmation', gender: 'neutral' },
  { id: 'mot-n-1', text: 'Верю в тебя!', category: 'motivation', gender: 'neutral' },
  { id: 'com-n-1', text: 'Ты не одна/один', category: 'comfort', gender: 'neutral' },
];

export function getRandomMessage(gender: 'female' | 'male' | 'neutral' = 'female'): Message {
  const filtered = MESSAGES.filter(m => m.gender === gender || m.gender === 'neutral');
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index] || MESSAGES[0]!;
}

export function personalizeMessage(text: string, name: string): string {
  return text.replace(/\{\{name\}\}/g, name);
}

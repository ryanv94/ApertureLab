import { it, expect } from 'vitest';
import { parseCities, searchCities, nearestCity } from '../../src/tools/golden-hour/cities';

const json = {
  tz: ['Europe/Dublin', 'America/Sao_Paulo', 'America/New_York'],
  admin: ['Leinster', 'São Paulo', 'New York'],
  c: [
    ['São Paulo', 'BR', 1, -23.548, -46.636, 1, 12_400_000],
    ['Dublin', 'IE', 0, 53.344, -6.267, 0, 1_024_027],
    ['Dubuque', 'US', 2, 42.5, -90.66, 2, 58_000],
  ] as [string, string, number, number, number, number, number][],
};
const list = parseCities(json);

it('parses rows', () => expect(list[1]).toMatchObject({ name: 'Dublin', country: 'IE', admin: 'Leinster', tz: 'Europe/Dublin' }));
it('prefix match ranked by population', () => expect(searchCities(list, 'dub')[0].name).toBe('Dublin'));
it('ignores diacritics', () => expect(searchCities(list, 'sao').map((c) => c.name)).toContain('São Paulo'));
it('nearest city provides a time zone', () => expect(nearestCity(list, 53.35, -6.26).tz).toBe('Europe/Dublin'));

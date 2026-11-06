import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  transliterateUaToEn,
  phoneticNormalize,
  levenshteinDistance,
  matchCrewMember,
  normalizeParsedFlightBlockTimes,
  checkFlightDuplicate,
  isFlightDuplicate,
  mapRankToPstn,
  mapPstnToRank
} from './scan_ocr_parser.js';
import { mergeFlightsData } from './data_merger.js';

describe('Aviation Time Constraints (normalizeParsedFlightBlockTimes)', () => {
  it('CRITICAL: Block Time must NEVER be less than Flight Time', () => {
    const flightData = {
      totalFlightTime: '02:00',
      totalBlockTime: '02:15',
      crew: [
        {
          name: 'Ivanov I.',
          flightDay: '02:00',
          flightNght: '00:00',
          blockDay: '01:30', // Erroneously less than flight time
          blockNght: '00:00'
        }
      ]
    };

    const normalized = normalizeParsedFlightBlockTimes(flightData);
    const crewMember = normalized.crew[0];

    // Must be clamped to at least flightDay
    assert.equal(crewMember.blockDay, '02:00');
  });

  it('auto-derives day block time from totalBlockTime when crew block times are 00:00', () => {
    const flightData = {
      totalFlightTime: '01:30',
      totalBlockTime: '01:45',
      crew: [
        {
          name: 'Petrov P.',
          flightDay: '01:30',
          flightNght: '00:00',
          blockDay: '00:00',
          blockNght: '00:00'
        }
      ]
    };

    const normalized = normalizeParsedFlightBlockTimes(flightData);
    assert.equal(normalized.crew[0].blockDay, '01:45');
    assert.equal(normalized.crew[0].blockNght, '00:00');
  });

  it('auto-derives night block time when only night flight occurred', () => {
    const flightData = {
      totalFlightTime: '01:10',
      totalBlockTime: '01:25',
      crew: [
        {
          name: 'Sidorov S.',
          flightDay: '00:00',
          flightNght: '01:10',
          blockDay: '00:00',
          blockNght: '00:00'
        }
      ]
    };

    const normalized = normalizeParsedFlightBlockTimes(flightData);
    assert.equal(normalized.crew[0].blockDay, '00:00');
    assert.equal(normalized.crew[0].blockNght, '01:25');
  });

  it('distributes block time proportionally when both Day and Night flights occurred', () => {
    const flightData = {
      totalFlightTime: '02:00',
      totalBlockTime: '02:30', // 150 mins total block (30 mins extra over 120 mins flight)
      crew: [
        {
          name: 'Koval K.',
          flightDay: '01:00', // 60 mins (50%)
          flightNght: '01:00', // 60 mins (50%)
          blockDay: '00:00',
          blockNght: '00:00'
        }
      ]
    };

    const normalized = normalizeParsedFlightBlockTimes(flightData);
    // 150 mins split equally -> 75 mins each (01:15)
    assert.equal(normalized.crew[0].blockDay, '01:15');
    assert.equal(normalized.crew[0].blockNght, '01:15');
  });

  it('falls back to totalFlightTime if totalBlockTime is missing or 00:00', () => {
    const flightData = {
      totalFlightTime: '01:40',
      totalBlockTime: '00:00',
      crew: [
        {
          name: 'Bond J.',
          flightDay: '01:40',
          flightNght: '00:00',
          blockDay: '00:00',
          blockNght: '00:00'
        }
      ]
    };

    const normalized = normalizeParsedFlightBlockTimes(flightData);
    assert.equal(normalized.totalBlockTime, '01:40');
    assert.equal(normalized.crew[0].blockDay, '01:40');
  });
});

describe('Flight Duplicate Detection (checkFlightDuplicate)', () => {
  const existingFlights = [
    {
      id: 'flt-1',
      date: '2026-10-15',
      helicopterReg: 'UR-HLB',
      dutyTime: '04:30',
      totalFlightTime: '02:15'
    }
  ];

  it('identifies exact duplicate flight by date, registration and flight time', () => {
    const candidate = {
      date: '2026-10-15',
      helicopterReg: 'UR-HLB',
      dutyTime: '04:30',
      totalFlightTime: '02:15'
    };

    const res = checkFlightDuplicate(candidate, existingFlights);
    assert.equal(res.isDuplicate, true);
    assert.equal(res.duplicateId, 'flt-1');
  });

  it('does NOT mark as duplicate when date is different', () => {
    const candidate = {
      date: '2026-10-16',
      helicopterReg: 'UR-HLB',
      dutyTime: '04:30',
      totalFlightTime: '02:15'
    };

    const res = checkFlightDuplicate(candidate, existingFlights);
    assert.equal(res.isDuplicate, false);
  });

  it('does NOT mark as duplicate when flight task numbers are different on the same date', () => {
    const candidate = {
      date: '2026-10-15',
      mainFlightTask: 'Task-102',
      helicopterReg: 'UR-HLE',
      dutyTime: '04:30',
      totalFlightTime: '02:15'
    };
    const existingWithTask = [
      {
        id: 'flt-1',
        date: '2026-10-15',
        mainFlightTask: 'Task-101',
        helicopterReg: 'UR-HLB',
        dutyTime: '04:30',
        totalFlightTime: '02:15'
      }
    ];

    const res = checkFlightDuplicate(candidate, existingWithTask);
    assert.equal(res.isDuplicate, false);
  });

  it('marks records with identical ID as duplicate in isFlightDuplicate', () => {
    const flightA = { id: 'flt-100', date: '2026-11-03', mainFlightTask: 'SPO 384/26' };
    const flightB = { id: 'flt-100', date: '2026-11-03', mainFlightTask: 'SPO 384/26' };
    assert.equal(isFlightDuplicate(flightA, flightB), true);
  });

  it('allows editing candidate with same ID in checkFlightDuplicate without false self-collision', () => {
    const candidateBeingEdited = { id: 'flt-1', date: '2026-10-15', helicopterReg: 'UR-HLB' };
    const res = checkFlightDuplicate(candidateBeingEdited, existingFlights);
    assert.equal(res.isDuplicate, false);
  });

  it('mergeFlightsData strictly prevents duplicate flights when incoming has same ID or date+task', () => {
    const cached = [
      { id: 'fl_1', date: '2026-11-03', mainFlightTask: 'SPO 384/26', crew: [{ name: 'A' }] },
      { id: 'fl_2', date: '2026-11-05', mainFlightTask: 'SPO 356/26/1', crew: [{ name: 'B' }] }
    ];
    const incomingFromRemote = [
      { id: 'fl_1', date: '2026-11-03', mainFlightTask: 'SPO 384/26', crew: [{ name: 'A' }] },
      { id: 'fl_2', date: '2026-11-05', mainFlightTask: 'SPO 356/26/1', crew: [{ name: 'B' }] }
    ];

    const result = mergeFlightsData(cached, incomingFromRemote);
    assert.equal(result.mergedFlights.length, 2);
    assert.equal(result.addedCount, 0);
    assert.equal(result.skippedCount, 2);
  });

  it('mergeFlightsData actively cleans pre-existing duplicates in cache', () => {
    const dirtyCacheWithDuplicates = [
      { id: 'fl_1', date: '2026-11-03', mainFlightTask: 'SPO 384/26' },
      { id: 'fl_1', date: '2026-11-03', mainFlightTask: 'SPO 384/26' },
      { id: 'fl_2', date: '2026-11-05', mainFlightTask: 'SPO 356/26/1' },
      { id: 'fl_2', date: '2026-11-05', mainFlightTask: 'SPO 356/26/1' }
    ];
    const incoming = [
      { id: 'fl_2', date: '2026-11-05', mainFlightTask: 'SPO 356/26/1' }
    ];

    const result = mergeFlightsData(dirtyCacheWithDuplicates, incoming);
    assert.equal(result.mergedFlights.length, 2);
  });
});

describe('Transliteration, Fuzzy Matching & Roles', () => {
  it('computes correct Levenshtein distance', () => {
    assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
    assert.equal(levenshteinDistance('pilot', 'pilot'), 0);
    assert.equal(levenshteinDistance('shevchenko', 'shevchenka'), 1);
  });

  it('transliterates Ukrainian Cyrillic to English Latin', () => {
    assert.equal(transliterateUaToEn('Шевченко'), 'shevchenko');
    assert.equal(transliterateUaToEn('Коваль'), 'koval');
  });

  it('matches scanned handwritten crew member to database record', () => {
    const flightCrew = [
      {
        id: 'c-1',
        Full_Name_UA: 'Шевченко Тарас',
        Full_Name_EN: 'Shevchenko Taras',
        Rank: 'Commander'
      }
    ];

    const match = matchCrewMember('T. Shevchenko', flightCrew, []);
    assert.ok(match.matchedMember);
    assert.equal(match.matchedMember.id, 'c-1');
  });

  it('maps rank to cockpit position (PSTN) accurately', () => {
    assert.equal(mapRankToPstn('КПС'), 'PIC');
    assert.equal(mapRankToPstn('2П'), 'SIC');
    assert.equal(mapRankToPstn('КПС інструктор', true), 'PIC inst');
    assert.equal(mapRankToPstn('ІБ'), 'FE');
  });

  it('maps PSTN back to rank', () => {
    assert.equal(mapPstnToRank('PIC'), 'КПС');
    assert.equal(mapPstnToRank('SIC'), '2П');
    assert.equal(mapPstnToRank('FE'), 'ІБ');
  });
});

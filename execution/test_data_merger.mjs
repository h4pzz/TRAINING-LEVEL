import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { shouldOverwriteDate, mergeCrewData } from './data_merger.js';

describe('Smart Merge Date Comparison (shouldOverwriteDate)', () => {
  it('does NOT overwrite with empty, dash, null, or undefined incoming strings', () => {
    assert.equal(shouldOverwriteDate('2026-05-10', ''), false);
    assert.equal(shouldOverwriteDate('2026-05-10', '-'), false);
    assert.equal(shouldOverwriteDate('2026-05-10', 'null'), false);
    assert.equal(shouldOverwriteDate('2026-05-10', 'undefined'), false);
    assert.equal(shouldOverwriteDate('2026-05-10', null), false);
    assert.equal(shouldOverwriteDate('2026-05-10', undefined), false);
  });

  it('does NOT overwrite with an older date', () => {
    assert.equal(shouldOverwriteDate('2026-06-01', '2025-12-31'), false);
    assert.equal(shouldOverwriteDate('2026-06-01', '2026-06-01'), false); // Identical date -> no overwrite
  });

  it('DOES overwrite when incoming date is strictly newer', () => {
    assert.equal(shouldOverwriteDate('2026-01-15', '2026-06-01'), true);
  });

  it('DOES overwrite when cached date is empty, dash, or missing', () => {
    assert.equal(shouldOverwriteDate('', '2026-06-01'), true);
    assert.equal(shouldOverwriteDate('-', '2026-06-01'), true);
    assert.equal(shouldOverwriteDate('null', '2026-06-01'), true);
    assert.equal(shouldOverwriteDate(null, '2026-06-01'), true);
    assert.equal(shouldOverwriteDate(undefined, '2026-06-01'), true);
  });

  it('does NOT overwrite if incoming date string is completely invalid', () => {
    assert.equal(shouldOverwriteDate('2026-05-10', 'not-a-date'), false);
  });
});

describe('Smart Merge Crew Data Invariants (mergeCrewData)', () => {
  it('CRITICAL INVARIANT: Never deletes existing crew members absent from import', () => {
    const cachedCrew = [
      { id: '1', Full_Name_EN: 'Ivanov Ivan', Full_Name_UA: 'Іванов Іван', crewType: 'Flight', OPC: '2026-01-01' },
      { id: '2', Full_Name_EN: 'Petrov Petro', Full_Name_UA: 'Петров Петро', crewType: 'Flight', OPC: '2026-02-01' }
    ];

    // Import only contains Ivanov Ivan; Petrov Petro is omitted
    const importedCrew = [
      { Full_Name_EN: 'Ivanov Ivan', Full_Name_UA: 'Іванов Іван', crewType: 'Flight', OPC: '2026-01-01' }
    ];

    const result = mergeCrewData(cachedCrew, importedCrew, 'admin@aerocheck.com');

    // Both members must still exist in merged list
    assert.equal(result.mergedList.length, 2);
    const petrov = result.mergedList.find(m => m.Full_Name_EN === 'Petrov Petro');
    assert.ok(petrov, 'Petrov Petro was preserved despite being omitted from import');
    assert.equal(petrov.OPC, '2026-02-01');
  });

  it('updates newer dates and records changelog entry', () => {
    const cachedCrew = [
      { id: '1', Full_Name_EN: 'Shevchenko Taras', Full_Name_UA: 'Шевченко Тарас', crewType: 'Flight', OPC: '2025-10-01', LPC: '2026-01-10' }
    ];

    const importedCrew = [
      { Full_Name_EN: 'Shevchenko Taras', Full_Name_UA: 'Шевченко Тарас', crewType: 'Flight', OPC: '2026-10-01', LPC: '2025-05-01' }
    ];

    const result = mergeCrewData(cachedCrew, importedCrew, 'admin@aerocheck.com');

    const updated = result.mergedList[0];
    assert.equal(updated.OPC, '2026-10-01', 'Newer OPC was updated');
    assert.equal(updated.LPC, '2026-01-10', 'Older LPC from import was ignored');

    // Changelog must have 1 entry with 1 detail
    assert.equal(result.changelogEntries.length, 1);
    assert.equal(result.changelogEntries[0].type, 'MERGE_IMPORT');
    assert.equal(result.changelogEntries[0].details.length, 1);
    assert.equal(result.changelogEntries[0].details[0].field, 'OPC');
    assert.equal(result.changelogEntries[0].details[0].oldValue, '2025-10-01');
    assert.equal(result.changelogEntries[0].details[0].newValue, '2026-10-01');
  });

  it('adds brand new crew members with CREW_ADD changelog', () => {
    const cachedCrew = [
      { id: '1', Full_Name_EN: 'Bond James', Full_Name_UA: 'Бонд Джеймс', crewType: 'Flight' }
    ];

    const importedCrew = [
      { Full_Name_EN: 'Hunt Ethan', Full_Name_UA: 'Хант Ітан', crewType: 'Flight', OPC: '2026-04-01' }
    ];

    const result = mergeCrewData(cachedCrew, importedCrew, 'admin@aerocheck.com');

    assert.equal(result.mergedList.length, 2);
    const newMember = result.mergedList.find(m => m.Full_Name_EN === 'Hunt Ethan');
    assert.ok(newMember);
    assert.equal(result.changelogEntries.length, 1);
    assert.equal(result.changelogEntries[0].type, 'CREW_ADD');
  });

  it('matches crew members by Ukrainian name if English name differs or is absent', () => {
    const cachedCrew = [
      { id: '1', Full_Name_EN: '', Full_Name_UA: 'Коваленко Олег', crewType: 'Flight', MED: '2025-01-01' }
    ];

    const importedCrew = [
      { Full_Name_EN: 'Kovalenko Oleg', Full_Name_UA: 'Коваленко Олег', crewType: 'Flight', MED: '2026-01-01' }
    ];

    const result = mergeCrewData(cachedCrew, importedCrew);
    assert.equal(result.mergedList.length, 1);
    assert.equal(result.mergedList[0].MED, '2026-01-01');
    assert.equal(result.mergedList[0].Full_Name_EN, 'Kovalenko Oleg', 'Backfilled missing English name');
  });
});

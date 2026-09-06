import { describe, expect, it } from 'vitest';
import { frameAtTime, comparePlot, validateInput, readNotebook, writeNotebook, snapshotExperiment } from '../../src/core/learning/experimentContract.js';
describe('guided experiment controls and comparisons', () => {
  it('uses the same timestamp for model-frame interpolation and the graph cursor', () => {
    const samples = [{timeS:0,pitchRad:0},{timeS:1,pitchRad:2}];
    expect(frameAtTime(samples,.25)).toEqual({timeS:.25,pitchRad:.5});
    expect(frameAtTime(samples,-1)).toEqual(samples[0]);
    expect(frameAtTime(samples,2)).toEqual(samples[1]);
  });
  it('rejects blank, nonfinite and out-of-range edits without fabricating a value', () => {
    for (const text of ['', ' ', 'Infinity', 'abc', '-1', '3']) expect(validateInput(text, { min: 0, max: 2 }).error).toBeTruthy();
    expect(validateInput('0', { min: 0, max: 2 })).toEqual({ value: 0 });
  });
  it('compares only compatible graphs without modifying the captured baseline', () => {
    const plot = { xLabel: 'x', yLabel: 'y', series: [{ label: 'A', points: [{ x: 0, y: 1 }] }] };
    const snapshot = snapshotExperiment({ input: 1 }, { plots: [plot] });
    const comparison = comparePlot(plot, snapshot.result.plots[0], true);
    expect(comparison.series).toHaveLength(2);
    comparison.series[1].label = 'changed';
    expect(snapshot.result.plots[0].series[0].label).toBe('A');
    expect(comparePlot(plot, { ...plot, yLabel: 'other unit' }, true)).toBe(plot);
  });
  it('recovers from missing/corrupt storage and reports quota failures', () => {
    expect(readNotebook({ getItem: () => '{' })).toEqual({});
    expect(writeNotebook({ setItem: () => { throw new Error('quota'); } }, {})).toBe(false);
    let saved;
    const storage = { setItem: (_, v) => { saved = v; }, getItem: () => saved };
    expect(writeNotebook(storage, { demo: { prediction: 'A', explored: true } })).toBe(true);
    expect(readNotebook(storage).demo.prediction).toBe('A');
  });
});

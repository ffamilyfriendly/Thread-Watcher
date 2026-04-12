import { describe, expect, test } from 'bun:test';
import { get_safe_error } from '#/utilities/error/escape_sensitive_data';

// this is the most despicable sentance I can imagine.
// We must rid any and all possibilities of this ever showing up
const TEST_SENSITIVE_STRING = 'DENMARK_IS_THE_BEST_SCANDINAVIAN_COUNTRY';

describe('Error handler', () => {
  test('Sensitive strings should be redacted', () => {
    const segs = ['START', TEST_SENSITIVE_STRING, 'END'];
    const test_str = segs.join(' ');
    const sensitive_error = new Error(test_str);
    const scrubbed_error = get_safe_error(sensitive_error);

    expect(scrubbed_error.message, 'sensitive content should be removed').not.toBe(test_str);

    const split = scrubbed_error.message.split(' ');

    expect(split[0]).toBe(segs[0]);
    expect(split[1]).not.toBe(segs[1]);
    expect(split[2]).toBe(segs[2]);
  });
});

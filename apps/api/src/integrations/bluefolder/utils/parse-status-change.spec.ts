import { parseStatusChange } from './parse-status-change';

describe('parseStatusChange', () => {
  it('should parse "Status changed from [X] to [Y]."', () => {
    const result = parseStatusChange(
      'Status changed from [New] to [Assigned].',
    );
    expect(result).toEqual({ fromStatus: 'New', toStatus: 'Assigned' });
  });

  it('should parse "Status changed to [Y]." (initial status)', () => {
    const result = parseStatusChange('Status changed to [New].');
    expect(result).toEqual({ fromStatus: null, toStatus: 'New' });
  });

  it('should return null for non-status-change entries', () => {
    expect(parseStatusChange('Comment added')).toBeNull();
    expect(parseStatusChange('Assignment created')).toBeNull();
    expect(parseStatusChange('')).toBeNull();
  });

  it('should handle multi-word statuses', () => {
    expect(
      parseStatusChange('Status changed from [New] to [In Progress].'),
    ).toEqual({ fromStatus: 'New', toStatus: 'In Progress' });

    expect(
      parseStatusChange(
        'Status changed from [In Progress] to [Vendor Assigned].',
      ),
    ).toEqual({ fromStatus: 'In Progress', toStatus: 'Vendor Assigned' });

    expect(
      parseStatusChange(
        'Status changed from [Work Complete] to [Customer Invoiced].',
      ),
    ).toEqual({ fromStatus: 'Work Complete', toStatus: 'Customer Invoiced' });
  });

  it('should trim whitespace inside brackets', () => {
    const result = parseStatusChange(
      'Status changed from [ New ] to [ Assigned ].',
    );
    expect(result).toEqual({ fromStatus: 'New', toStatus: 'Assigned' });
  });

  it('should match case-insensitively', () => {
    const result = parseStatusChange('status CHANGED from [New] to [Closed].');
    expect(result).toEqual({ fromStatus: 'New', toStatus: 'Closed' });
  });
});

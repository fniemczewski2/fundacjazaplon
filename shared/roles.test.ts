import { describe, expect, it } from 'vitest';
import { hasRole, isAssignableRole, isStaffDomainEmail, isStaffRole } from './roles';

describe('hasRole', () => {
  it('porównuje rangi: editor < admin < super_admin', () => {
    expect(hasRole('editor', 'editor')).toBe(true);
    expect(hasRole('editor', 'admin')).toBe(false);
    expect(hasRole('admin', 'editor')).toBe(true);
    expect(hasRole('admin', 'super_admin')).toBe(false);
    expect(hasRole('super_admin', 'admin')).toBe(true);
  });

  it('brak roli nie daje żadnych uprawnień', () => {
    expect(hasRole(null, 'editor')).toBe(false);
    expect(hasRole(undefined, 'editor')).toBe(false);
  });
});

describe('isStaffRole / isAssignableRole', () => {
  it('akceptuje wyłącznie znane role', () => {
    expect(isStaffRole('super_admin')).toBe(true);
    expect(isStaffRole('root')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  it('super_admin nie jest rolą nadawalną', () => {
    expect(isAssignableRole('admin')).toBe(true);
    expect(isAssignableRole('editor')).toBe(true);
    expect(isAssignableRole('super_admin')).toBe(false);
  });
});

describe('isStaffDomainEmail', () => {
  it('akceptuje domenę fundacji bez względu na wielkość liter', () => {
    expect(isStaffDomainEmail('jan@zaplon.org.pl')).toBe(true);
    expect(isStaffDomainEmail('JAN@ZAPLON.ORG.PL')).toBe(true);
  });

  it('odrzuca inne domeny i domeny z dopiskiem', () => {
    expect(isStaffDomainEmail('jan@gmail.com')).toBe(false);
    expect(isStaffDomainEmail('jan@zaplon.org.pl.evil.com')).toBe(false);
    expect(isStaffDomainEmail('jan@evilzaplon.org.pl')).toBe(false);
  });
});

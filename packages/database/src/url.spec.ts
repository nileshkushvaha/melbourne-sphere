import { parseMysqlUrl } from './url.js';

describe('parseMysqlUrl', () => {
  it('parses a standard URL', () => {
    expect(parseMysqlUrl('mysql://app:secret@127.0.0.1:3307/melbourne_sphere_dev')).toEqual({
      host: '127.0.0.1',
      port: 3307,
      user: 'app',
      password: 'secret',
      database: 'melbourne_sphere_dev',
    });
  });

  it('defaults the port to 3306', () => {
    expect(parseMysqlUrl('mysql://app:secret@db/x').port).toBe(3306);
  });

  it('percent-decodes user, password and database', () => {
    const s = parseMysqlUrl('mysql://us%40er:p%40ss%3Aw%2Frd%25@localhost:3306/my%20db');
    expect(s.user).toBe('us@er');
    expect(s.password).toBe('p@ss:w/rd%');
    expect(s.database).toBe('my db');
  });

  it.each([
    ['not a url', 'not a valid URL'],
    ['postgresql://a:b@h/db', 'mysql:// scheme'],
    ['mysql://a:b@h', 'database name'],
    ['mysql://a:b@h/', 'database name'],
    ['mysql://a:b@h/db/extra', 'database name'],
    ['mysql://a:b@h:0/db', 'port'],
  ])('rejects %s', (url, fragment) => {
    expect(() => parseMysqlUrl(url)).toThrow(fragment);
  });

  it('never includes the URL in error messages', () => {
    const secret = 'mysql://user:hunter2@host:3306/db/extra';
    let message = '';
    try {
      parseMysqlUrl(secret);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('host');
  });
});

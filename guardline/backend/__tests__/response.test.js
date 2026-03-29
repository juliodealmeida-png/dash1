const express = require('express');
const request = require('supertest');
const { ok, fail } = require('../src/utils/response');

describe('response helpers', () => {
  test('ok() retorna success e data', async () => {
    const app = express();
    app.get('/t', (req, res) => ok(res, { a: 1 }));
    const res = await request(app).get('/t').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ a: 1 });
  });

  test('fail() retorna success false e código', async () => {
    const app = express();
    app.get('/e', (req, res) => fail(res, 400, 'Bad', 'BAD'));
    const res = await request(app).get('/e').expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Bad');
    expect(res.body.code).toBe('BAD');
  });
});

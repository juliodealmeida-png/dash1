const { prisma } = require('../config/database');
const { ok } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = '1', perPage = '50', status } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(200, Math.max(1, parseInt(perPage, 10) || 50));

    let workflows = [];
    let executions = [];
    try {
      const where = {};
      if (status) where.status = status;

      executions = await prisma.workflowExecution
        ? await prisma.workflowExecution.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (p - 1) * pp,
            take: pp,
          })
        : [];

      workflows = await prisma.workflow
        ? await prisma.workflow.findMany({
            orderBy: { name: 'asc' },
            take: 50,
          })
        : [];
    } catch (dbErr) {
      console.warn('[wf_executions] DB unavailable:', dbErr.message);
    }

    return ok(res, { workflows, executions }, { page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

module.exports = { list };

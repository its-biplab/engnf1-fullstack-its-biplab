const { Ticket } = require('../db');
const { classifyTicket } = require('../utils/classifier');

/**
 * Import tickets feed with deterministic auto-triage,
 * idempotent re-import, and human-override protection.
 * POST /api/tickets/import
 */
const importTickets = async (req, res, next) => {
  try {
    const { tickets } = req.body || {};

    // 1. Validate tickets array presence
    if (!tickets || !Array.isArray(tickets)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The "tickets" field must be an array of ticket objects',
        },
      });
    }

    // 2. Validate and normalize each ticket in the array
    const normalizedTickets = [];

    for (let i = 0; i < tickets.length; i++) {
      const item = tickets[i];
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Ticket at index ${i} must be an object`,
          },
        });
      }

      // Normalize externalId / externalld (handling possible test payload typos)
      const rawExternalId = item.externalId !== undefined ? item.externalId : item.externalld;
      if (typeof rawExternalId !== 'string' || !rawExternalId.trim()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Ticket at index ${i} must have a non-empty externalId`,
          },
        });
      }
      const externalId = rawExternalId.trim();

      // Validate subject: trimmed string, 3 to 150 chars
      if (typeof item.subject !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Ticket "${externalId}" must have a valid string subject`,
          },
        });
      }
      const subject = item.subject.trim();
      if (subject.length < 3 || subject.length > 150) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Ticket "${externalId}" subject must be between 3 and 150 characters`,
          },
        });
      }

      // Validate body: trimmed string, 5 to 2000 chars
      if (typeof item.body !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Ticket "${externalId}" must have a valid string body`,
          },
        });
      }
      const body = item.body.trim();
      if (body.length < 5 || body.length > 2000) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Ticket "${externalId}" body must be between 5 and 2000 characters`,
          },
        });
      }

      normalizedTickets.push({ externalId, subject, body });
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedOverrideCount = 0;

    // 3. Process each ticket idempotently with override protection
    for (const item of normalizedTickets) {
      const { externalId, subject, body } = item;
      const existingTicket = await Ticket.findOne({ externalId });

      if (!existingTicket) {
        // T-B1: New ticket, run deterministic classifier
        const { category, priority } = classifyTicket(subject, body);

        await Ticket.create({
          externalId,
          subject,
          body,
          autoCategory: category,
          category,
          priority,
          status: 'OPEN',
          isHumanOverride: false,
          isReviewed: false,
        });

        importedCount++;
      } else {
        // T-B2: Existing ticket re-import
        existingTicket.subject = subject;
        existingTicket.body = body;

        if (!existingTicket.isHumanOverride) {
          // Re-evaluate classifier when no human override is active
          const { category: recomputedCategory, priority: recomputedPriority } = classifyTicket(
            subject,
            body
          );
          existingTicket.category = recomputedCategory;
          existingTicket.priority = recomputedPriority;

          await existingTicket.save();
          updatedCount++;
        } else {
          // Human override is active: preserve category and human override state
          await existingTicket.save();
          skippedOverrideCount++;
        }
      }
    }

    const total = normalizedTickets.length;

    return res.status(200).json({
      importedCount,
      updatedCount,
      skippedOverrideCount,
      total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List tickets with optional filtering.
 * GET /api/tickets
 */
const getTickets = async (req, res, next) => {
  try {
    const { status, category, priority } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const tickets = await Ticket.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      tickets: tickets.map((t) => t.toJSON()),
      total: tickets.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importTickets,
  getTickets,
};

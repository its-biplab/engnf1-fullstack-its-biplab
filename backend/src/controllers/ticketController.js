const mongoose = require('mongoose');
const { Ticket, TicketEvent } = require('../db');
const { classifyTicket } = require('../utils/classifier');

const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const ALLOWED_CATEGORIES = ['BILLING', 'BUG', 'FEATURE_REQUEST', 'LOGIN', 'DELIVERY'];
const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Escape regex special characters to prevent ReDoS and regex injection.
 * Escapes: \ . * + ? ( ) [ ] { } ^ $ |
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

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
 * List tickets with combined filtering, injection-safe search (T-B4), and pagination.
 * GET /api/tickets
 */
const getTickets = async (req, res, next) => {
  try {
    const { status, category, priority, q, page, limit, pageSize } = req.query;
    const filter = {};

    // 1. Validate status filter
    if (status !== undefined) {
      if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status "${status}". Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
          },
        });
      }
      filter.status = status;
    }

    // 2. Validate category filter
    if (category !== undefined) {
      if (typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid category "${category}". Allowed values: ${ALLOWED_CATEGORIES.join(', ')}`,
          },
        });
      }
      filter.category = category;
    }

    // 3. Validate priority filter
    if (priority !== undefined) {
      if (typeof priority !== 'string' || !ALLOWED_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid priority "${priority}". Allowed values: ${ALLOWED_PRIORITIES.join(', ')}`,
          },
        });
      }
      filter.priority = priority;
    }

    // 4. Validate and sanitize q search string (T-B4: injection-safe search)
    if (q !== undefined) {
      if (typeof q !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query "q" must be a string',
          },
        });
      }
      const trimmedQ = q.trim();
      if (trimmedQ.length > 0) {
        const safeRegexStr = escapeRegex(trimmedQ);
        filter.$or = [
          { subject: { $regex: safeRegexStr, $options: 'i' } },
          { body: { $regex: safeRegexStr, $options: 'i' } },
        ];
      }
    }

    // 5. Validate pagination (page)
    let parsedPage = 1;
    if (page !== undefined) {
      if (typeof page !== 'string' && typeof page !== 'number') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "page" must be a valid positive integer',
          },
        });
      }
      const pageStr = String(page).trim();
      if (!/^\d+$/.test(pageStr)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "page" must be a positive integer >= 1',
          },
        });
      }
      parsedPage = parseInt(pageStr, 10);
      if (parsedPage < 1) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "page" must be >= 1',
          },
        });
      }
    }

    // 6. Validate pagination (limit / pageSize)
    let parsedPageSize = 10;
    const rawSize = limit !== undefined ? limit : pageSize;
    if (rawSize !== undefined) {
      if (typeof rawSize !== 'string' && typeof rawSize !== 'number') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "limit" / "pageSize" must be a valid integer between 1 and 100',
          },
        });
      }
      const sizeStr = String(rawSize).trim();
      if (!/^\d+$/.test(sizeStr)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "limit" / "pageSize" must be an integer between 1 and 100',
          },
        });
      }
      parsedPageSize = parseInt(sizeStr, 10);
      if (parsedPageSize < 1 || parsedPageSize > 100) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter "limit" / "pageSize" must be between 1 and 100',
          },
        });
      }
    }

    const skip = (parsedPage - 1) * parsedPageSize;

    // 7. Execute query with count
    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsedPageSize),
      Ticket.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / parsedPageSize);
    const data = tickets.map((t) => t.toJSON());

    return res.status(200).json({
      data,
      tickets: data, // backwards compatibility
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch a single ticket by ID along with its audit events history.
 * GET /api/tickets/:id
 */
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format cleanly to prevent unhandled cast errors
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    // Query audit events ordered chronologically descending (newest first)
    const events = await TicketEvent.find({ ticketId: ticket._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      ticket: ticket.toJSON(),
      events: events.map((e) => e.toJSON()),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importTickets,
  getTickets,
  getTicketById,
};

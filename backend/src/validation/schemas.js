/**
 * @module validation/schemas
 * @description Joi validation schemas for all API request bodies.
 *
 * Each schema defines the shape, types, and constraints for incoming data.
 * Validation is performed in route handlers via `schema.validate(req.body)`;
 * failures are forwarded to the centralized error handler as Joi errors.
 */

const Joi = require('joi');

/**
 * Validation schema for creating a new client.
 *
 * @type {Joi.ObjectSchema}
 * @property {string} name        - Required. Trimmed, 1–255 characters.
 * @property {string} [description] - Optional. Trimmed, max 1000 characters. May be empty.
 * @property {string} [department]  - Optional. Trimmed, max 255 characters. May be empty.
 * @property {string} [email]       - Optional. Must be a valid email, max 255 characters. May be empty.
 */
const clientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow('')
});

/**
 * Validation schema for creating a new work entry.
 *
 * @type {Joi.ObjectSchema}
 * @property {number} clientId      - Required. Positive integer referencing an existing client.
 * @property {number} hours         - Required. Positive number, max 24, up to 2 decimal places.
 * @property {string} [description] - Optional. Trimmed, max 1000 characters. May be empty.
 * @property {string} date          - Required. ISO-8601 date string.
 */
const workEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  hours: Joi.number().positive().max(24).precision(2).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().required()
});

/**
 * Validation schema for updating an existing work entry.
 *
 * All fields are optional but at least one must be provided (enforced by
 * `.min(1)`).
 *
 * @type {Joi.ObjectSchema}
 * @property {number} [clientId]    - Positive integer referencing an existing client.
 * @property {number} [hours]       - Positive number, max 24, up to 2 decimal places.
 * @property {string} [description] - Trimmed, max 1000 characters. May be empty.
 * @property {string} [date]        - ISO-8601 date string.
 */
const updateWorkEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().optional(),
  hours: Joi.number().positive().max(24).precision(2).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().optional()
}).min(1); // At least one field must be provided

/**
 * Validation schema for updating an existing client.
 *
 * All fields are optional but at least one must be provided (enforced by
 * `.min(1)`).
 *
 * @type {Joi.ObjectSchema}
 * @property {string} [name]        - Trimmed, 1–255 characters.
 * @property {string} [description] - Trimmed, max 1000 characters. May be empty.
 * @property {string} [department]  - Trimmed, max 255 characters. May be empty.
 * @property {string} [email]       - Valid email, max 255 characters. May be empty.
 */
const updateClientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow('')
}).min(1); // At least one field must be provided

/**
 * Validation schema for the login endpoint.
 *
 * @type {Joi.ObjectSchema}
 * @property {string} email - Required. Must be a valid email address.
 */
const emailSchema = Joi.object({
  email: Joi.string().email().required()
});

module.exports = {
  clientSchema,
  workEntrySchema,
  updateWorkEntrySchema,
  updateClientSchema,
  emailSchema
};

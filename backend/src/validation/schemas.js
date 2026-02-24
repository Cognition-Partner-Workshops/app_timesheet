/**
 * @module validation/schemas
 * @description Joi validation schemas for request body payloads.
 *
 * Each schema defines the shape, types, and constraints for a particular
 * API operation.  Schemas are consumed by route handlers via
 * `schema.validate(req.body)` and validation errors are forwarded to the
 * centralized error handler middleware.
 */

const Joi = require('joi');

/**
 * Schema for creating a new client.
 *
 * @constant {Joi.ObjectSchema}
 * @property {string}  name         - Required. 1-255 characters, trimmed.
 * @property {string}  [description] - Optional. Up to 1 000 characters.
 * @property {string}  [department]  - Optional. Up to 255 characters.
 * @property {string}  [email]       - Optional. Must be a valid email, up to 255 characters.
 */
const clientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow('')
});

/**
 * Schema for creating a new work entry.
 *
 * @constant {Joi.ObjectSchema}
 * @property {number}  clientId    - Required. Positive integer referencing an existing client.
 * @property {number}  hours       - Required. Positive number, max 24, up to 2 decimal places.
 * @property {string}  [description] - Optional. Up to 1 000 characters.
 * @property {string}  date        - Required. ISO 8601 date string (e.g. "2025-06-15").
 */
const workEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  hours: Joi.number().positive().max(24).precision(2).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().required()
});

/**
 * Schema for partially updating an existing work entry.
 *
 * At least one field must be provided (enforced by `.min(1)`).
 *
 * @constant {Joi.ObjectSchema}
 * @property {number}  [clientId]    - Positive integer referencing an existing client.
 * @property {number}  [hours]       - Positive number, max 24, up to 2 decimal places.
 * @property {string}  [description] - Up to 1 000 characters.
 * @property {string}  [date]        - ISO 8601 date string.
 */
const updateWorkEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().optional(),
  hours: Joi.number().positive().max(24).precision(2).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().optional()
}).min(1); // At least one field must be provided

/**
 * Schema for partially updating an existing client.
 *
 * At least one field must be provided (enforced by `.min(1)`).
 *
 * @constant {Joi.ObjectSchema}
 * @property {string}  [name]        - 1-255 characters, trimmed.
 * @property {string}  [description] - Up to 1 000 characters.
 * @property {string}  [department]  - Up to 255 characters.
 * @property {string}  [email]       - Valid email, up to 255 characters.
 */
const updateClientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow('')
}).min(1); // At least one field must be provided

/**
 * Schema for the login endpoint request body.
 *
 * @constant {Joi.ObjectSchema}
 * @property {string}  email - Required. Must be a valid email address.
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

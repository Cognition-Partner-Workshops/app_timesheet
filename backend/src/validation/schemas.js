/**
 * @module validation/schemas
 * @description Joi validation schemas for all API request bodies.
 *
 * Each schema is used in route handlers via `schema.validate(req.body)` before
 * any database operations occur.  Validation errors are forwarded to the
 * centralised error handler which returns a 400 response with details.
 *
 * Schemas exported:
 * - {@link clientSchema}        — creating a new client.
 * - {@link updateClientSchema}  — partially updating an existing client.
 * - {@link workEntrySchema}     — creating a new work/time entry.
 * - {@link updateWorkEntrySchema} — partially updating an existing work entry.
 * - {@link emailSchema}         — login request (email-only auth).
 */

const Joi = require('joi');

/**
 * Schema for creating a new client.
 *
 * | Field        | Type   | Required | Constraints             |
 * |------------- |--------|----------|-------------------------|
 * | name         | string | yes      | 1–255 chars, trimmed    |
 * | description  | string | no       | max 1 000 chars         |
 * | department   | string | no       | max 255 chars           |
 * | email        | string | no       | valid email, max 255    |
 *
 * @type {import('joi').ObjectSchema}
 */
const clientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow('')
});

/**
 * Schema for creating a new work entry (time log).
 *
 * | Field       | Type   | Required | Constraints                        |
 * |------------ |--------|----------|------------------------------------|
 * | clientId    | number | yes      | positive integer                   |
 * | hours       | number | yes      | > 0, <= 24, up to 2 decimal places |
 * | description | string | no       | max 1 000 chars                    |
 * | date        | date   | yes      | ISO 8601 format                    |
 *
 * @type {import('joi').ObjectSchema}
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
 * All fields are optional but at least one must be provided (`.min(1)`).
 * Field constraints mirror {@link workEntrySchema}.
 *
 * @type {import('joi').ObjectSchema}
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
 * All fields are optional but at least one must be provided (`.min(1)`).
 * Field constraints mirror {@link clientSchema}.
 *
 * @type {import('joi').ObjectSchema}
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
 * Only requires a valid email address — there is no password field because
 * the application uses simplified email-only authentication.
 *
 * @type {import('joi').ObjectSchema}
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

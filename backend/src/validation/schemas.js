/**
 * @module validation/schemas
 * @description Joi validation schemas for all API request bodies.
 *
 * Each schema enforces field-level constraints (type, length, format) and is
 * used inside route handlers via `schema.validate(req.body)`. Validation
 * errors are forwarded to the centralised error handler which returns a 400
 * response with human-readable detail messages.
 */

const Joi = require('joi');

/**
 * Schema for creating a new client.
 *
 * | Field         | Type   | Required | Constraints               |
 * |---------------|--------|----------|---------------------------|
 * | `name`        | string | yes      | 1–255 chars, trimmed      |
 * | `description` | string | no       | max 1 000 chars, trimmed  |
 * | `department`  | string | no       | max 255 chars, trimmed    |
 * | `email`       | string | no       | valid email, max 255 chars|
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
 * Schema for creating a new work entry.
 *
 * | Field         | Type   | Required | Constraints                        |
 * |---------------|--------|----------|------------------------------------|
 * | `clientId`    | number | yes      | positive integer                   |
 * | `hours`       | number | yes      | positive, max 24, up to 2 decimals |
 * | `description` | string | no       | max 1 000 chars, trimmed           |
 * | `date`        | date   | yes      | ISO 8601 format (YYYY-MM-DD)       |
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
 * Schema for partially updating a work entry. At least one field must be
 * provided. Fields that are omitted remain unchanged.
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
 * Schema for partially updating a client. At least one field must be
 * provided. Fields that are omitted remain unchanged.
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
 * Schema for the login request body.
 *
 * | Field   | Type   | Required | Constraints  |
 * |---------|--------|----------|--------------|
 * | `email` | string | yes      | valid email  |
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

/**
 * @module validation/schemas
 * @description Joi validation schemas for all backend API request bodies.
 *
 * Each schema defines the required and optional fields, their types, and
 * constraints (e.g. string length, numeric range, email format). Schemas are
 * used inside route handlers to validate incoming data before any database
 * operations occur.
 *
 * Schemas exported:
 * - {@link clientSchema}        - Full client creation payload.
 * - {@link updateClientSchema}  - Partial client update payload (min 1 field).
 * - {@link workEntrySchema}     - Full work-entry creation payload.
 * - {@link updateWorkEntrySchema} - Partial work-entry update payload (min 1 field).
 * - {@link emailSchema}         - Login payload containing only an email.
 */

const Joi = require('joi');

/**
 * Validation schema for creating a new client.
 *
 * | Field         | Type   | Required | Constraints              |
 * |---------------|--------|----------|--------------------------|
 * | `name`        | string | yes      | 1-255 chars, trimmed     |
 * | `description` | string | no       | max 1000 chars, trimmed  |
 * | `department`  | string | no       | max 255 chars, trimmed   |
 * | `email`       | string | no       | valid email, max 255     |
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
 * Validation schema for creating a new work entry.
 *
 * | Field         | Type   | Required | Constraints                          |
 * |---------------|--------|----------|--------------------------------------|
 * | `clientId`    | number | yes      | positive integer                     |
 * | `hours`       | number | yes      | positive, max 24, up to 2 decimals   |
 * | `description` | string | no       | max 1000 chars, trimmed              |
 * | `date`        | date   | yes      | ISO 8601 format                      |
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
 * Validation schema for partially updating an existing work entry.
 *
 * All fields are optional but at least one must be provided (`.min(1)`).
 * See {@link workEntrySchema} for field descriptions and constraints.
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
 * Validation schema for partially updating an existing client.
 *
 * All fields are optional but at least one must be provided (`.min(1)`).
 * See {@link clientSchema} for field descriptions and constraints.
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
 * Validation schema for the login request body.
 *
 * | Field   | Type   | Required | Constraints         |
 * |---------|--------|----------|---------------------|
 * | `email` | string | yes      | valid email format  |
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

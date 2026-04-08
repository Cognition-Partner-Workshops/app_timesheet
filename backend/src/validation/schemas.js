const Joi = require('joi');

const clientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow('')
});

const workEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  hours: Joi.number().positive().max(24).precision(2).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().required()
});

const updateWorkEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().optional(),
  hours: Joi.number().positive().max(24).precision(2).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().optional()
}).min(1); // At least one field must be provided

const updateClientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow('')
}).min(1); // At least one field must be provided

const emailSchema = Joi.object({
  email: Joi.string().email().required()
});

const phoneSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid international phone number (e.g., +1234567890)',
      'any.required': 'Phone number is required'
    })
});

const otpVerifySchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid international phone number',
      'any.required': 'Phone number is required'
    }),
  otp: Joi.string().pattern(/^\d{6}$/).required()
    .messages({
      'string.pattern.base': 'OTP must be a 6-digit number',
      'any.required': 'OTP is required'
    })
});

module.exports = {
  clientSchema,
  workEntrySchema,
  updateWorkEntrySchema,
  updateClientSchema,
  emailSchema,
  phoneSchema,
  otpVerifySchema
};

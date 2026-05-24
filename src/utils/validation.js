const Joi = require("joi");

/**
 * Generic request validator middleware
 */
const validateRequest = (schema) => {
  if (!schema || typeof schema.validate !== "function") {
    throw new Error("validateRequest called without a valid Joi schema");
  }

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        error: error.details.map((err) => err.message),
      });
    }

    req.validatedData = value;
    next();
  };
};

/**
 * User Registration Validation
 */
const userRegistrationSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().min(3).max(100).required(),
});

/**
 * User Login Validation
 */
const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/**
 * Create Post Validation
 */
const createPostSchema = Joi.object({
  content: Joi.string().allow(null, "").optional(),
  media_url: Joi.string().uri().allow(null, "").optional(),
  comments_enabled: Joi.boolean().optional(),
}).or("content", "media_url");

/**
 * Update Post Validation
 */
const updatePostSchema = Joi.object({
  content: Joi.string().allow(null, "").optional(),
  media_url: Joi.string().uri().allow(null, "").optional(),
  comments_enabled: Joi.boolean().optional(),
}).min(1);

/**
 * Like creation validation
 */
const ALLOWED_REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"];
const createLikeSchema = Joi.object({
  post_id: Joi.number().integer().positive().required(),
  reaction: Joi.string()
    .valid(...ALLOWED_REACTIONS)
    .optional()
    .default("like"),
});

/**
 * Create Comment Validation
 */
const createCommentSchema = Joi.object({
  post_id: Joi.number().integer().positive().required(),
  content: Joi.string().min(1).required(),
  parent_comment_id: Joi.number().integer().positive().optional().allow(null),
});

/**
 * Update Comment Validation
 */
const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).required(),
});



const createFollowSchema = Joi.object({
  followeeId: Joi.number().integer().positive().required(),
});

module.exports = {
  validateRequest,
  userRegistrationSchema,
  userLoginSchema,
  createPostSchema,
  updatePostSchema,
  createLikeSchema,
  createCommentSchema,
  updateCommentSchema,
  createFollowSchema,
};

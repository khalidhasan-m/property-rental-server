function validate(schema, target = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
    }
    req.validated = result.data;
    return next();
  };
}

module.exports = { validate };

function validate(schema, target = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      const detailedMessage = issues.length
        ? `Validation failed: ${issues[0].path} - ${issues[0].message}`
        : "Validation failed";
      return res.status(400).json({
        success: false,
        message: detailedMessage,
        issues,
      });
    }
    req.validated = result.data;
    return next();
  };
}

module.exports = { validate };

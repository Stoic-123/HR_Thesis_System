export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    const issues = error.issues || error.errors;
    if (issues && Array.isArray(issues) && issues.length > 0) {
      const firstErrorMessage = issues[0]?.message || "Validation Error";
      return res.status(400).json({
        result: false,
        message: firstErrorMessage,
        errors: issues.map((err) => ({
          path: Array.isArray(err.path) ? err.path.join(".") : String(err.path || ""),
          message: err.message,
        })),
      });
    }
    return res.status(400).json({
      result: false,
      message: error.message || "Invalid input data",
    });
  }
};

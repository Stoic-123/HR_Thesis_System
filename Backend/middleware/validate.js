export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({
        result: false,
        message: "Validation Error",
        errors: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
    }
    return res.status(500).json({
      result: false,
      message: error.message || "Internal Server Error",
    });
  }
};

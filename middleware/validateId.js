module.exports = (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  next();
};

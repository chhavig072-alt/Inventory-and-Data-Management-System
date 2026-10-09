const Product = require('../models/Product');

const SORTABLE = ['name', 'price', 'quantity', 'category', 'createdAt', 'updatedAt'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// GET /api/products?category=&supplier=&minPrice=&maxPrice=&inStock=&search=&sort=&page=&limit=
exports.getProducts = async (req, res, next) => {
  try {
    const { category, supplier, minPrice, maxPrice, inStock, search, sort } = req.query;
    const filter = {};

    if (category) filter.category = new RegExp(`^${escapeRegex(String(category))}$`, 'i');
    if (supplier) filter.supplier = new RegExp(`^${escapeRegex(String(supplier))}$`, 'i');
    if (search) filter.name = new RegExp(escapeRegex(String(search)), 'i');

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
      if (Object.values(filter.price).some(Number.isNaN)) {
        return res.status(400).json({ error: 'minPrice and maxPrice must be numbers' });
      }
    }

    if (inStock === 'true') filter.quantity = { $gt: 0 };
    if (inStock === 'false') filter.quantity = 0;

    // Sorting: ?sort=-price,name  (whitelisted fields only)
    let sortBy = { createdAt: -1 };
    if (sort) {
      sortBy = {};
      String(sort).split(',').forEach((f) => {
        const desc = f.startsWith('-');
        const field = desc ? f.slice(1) : f;
        if (SORTABLE.includes(field)) sortBy[field] = desc ? -1 : 1;
      });
      if (!Object.keys(sortBy).length) sortBy = { createdAt: -1 };
    }

    // Pagination
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
    ]);

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id  (partial fields allowed; untouched fields are kept)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id/stock   body: { "change": 10 } (restock) or { "change": -3 } (sale)
exports.adjustStock = async (req, res, next) => {
  try {
    const change = req.body.change;
    if (typeof change !== 'number' || !Number.isInteger(change) || change === 0) {
      return res.status(400).json({ error: '"change" must be a non-zero integer' });
    }

    // Atomic: the filter guarantees stock never goes below zero
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: -change } },
      { $inc: { quantity: change } },
      { new: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ error: 'Product not found' });
      return res.status(400).json({ error: 'Insufficient stock for this sale' });
    }

    res.json({ message: 'Stock updated', product });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', id: product.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/low-stock  (quantity <= reorderLevel)
exports.getLowStock = async (req, res, next) => {
  try {
    const docs = await Product.aggregate([
      { $match: { $expr: { $lte: ['$quantity', '$reorderLevel'] } } },
      { $sort: { quantity: 1 } },
    ]);
    // aggregate returns plain objects; hydrate to get virtuals (id, stockValue)
    const lowStockItems = docs.map((d) => Product.hydrate(d).toJSON());
    res.json({ count: lowStockItems.length, lowStockItems });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/summary  (category-wise aggregation)
exports.getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' },
        },
      },
      { $sort: { totalStockValue: -1 } },
    ]);
    res.json({ categories: summary.length, summary });
  } catch (err) {
    next(err);
  }
};

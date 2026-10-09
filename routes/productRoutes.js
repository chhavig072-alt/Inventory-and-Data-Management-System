const express = require('express');
const c = require('../controllers/productController');
const validateId = require('../middleware/validateId');

const router = express.Router();

router.route('/').post(c.createProduct).get(c.getProducts);

// Static routes MUST come before "/:id" or they will be treated as IDs
router.get('/low-stock', c.getLowStock);
router.get('/summary', c.getCategorySummary);

router.patch('/:id/stock', validateId, c.adjustStock);
router
  .route('/:id')
  .get(validateId, c.getProductById)
  .put(validateId, c.updateProduct)
  .delete(validateId, c.deleteProduct);

module.exports = router;

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/product.controller');

router.use(auth);
router.get('/', ctrl.getProducts);
router.post('/', ctrl.createProduct);
router.get('/barcode/:barcode', ctrl.barcodeLookup);
router.get('/categories', ctrl.getCategories);
router.post('/categories', ctrl.createCategory);
router.get('/:id', ctrl.getProductById);
router.put('/:id', ctrl.updateProduct);
router.delete('/:id', ctrl.deleteProduct);

module.exports = router;

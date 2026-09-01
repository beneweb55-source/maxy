import { products, classifyProduct } from './test_full_classification';

const misclassified = products.filter(p => {
  const c = classifyProduct(p);
  return c.sousCategorie === 'Mini PC & Clients Légers' && p.reference.toLowerCase().includes('micron');
});

console.log("Misclassified items:", misclassified);

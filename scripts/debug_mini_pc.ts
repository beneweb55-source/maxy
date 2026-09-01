import { products, classifyProduct } from './test_full_classification';
const bad = products.filter(p => classifyProduct(p).sousCategorie === 'Mini PC & Clients Légers');
console.log(bad.map(b => b.reference).join('\n'));

import { products } from './test_full_classification';

for (const p of products) {
  const cat = p.categorie;
  if (cat.includes('RAM') || cat.includes('Micron') || cat.includes('Samsung') || cat.includes('Kingston') || cat.includes('SK hynix') || cat.includes('PNY')) {
    console.log(p.reference);
  }
}

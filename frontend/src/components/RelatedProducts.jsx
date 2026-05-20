import ProductCard from './ProductCard';
import styles from './RelatedProducts.module.css';

function RelatedProducts({ products }) {
  return (
    <section className={styles.relatedSection}>
      <div className={styles.header}>
        <span className={styles.label}>Você também pode gostar</span>
      </div>
      <div className={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default RelatedProducts;

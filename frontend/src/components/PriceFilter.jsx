import styles from './PriceFilter.module.css';

function PriceFilter({ sortOrder, onSortChange, minPrice, maxPrice, onMinPriceChange, onMaxPriceChange }) {
  return (
    <div className={styles.priceFilter}>
      <div className={styles.sortButtons}>
        <button
          type="button"
          className={`${styles.sortButton} ${sortOrder === 'asc' ? styles.active : ''}`}
          onClick={() => onSortChange('asc')}
        >
          Preço: menor para maior
        </button>
        <button
          type="button"
          className={`${styles.sortButton} ${sortOrder === 'desc' ? styles.active : ''}`}
          onClick={() => onSortChange('desc')}
        >
          Preço: maior para menor
        </button>
      </div>
      <div className={styles.priceInputs}>
        <label>
          Preço mínimo:
          <input
            type="number"
            value={minPrice}
            onChange={(e) => onMinPriceChange(Number(e.target.value))}
            min="0"
            step="0.01"
          />
        </label>
        <label>
          Preço máximo:
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            min="0"
            step="0.01"
          />
        </label>
      </div>
    </div>
  );
}

export default PriceFilter;

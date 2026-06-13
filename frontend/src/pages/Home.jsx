import { useMemo, useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import BannerCarousel from '../components/BannerCarousel';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import PriceFilter from '../components/PriceFilter';
import SectionTitle from '../components/SectionTitle';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import { fetchProducts, fetchCategories, registrarPalavraPesquisada } from '../services/api';
import { registrarEventoVisitante } from '../services/visitanteEvento';
import { sortProductsByPrice } from '../utils/productUtils';
import { FiGrid, FiSliders, FiX } from 'react-icons/fi';
import styles from './Home.module.css';

function Home() {
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [sortOrder, setSortOrder] = useState('none'); // 'none', 'asc', 'desc'
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000); // Valor alto suficiente
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFilter, setMobileFilter] = useState(null);
  const homeEventRegistered = useRef(false);

  // Registrar evento de visitação à home (apenas uma vez)
  useEffect(() => {
    if (!homeEventRegistered.current) {
      homeEventRegistered.current = true;
      registrarEventoVisitante('visitou_home');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories()
        ]);
        
        setProducts(productsData);
        
        // Formata categorias para compatibilidade
        const formattedCategories = categoriesData.map(cat => cat.nome);
        setCategories(['Todos', ...new Set(formattedCategories)]);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const normalizeCategory = (value) =>
    value
      ?.toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim() || '';

  const filteredProducts = useMemo(
    () => {
      if (!products.length) return [];

      let filtered = products;

      // Filtro por status ativo
      filtered = filtered.filter(p => p.ativo !== false);

      // Filtro por categoria
      const activeCategoryNormalized = normalizeCategory(activeCategory);
      if (activeCategoryNormalized !== 'todos') {
        filtered = filtered.filter(
          (p) => normalizeCategory(p.categoria?.nome) === activeCategoryNormalized
        );
      }

      // Filtro por busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.nome.toLowerCase().includes(query) ||
            p.descricao?.toLowerCase().includes(query)
        );
      }

      // Filtro por preço
      filtered = filtered.filter((p) => {
        const price = Number(p.preco_venda ?? 0);
        return price >= Number(minPrice) && price <= Number(maxPrice);
      });

      // Ordenação por preço
      if (sortOrder === 'asc') {
        filtered = sortProductsByPrice(filtered, true);
      } else if (sortOrder === 'desc') {
        filtered = sortProductsByPrice(filtered, false);
      }

      return filtered;
    },
    [products, activeCategory, searchQuery, minPrice, maxPrice, sortOrder]
  );

  const visibleCategories = categories.filter((category) => category !== 'Todos').slice(0, 5);
  const totalProducts = products.length;

  const getCategoryCount = (category) =>
    products.filter(
      (product) => normalizeCategory(product.categoria?.nome) === normalizeCategory(category)
    ).length;

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchText.trim();
    setSearchQuery(query);

    if (query) {
      registrarPalavraPesquisada(query).catch((err) => {
        console.error('Erro ao registrar pesquisa:', err);
      });
    }
  }

  function closeMobileFilter() {
    setMobileFilter(null);
  }

  return (
    <div>
      <Header />

      <main>
        <section className={styles.heroSection}>
          <div className={styles.heroLeft}>
            <span className={styles.heroBadge}>Tres Pescadores Store</span>
            <h1>
              Artigos religiosos para <em>fé</em> e devoção
            </h1>
            <p>
              Produtos católicos selecionados com cuidado, acabamento elegante e espírito sereno
              para enriquecer o seu altar, sua casa e seus momentos de oração.
            </p>
            <div className={styles.heroActions}>
              <a href="#catalog" className={styles.primaryButton}>Explorar loja</a>
              <a href="#categories" className={styles.secondaryButton}>Ver categorias</a>
            </div>
          </div>

          <div className={styles.heroRight}>
            <BannerCarousel />
          </div>
        </section>

        <section className={styles.trustBar} aria-label="Diferenciais da loja">
          <div className={styles.trustItem}>
            <span>🚚</span>
            <div>
              <strong>Entrega combinada</strong>
              <small>Consulte disponibilidade</small>
            </div>
          </div>
          <div className={styles.trustItem}>
            <span>🔒</span>
            <div>
              <strong>Compra segura</strong>
              <small>Atendimento com cuidado</small>
            </div>
          </div>
          <div className={styles.trustItem}>
            <span>✝</span>
            <div>
              <strong>Artigos católicos</strong>
              <small>Fé, devoção e tradição</small>
            </div>
          </div>
          <div className={styles.trustItem}>
            <span>💬</span>
            <div>
              <strong>Suporte próximo</strong>
              <small>Ajuda para escolher</small>
            </div>
          </div>
        </section>

        

        <section id="catalog" className={styles.catalogSection}>
          <div className={styles.sectionHeader}>
            <span className={`${styles.catalogCount} ${styles.alignRight}`}>{filteredProducts.length} itens encontrados</span>
          </div>

          <div className={styles.controls}>
            <SearchBar
              value={searchText}
              onChange={setSearchText}
              onSubmit={handleSearchSubmit}
            />

            <div className={styles.mobileFilterActions}>
              <button type="button" onClick={() => setMobileFilter('categories')}>
                <FiGrid size={17} />
                Categorias
              </button>
              <button type="button" onClick={() => setMobileFilter('price')}>
                <FiSliders size={17} />
                Filtrar por preco
              </button>
            </div>

            <div id="categories" className={styles.desktopFilters}>
              <CategoryFilter
                categories={categories}
                activeCategory={activeCategory}
                onChange={setActiveCategory}
              />

              <PriceFilter
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onMinPriceChange={setMinPrice}
                onMaxPriceChange={setMaxPrice}
              />
            </div>
          </div>

          <SectionTitle
            title="Catálogo de artigos religiosos"
            description="Descubra terços, bíblias e imagens com acabamento elegante e espírito sereno."
          />

          <div className={styles.productGrid}>
            {loading ? (
              <p className={styles.emptyState}>Carregando produtos...</p>
            ) : error ? (
              <p className={styles.errorState}>
                Erro ao carregar produtos: {error}
              </p>
            ) : filteredProducts.length === 0 ? (
              <p className={styles.emptyState}>
                Nenhum produto encontrado
              </p>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </section>

      </main>

      {mobileFilter && (
        <div className={styles.modalOverlay} role="presentation" onClick={closeMobileFilter}>
          <section
            className={styles.filterModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <h2 id="mobile-filter-title">
                {mobileFilter === 'categories' ? 'Categorias' : 'Filtrar por preco'}
              </h2>
              <button type="button" onClick={closeMobileFilter} aria-label="Fechar">
                <FiX size={20} />
              </button>
            </header>

            <div className={styles.modalContent}>
              {mobileFilter === 'categories' ? (
                <CategoryFilter
                  categories={categories}
                  activeCategory={activeCategory}
                  onChange={(category) => {
                    setActiveCategory(category);
                    closeMobileFilter();
                  }}
                />
              ) : (
                <PriceFilter
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onMinPriceChange={setMinPrice}
                  onMaxPriceChange={setMaxPrice}
                />
              )}
            </div>

            {mobileFilter === 'price' && (
              <button type="button" className={styles.applyFilterButton} onClick={closeMobileFilter}>
                Aplicar filtro
              </button>
            )}
          </section>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Home;
